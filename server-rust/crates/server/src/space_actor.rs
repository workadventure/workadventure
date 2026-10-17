//! The owner of one space (one task, bounded mailbox), like room_actor for rooms. It answers the join and
//! leave queries itself, so the answer and the messages it causes leave in the right order.

use std::collections::HashMap;
use std::sync::Arc;

use wa_core::space::{FilterType, JoinError, MediaConfig, Space, SpaceEvent, SpaceSink, SpaceUser};
use wa_core::space_state::StateQuery;
use wa_core::user::Availability;
use wa_proto::messages as pb;

use crate::AppState;
use crate::json_patch;
use crate::livekit::{self, Livekit};
use crate::metrics::METRICS;
use crate::outbox::Frame;
use crate::session::Session;
use crate::wire;

pub const MAILBOX: usize = 1024;

pub enum SpaceCmd {
    Join {
        session: Arc<Session>,
        user: SpaceUser,
        filter: FilterType,
        properties_to_sync: Vec<String>,
        query_id: i32,
    },
    Leave {
        session: Arc<Session>,
        id: String,
        query_id: Option<i32>,
    },
    Watch {
        id: String,
    },
    Unwatch {
        id: String,
    },
    Update {
        id: String,
        from: SpaceUser,
        paths: Vec<String>,
    },
    Details {
        id: String,
        availability: Availability,
        chat_id: Option<String>,
        show_voice_indicator: Option<bool>,
    },
    Metadata {
        id: String,
        delta: Vec<(String, String)>,
    },
    StateQuery {
        session: Arc<Session>,
        id: String,
        query_id: i32,
        query: Option<pb::space_state_query::Query>,
    },
    Public {
        id: String,
        event: pb::SpaceEvent,
    },
    Private {
        id: String,
        receiver: String,
        event: pb::PrivateSpaceEvent,
    },
    Restart {
        id: String,
        peer: Option<String>,
        connection_id: Option<String>,
    },
    /// LiveKit answered a startRoomCompositeEgress: the egress id, or why not.
    EgressAnswer {
        session: Arc<Session>,
        query_id: i32,
        session_id: String,
        result: Result<String, String>,
    },
    /// An egress webhook for one of this space's recordings: started (false) or ended (true).
    /// An egress webhook for one of this space's recordings, as received (checked here).
    Egress {
        session_id: String,
        auth: String,
        body: axum::body::Bytes,
        reply: tokio::sync::oneshot::Sender<axum::http::StatusCode>,
    },
}

pub type SpaceHandle = tokio::sync::mpsc::Sender<SpaceCmd>;

pub fn get_or_spawn(app: &AppState, key: &str, local_name: &str) -> SpaceHandle {
    app.spaces.get_or_spawn(key, || {
        let (tx, rx) = tokio::sync::mpsc::channel(MAILBOX);
        tokio::spawn(run(key.to_owned(), local_name.to_owned(), rx, app.clone()));
        tx
    })
}

/// The protobuf query, in core terms. Recording needs a configured recorder, which this server does not have:
/// the pusher refuses it before the back (canRecord).
fn state_query(query: Option<pb::space_state_query::Query>) -> Result<StateQuery, &'static str> {
    use pb::space_state_query::Query as Q;
    Ok(match query.ok_or("SpaceStateQuery has no query")? {
        Q::RaiseHand(q) => StateQuery::RaiseHand(q.raised),
        Q::LowerHand(q) => StateQuery::LowerHand(q.target_space_user_id),
        Q::GiveFloor(q) => StateQuery::GiveFloor(q.target_space_user_id),
        Q::RevokeFloor(q) => StateQuery::RevokeFloor(q.target_space_user_id),
        Q::StartRecording(_) | Q::StopRecording(_) => return Err("You are not allowed to record"),
        Q::CreatePoll(q) => StateQuery::CreatePoll {
            question: q.question,
            kind: q.kind,
            answers: q.answers,
            max_selections: q.max_selections,
        },
        Q::VotePoll(q) => StateQuery::VotePoll { poll_id: q.poll_id, answer_ids: q.answer_ids },
        Q::ClosePoll(q) => StateQuery::ClosePoll { poll_id: q.poll_id, closing_message: q.closing_message },
        Q::DeletePoll(q) => StateQuery::DeletePoll(q.poll_id),
        Q::AskQuestion(q) => StateQuery::AskQuestion(q.body),
        Q::UpvoteQuestion(q) => StateQuery::UpvoteQuestion { question_id: q.question_id, upvoted: q.upvoted },
        Q::AnswerQuestion(q) => StateQuery::AnswerQuestion(q.question_id),
        Q::DeleteQuestion(q) => StateQuery::DeleteQuestion(q.question_id),
        Q::SetKind(q) => StateQuery::SetKind(q.kind),
    })
}

fn state_patch(name: String, patch: String) -> Frame {
    wire::sub(pb::sub_message::Message::SpaceStatePatchMessage(pb::SpaceStatePatchMessage { space_name: name, patch }))
}

fn metadata_json(entries: impl Iterator<Item = (String, String)>) -> String {
    let fields: Vec<String> = entries.map(|(k, raw)| format!("{}:{}", serde_json::Value::String(k), raw)).collect();
    format!("{{{}}}", fields.join(","))
}

struct Out<'a> {
    name: &'a str,
    sessions: &'a HashMap<String, Arc<Session>>,
    media: &'a Media,
}

/// What the media events of a space need: LiveKit, the name of the space's room there, an HTTP client.
struct Media {
    livekit: Option<Livekit>,
    room: String,
    http: reqwest::Client,
}

impl Media {
    /// stopEgress, off the actor; a recording that already ended is not an error.
    fn stop_egress(&self, egress_id: &str) {
        let Some(lk) = self.livekit.clone() else { return };
        let egress_id = egress_id.to_owned();
        tokio::spawn(async move {
            if let Err(e) = lk.stop_egress(&egress_id).await
                && !["EGRESS_COMPLETE", "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED"]
                    .iter()
                    .any(|s| e.contains(s))
            {
                tracing::warn!(%egress_id, error = %e, "could not stop a recording");
            }
        });
    }
}

struct SystemClock;
impl wa_core::room::Clock for SystemClock {
    fn now_ms(&self) -> u64 {
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64)
    }
}

impl Out<'_> {
    fn send(&self, to: &[&str], frame: &Frame) {
        for id in to {
            if let Some(s) = self.sessions.get(*id) {
                s.push(frame.clone());
            }
        }
    }

    fn private(&self, receiver: &str, sender: &SpaceUser, event: pb::private_space_event::Event) {
        let frame = wire::sub(pb::sub_message::Message::PrivateEvent(pb::PrivateEventPusherToFront {
            space_name: self.name.to_owned(),
            receiver_user_id: receiver.to_owned(),
            sender: Some(wire::space_user_to(sender)),
            space_event: Some(pb::PrivateSpaceEvent { event: Some(event) }),
        }));
        self.send(&[receiver], &frame);
    }
}

impl SpaceSink for Out<'_> {
    fn emit(&mut self, to: &[&str], event: SpaceEvent<'_>) {
        use pb::private_space_event::Event as P;
        use pb::sub_message::Message as Sub;
        let name = self.name.to_owned();
        let frame = match event {
            SpaceEvent::UserAdded(u) => wire::sub(Sub::AddSpaceUserMessage(pb::AddSpaceUserMessage {
                space_name: name,
                user: Some(wire::space_user_to(u)),
            })),
            SpaceEvent::UserUpdated(u, paths) => {
                wire::sub(Sub::UpdateSpaceUserMessage(pb::UpdateSpaceUserPusherToFrontMessage {
                    space_name: name,
                    user: Some(wire::space_user_to(u)),
                    update_mask: Some(prost_types::FieldMask { paths: paths.to_vec() }),
                }))
            }
            SpaceEvent::UserRemoved(id) => {
                wire::sub(Sub::RemoveSpaceUserMessage(pb::RemoveSpaceUserPusherToFrontMessage {
                    space_name: name,
                    space_user_id: id.to_owned(),
                }))
            }
            SpaceEvent::InitUsers(users, metadata) => {
                wire::sub(Sub::InitSpaceUsersMessage(pb::InitSpaceUsersMessage {
                    space_name: name,
                    users: users.into_iter().map(wire::space_user_to).collect(),
                    metadata: metadata_json(metadata.iter().map(|(k, v)| (k.clone(), v.clone()))),
                    state: String::new(),
                }))
            }
            SpaceEvent::StateReplace(state) => {
                state_patch(name, serde_json::json!([{"op": "replace", "path": "", "value": state}]).to_string())
            }
            SpaceEvent::StatePatch { before, after } => {
                let (Ok(before), Ok(after)) = (serde_json::to_value(before), serde_json::to_value(after)) else {
                    return;
                };
                let patch = json_patch::diff(&before, &after);
                if patch.is_empty() {
                    return;
                }
                state_patch(name, serde_json::Value::Array(patch).to_string())
            }
            SpaceEvent::Metadata(delta) => wire::sub(Sub::UpdateSpaceMetadataMessage(pb::UpdateSpaceMetadataMessage {
                space_name: name,
                metadata: metadata_json(delta.iter().cloned()),
            })),
            SpaceEvent::Switch(user, comm) => {
                let strategy = comm.name().to_owned();
                self.private(&user.space_user_id, user, P::SwitchMessage(pb::SwitchMessage { strategy }));
                return;
            }
            SpaceEvent::FinalizeSwitch(user, comm) => {
                let strategy = comm.name().to_owned();
                self.private(
                    &user.space_user_id,
                    user,
                    P::FinalizeSwitchMessage(pb::FinalizeSwitchMessage { strategy }),
                );
                return;
            }
            SpaceEvent::LivekitInvite(user) => {
                let Some(lk) = &self.media.livekit else { return };
                let token = lk.participant_token(&self.media.room, &user.space_user_id, &user.name, &user.uuid);
                let invitation = pb::LivekitInvitationMessage { token, server_url: lk.server_url() };
                self.private(&user.space_user_id, user, P::LivekitInvitationMessage(invitation));
                return;
            }
            SpaceEvent::LivekitDisconnect(user) => {
                self.private(&user.space_user_id, user, P::LivekitDisconnectMessage(pb::LivekitDisconnectMessage {}));
                return;
            }
            SpaceEvent::StopEgress(egress_id) => {
                self.media.stop_egress(egress_id);
                return;
            }
            SpaceEvent::RecordingUnexpectedlyStopped(user) => {
                let stopped = P::RecordingUnexpectedlyStoppedMessage(pb::RecordingUnexpectedlyStoppedPrivateMessage {});
                self.private(&user.space_user_id, user, stopped);
                return;
            }
            SpaceEvent::LivekitRoom(open) => {
                // Off the actor: invitations do not wait for it (the server creates a room on first join too).
                let Some(lk) = self.media.livekit.clone() else { return };
                let room = self.media.room.clone();
                tokio::spawn(async move {
                    let done = if open { lk.create_room(&room).await } else { lk.delete_room(&room).await };
                    if let Err(e) = done {
                        tracing::warn!(%room, open, error = %e, "LiveKit room call failed");
                    }
                });
                return;
            }
            SpaceEvent::WebRtcStart { sender, initiator, connection_id } => {
                for r in to {
                    self.private(
                        r,
                        sender,
                        P::WebRtcStartMessage(pb::WebRtcStartMessage {
                            user_id: sender.space_user_id.clone(),
                            initiator,
                            connection_id: connection_id.to_owned(),
                        }),
                    );
                }
                return;
            }
            SpaceEvent::WebRtcDisconnect(sender) => {
                for r in to {
                    self.private(
                        r,
                        sender,
                        P::WebRtcDisconnectMessage(pb::WebRtcDisconnectMessage {
                            user_id: sender.space_user_id.clone(),
                        }),
                    );
                }
                return;
            }
        };
        self.send(to, &frame);
    }
}

async fn run(key: String, local_name: String, mut mailbox: tokio::sync::mpsc::Receiver<SpaceCmd>, app: AppState) {
    let registry = app.spaces.clone();
    METRICS.nb_spaces.inc();
    let mut media =
        Media { livekit: Livekit::from_config(&app.config), room: livekit::room_name(&key), http: app.http.clone() };
    let raw = |k: &str| app.config.raw.get(k).filter(|v| !v.is_empty()).cloned();
    // A24: the admin may give the LiveKit credentials (per world); they are asked when the space starts.
    let admin_livekit = app.admin.clone().filter(|a| a.has("api/livekit/credentials"));
    let mut media_config = MediaConfig {
        max_webrtc: raw("MAX_USERS_FOR_WEBRTC").and_then(|v| v.parse().ok()).unwrap_or(4),
        livekit: media.livekit.is_some(),
        switch_on_cpu: !matches!(raw("LIVEKIT_SWITCH_ON_CPU_LIMITATION").as_deref(), Some("false" | "0")),
    };
    let mut space: Option<Space> = None;
    let mut sessions: HashMap<String, Arc<Session>> = HashMap::new();
    let instance = format!("{:x}", rand_u64());
    // The back's SessionAnalytics: the space is looked at after every change.
    let world = key.strip_suffix(&format!(".{local_name}")).unwrap_or_default().to_owned();
    let mut meetings =
        app.analytics.clone().map(|a| (a, wa_core::meetings::Meetings::new(key.clone(), local_name.clone())));
    let mut shutdown = app.shutdown.subscribe();

    loop {
        use pb::answer_message::Answer;
        if let (Some(s), Some((a, m))) = (&space, &mut meetings) {
            m.observe(s, crate::redis_store::now_ms());
            a.meeting_rows(&world, m.take_rows());
        }
        let deadline = space.as_ref().and_then(Space::next_deadline);
        let cmd = tokio::select! {
            cmd = mailbox.recv() => match cmd {
                Some(cmd) => cmd,
                None => break,
            },
            Ok(()) = shutdown.changed(), if meetings.is_some() => {
                if let Some((a, mut m)) = meetings.take() {
                    m.close("back_shutdown", crate::redis_store::now_ms());
                    a.meeting_rows(&world, m.take_rows());
                }
                continue;
            }
            () = sleep_until_ms(deadline) => {
                if let Some(s) = &mut space {
                    s.tick(&mut Out { name: &local_name, sessions: &sessions, media: &media });
                }
                continue;
            }
        };
        let space = match (&mut space, &cmd) {
            (Some(s), _) => s,
            (None, SpaceCmd::Join { filter, properties_to_sync, user, .. }) => {
                if let Some(admin) = &admin_livekit {
                    // ponytail: awaited once, when the space starts (the back asks at each switch).
                    match admin.livekit_credentials(&user.play_uri).await {
                        Ok(c) => {
                            media.livekit = Some(Livekit {
                                host: c.livekit_host.trim_end_matches('/').to_owned(),
                                key: c.livekit_api_key,
                                secret: c.livekit_api_secret,
                            });
                        }
                        Err(e) => tracing::error!(error = %e, "the admin did not give LiveKit credentials"),
                    }
                    media_config.livekit = media.livekit.is_some();
                }
                let mut s = Space::new(local_name.clone(), *filter, properties_to_sync.clone(), instance.clone());
                s.configure_media(media_config, Box::new(SystemClock));
                space.insert(s)
            }
            // Nothing but a join can create the space.
            (None, SpaceCmd::Leave { session, query_id: Some(q), .. }) => {
                session.push(wire::answer(*q, Answer::LeaveSpaceAnswer(pb::LeaveSpaceAnswer {})));
                continue;
            }
            (None, _) => continue,
        };
        match cmd {
            SpaceCmd::Join { session, user, filter, query_id, .. } => {
                let id = user.space_user_id.clone();
                let joined =
                    space.join(filter, user, &mut Out { name: &local_name, sessions: &sessions, media: &media });
                match joined {
                    Ok(()) => {
                        sessions.insert(id.clone(), session.clone());
                        session.push(wire::answer(
                            query_id,
                            Answer::JoinSpaceAnswer(pb::JoinSpaceAnswer { space_user_id: id.clone() }),
                        ));
                        space.after_join(&id, &mut Out { name: &local_name, sessions: &sessions, media: &media });
                    }
                    Err(e) => {
                        let message = match e {
                            JoinError::AlreadyMember => "User already added in space",
                            JoinError::FilterMismatch => "Error: Space filter type mismatch",
                        };
                        session.push(wire::answer_error(query_id, message));
                    }
                }
            }
            SpaceCmd::Leave { session, id, query_id } => {
                space.leave(&id, &mut Out { name: &local_name, sessions: &sessions, media: &media });
                sessions.remove(&id);
                if let Some(q) = query_id {
                    session.push(wire::answer(q, Answer::LeaveSpaceAnswer(pb::LeaveSpaceAnswer {})));
                }
            }
            SpaceCmd::Watch { id } => {
                space.watch(&id, &mut Out { name: &local_name, sessions: &sessions, media: &media });
            }
            SpaceCmd::Unwatch { id } => {
                space.unwatch(&id, &mut Out { name: &local_name, sessions: &sessions, media: &media })
            }
            SpaceCmd::Update { id, from, paths } => space.update_from_client(
                &id,
                &from,
                &paths,
                &mut Out { name: &local_name, sessions: &sessions, media: &media },
            ),
            SpaceCmd::Details { id, availability, chat_id, show_voice_indicator } => space.update_from_details(
                &id,
                availability,
                chat_id.as_deref(),
                show_voice_indicator,
                &mut Out { name: &local_name, sessions: &sessions, media: &media },
            ),
            SpaceCmd::Metadata { id, delta } => {
                space.update_metadata(&id, delta, &mut Out { name: &local_name, sessions: &sessions, media: &media })
            }
            SpaceCmd::StateQuery { session, id, query_id, query } => {
                use pb::space_state_query::Query as Q;
                let out = &mut Out { name: &local_name, sessions: &sessions, media: &media };
                let ok = |session: &Session| {
                    session.push(wire::answer(query_id, Answer::SpaceStateAnswer(pb::SpaceStateAnswer {})))
                };
                let refuse = |session: &Session, e: &str| {
                    session.push(wire::answer_error(
                        query_id,
                        format!("Error received from the back: Error while handling query : {e}}}"),
                    ))
                };
                match &query {
                    // The caller checked canRecord. The answer waits for LiveKit to take the egress.
                    Some(Q::StartRecording(_)) => {
                        match space.start_recording(&id, uuid::Uuid::new_v4().to_string(), out) {
                            Err(e) => refuse(&session, &e),
                            Ok(None) => ok(&session),
                            Ok(Some(plan)) => {
                                let (lk, me) = (media.livekit.clone(), app.spaces.get(&key));
                                let (http, room, key) = (media.http.clone(), media.room.clone(), key.clone());
                                let s3 = livekit::s3_upload(&app.config);
                                let play_url = app.config.raw.get("PLAY_URL").cloned().unwrap_or_default();
                                tokio::spawn(async move {
                                    let result = match (lk, reqwest::Url::parse(&play_url)) {
                                        (Some(lk), Ok(base)) => {
                                            let mut hook = base.join("/livekit/egress/webhook").expect("absolute path");
                                            hook.query_pairs_mut()
                                                .append_pair("space", &key)
                                                .append_pair("recordingSessionId", &plan.session_id);
                                            let stamp = crate::uploader::iso_now()[..19].to_owned();
                                            let body = livekit::composite_egress(
                                                &room,
                                                &plan.recorder_uuid,
                                                &stamp,
                                                hook.as_str(),
                                                &lk.key,
                                                s3,
                                            );
                                            // As startRecording awaits createRoomPromise: the egress needs the room.
                                            match lk.create_room(&room).await {
                                                Ok(()) => lk.start_composite_egress(&http, body).await,
                                                Err(e) => Err(e),
                                            }
                                        }
                                        _ => Err("PLAY_URL and LiveKit are needed to record".to_owned()),
                                    };
                                    if let Some(me) = me {
                                        let _ = me
                                            .send(SpaceCmd::EgressAnswer {
                                                session,
                                                query_id,
                                                session_id: plan.session_id,
                                                result,
                                            })
                                            .await;
                                    }
                                });
                            }
                        }
                        continue;
                    }
                    Some(Q::StopRecording(_)) => {
                        match space.stop_recording(&id, out) {
                            Err(e) => refuse(&session, &e),
                            Ok(egress) => {
                                if let Some(egress) = egress {
                                    media.stop_egress(&egress);
                                }
                                ok(&session);
                            }
                        }
                        continue;
                    }
                    _ => {}
                }
                let result = state_query(query).map_err(str::to_owned).and_then(|q| {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map_or(0, |d| d.as_millis() as i64);
                    space.state_query(
                        &id,
                        q,
                        now,
                        &mut || uuid::Uuid::new_v4().to_string(),
                        &mut Out { name: &local_name, sessions: &sessions, media: &media },
                    )
                });
                // The patch was queued first, on the same queue: the sender's copy is up to date with the answer.
                session.push(match result {
                    Ok(()) => wire::answer(query_id, Answer::SpaceStateAnswer(pb::SpaceStateAnswer {})),
                    // What the front gets from the pusher when the back refuses.
                    Err(e) => wire::answer_error(
                        query_id,
                        format!("Error received from the back: Error while handling query : {e}}}"),
                    ),
                });
            }
            SpaceCmd::EgressAnswer { session, query_id, session_id, result } => {
                let out = &mut Out { name: &local_name, sessions: &sessions, media: &media };
                if let Err(e) = &result {
                    tracing::error!(error = %e, "could not start a recording");
                }
                let failed = result.is_err();
                space.egress_started(&session_id, result.map_err(drop), out);
                session.push(if failed {
                    wire::answer_error(
                        query_id,
                        "Error received from the back: Error while handling query : Failed to start recording}",
                    )
                } else {
                    wire::answer(query_id, Answer::SpaceStateAnswer(pb::SpaceStateAnswer {}))
                });
            }
            SpaceCmd::Egress { session_id, auth, body, reply } => {
                use axum::http::StatusCode;
                let Some(lk) = &media.livekit else {
                    let _ = reply.send(StatusCode::INTERNAL_SERVER_ERROR);
                    continue;
                };
                let event = match livekit::verify_webhook(lk, &auth, &body) {
                    Ok(event) => event,
                    Err(e) => {
                        tracing::warn!(error = e, "egress webhook refused");
                        let _ = reply.send(if e == "invalid body" {
                            StatusCode::BAD_REQUEST
                        } else {
                            StatusCode::UNAUTHORIZED
                        });
                        continue;
                    }
                };
                let ended = match event["event"].as_str() {
                    Some("egress_started") => false,
                    Some("egress_ended") => true,
                    _ => {
                        let _ = reply.send(StatusCode::NO_CONTENT);
                        continue;
                    }
                };
                let info = livekit::field(&event, "egressInfo", "egress_info").clone();
                let Some(egress_id) = livekit::field(&info, "egressId", "egress_id").as_str().map(str::to_owned) else {
                    let _ = reply.send(StatusCode::BAD_REQUEST);
                    continue;
                };
                let _ = reply.send(StatusCode::NO_CONTENT);
                let out = &mut Out { name: &local_name, sessions: &sessions, media: &media };
                if ended {
                    // A23: the admin turns it into its customers' recording.completed webhook.
                    if let (Some(r), Some(admin)) = (space.webhook_ended(&session_id, out), app.admin.clone())
                        && admin.has("api/recordings/events")
                    {
                        tokio::spawn(
                            async move { admin.recording_ended(recording_event(&r, &egress_id, &info)).await },
                        );
                    }
                } else if let Some(stop) = space.webhook_started(&session_id, &egress_id, out) {
                    media.stop_egress(&stop);
                }
            }
            SpaceCmd::Public { id, mut event } => {
                use pb::space_event::Event as E;
                let Some(sender) = space.member(&id) else { continue };
                match &mut event.event {
                    Some(E::SpaceMessage(m)) => {
                        m.name = Some(sender.name.clone());
                        m.character_textures = wire::textures_to(&sender.textures);
                    }
                    Some(E::SpaceIsTyping(m)) => {
                        m.name = Some(sender.name.clone());
                        m.character_textures = wire::textures_to(&sender.textures);
                    }
                    Some(E::MuteAudioForEverybody(_) | E::MuteVideoForEverybody(_)) => {
                        if !sender.tags.iter().any(|t| t == "admin") {
                            continue;
                        }
                    }
                    None => continue,
                }
                let frame = wire::sub(pb::sub_message::Message::PublicEvent(pb::PublicEvent {
                    space_name: local_name.clone(),
                    space_event: Some(event),
                    sender_user_id: id.clone(),
                }));
                for m in space.member_ids().filter(|m| *m != id) {
                    if let Some(s) = sessions.get(m) {
                        s.push(frame.clone());
                    }
                }
            }
            SpaceCmd::Private { id, receiver, mut event } => {
                use pb::private_space_event::Event as P;
                let Some(sender) = space.member(&id) else { continue };
                let admin = sender.tags.iter().any(|t| t == "admin");
                match &mut event.event {
                    Some(P::MuteAudio(m)) => m.force = admin,
                    Some(P::MuteVideo(m)) => m.force = admin,
                    Some(P::KickOffUser(_)) if !admin => continue,
                    None => continue,
                    _ => {}
                }
                if !space.is_member(&receiver) {
                    continue;
                }
                let Some(event) = event.event else { continue };
                Out { name: &local_name, sessions: &sessions, media: &media }.private(&receiver, sender, event);
            }
            SpaceCmd::Restart { id, peer, connection_id } => space.restart_connection(
                &id,
                peer.as_deref(),
                connection_id.as_deref(),
                &mut Out { name: &local_name, sessions: &sessions, media: &media },
            ),
        }
    }
    if let (Some(s), Some((a, mut m))) = (&space, meetings) {
        m.observe(s, crate::redis_store::now_ms());
        m.close("closed", crate::redis_store::now_ms());
        a.meeting_rows(&world, m.take_rows());
    }
    registry.forget_dead(&key);
    METRICS.nb_spaces.dec();
}

/// RecordingEventPayload: the end of an egress, its files and times as LiveKit reports them (nanoseconds).
fn recording_event(r: &wa_core::space::Recording, egress_id: &str, info: &serde_json::Value) -> serde_json::Value {
    let f = |k: &str, s: &str| livekit::field(info, k, s).clone();
    let ns = |v: &serde_json::Value| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse().ok())).unwrap_or(0);
    let iso = |v: serde_json::Value| -> serde_json::Value {
        let ms = ns(&v) / 1_000_000;
        if ms <= 0 { serde_json::Value::Null } else { crate::uploader::iso_at(ms as u64).into() }
    };
    let files: Vec<serde_json::Value> = f("fileResults", "file_results")
        .as_array()
        .into_iter()
        .flatten()
        .map(|file| {
            serde_json::json!({
                "filename": file["filename"],
                "sizeBytes": ns(&file["size"]),
                "durationSeconds": (ns(&file["duration"]) as f64 / 1e9).round() as i64,
            })
        })
        .collect();
    let error = f("error", "error");
    serde_json::json!({
        "phase": "ended",
        "status": f("status", "status").as_str().unwrap_or_default(),
        "egressId": egress_id,
        "recordingSessionId": r.session_id,
        "playUri": r.play_uri,
        "recorder": {"uuid": r.recorder_uuid, "spaceUserId": r.recorder},
        "startedAt": iso(f("startedAt", "started_at")),
        "endedAt": iso(f("endedAt", "ended_at")),
        "error": if error.as_str().is_some_and(|e| !e.is_empty()) { error } else { serde_json::Value::Null },
        "files": files,
    })
}

/// Never, without a deadline.
async fn sleep_until_ms(deadline: Option<u64>) {
    let Some(at) = deadline else { return std::future::pending().await };
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64);
    tokio::time::sleep(std::time::Duration::from_millis(at.saturating_sub(now))).await;
}

/// Unique enough to tell two instances of the same space apart in connection ids.
fn rand_u64() -> u64 {
    use std::hash::{BuildHasher, Hasher};
    let mut h = std::collections::hash_map::RandomState::new().build_hasher();
    h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    h.finish()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_initial_state_matches_empty_space_state() {
        let v = serde_json::to_value(wa_core::space_state::empty()).unwrap();
        assert_eq!(
            v,
            serde_json::json!({
                "raisedHands": [],
                "floorHolders": [],
                "recording": {"recording": false, "recorder": null, "status": "idle"},
                "polls": {},
                "questions": {},
            })
        );
        assert_eq!(metadata_json([("a".to_owned(), "1".to_owned())].into_iter()), r#"{"a":1}"#);
        assert_eq!(metadata_json(std::iter::empty()), "{}");
    }
}
