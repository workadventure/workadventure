//! The owner of one space (one task, bounded mailbox), like room_actor for rooms. It answers the join and
//! leave queries itself, so the answer and the messages it causes leave in the right order.

use std::collections::HashMap;
use std::sync::Arc;

use wa_core::space::{FilterType, JoinError, Space, SpaceEvent, SpaceSink, SpaceUser};
use wa_core::space_state::StateQuery;
use wa_core::user::Availability;
use wa_proto::messages as pb;

use crate::json_patch;
use crate::metrics::METRICS;
use crate::outbox::Frame;
use crate::registry::ActorRegistry;
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
        peer: String,
        connection_id: Option<String>,
    },
}

pub type SpaceHandle = tokio::sync::mpsc::Sender<SpaceCmd>;

pub fn get_or_spawn(registry: &Arc<ActorRegistry<SpaceCmd>>, key: &str, local_name: &str) -> SpaceHandle {
    registry.get_or_spawn(key, || {
        let (tx, rx) = tokio::sync::mpsc::channel(MAILBOX);
        tokio::spawn(run(key.to_owned(), local_name.to_owned(), rx, registry.clone()));
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
        Q::VotePoll(q) => StateQuery::VotePoll {
            poll_id: q.poll_id,
            answer_ids: q.answer_ids,
        },
        Q::ClosePoll(q) => StateQuery::ClosePoll {
            poll_id: q.poll_id,
            closing_message: q.closing_message,
        },
        Q::DeletePoll(q) => StateQuery::DeletePoll(q.poll_id),
        Q::AskQuestion(q) => StateQuery::AskQuestion(q.body),
        Q::UpvoteQuestion(q) => StateQuery::UpvoteQuestion {
            question_id: q.question_id,
            upvoted: q.upvoted,
        },
        Q::AnswerQuestion(q) => StateQuery::AnswerQuestion(q.question_id),
        Q::DeleteQuestion(q) => StateQuery::DeleteQuestion(q.question_id),
        Q::SetKind(q) => StateQuery::SetKind(q.kind),
    })
}

fn state_patch(name: String, patch: String) -> Frame {
    wire::sub(pb::sub_message::Message::SpaceStatePatchMessage(pb::SpaceStatePatchMessage {
        space_name: name,
        patch,
    }))
}

fn metadata_json(entries: impl Iterator<Item = (String, String)>) -> String {
    let fields: Vec<String> = entries
        .map(|(k, raw)| format!("{}:{}", serde_json::Value::String(k), raw))
        .collect();
    format!("{{{}}}", fields.join(","))
}

struct Out<'a> {
    name: &'a str,
    sessions: &'a HashMap<String, Arc<Session>>,
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
            SpaceEvent::StateReplace(state) => state_patch(
                name,
                serde_json::json!([{"op": "replace", "path": "", "value": state}]).to_string(),
            ),
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
            SpaceEvent::Metadata(delta) => {
                wire::sub(Sub::UpdateSpaceMetadataMessage(pb::UpdateSpaceMetadataMessage {
                    space_name: name,
                    metadata: metadata_json(delta.iter().cloned()),
                }))
            }
            SpaceEvent::SwitchToWebRtc(user) => {
                for r in to {
                    self.private(
                        r,
                        user,
                        P::SwitchMessage(pb::SwitchMessage {
                            strategy: "WEBRTC".into(),
                        }),
                    );
                }
                return;
            }
            SpaceEvent::WebRtcStart {
                sender,
                initiator,
                connection_id,
            } => {
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

async fn run(
    key: String,
    local_name: String,
    mut mailbox: tokio::sync::mpsc::Receiver<SpaceCmd>,
    registry: Arc<ActorRegistry<SpaceCmd>>,
) {
    METRICS.nb_spaces.inc();
    let mut space: Option<Space> = None;
    let mut sessions: HashMap<String, Arc<Session>> = HashMap::new();
    let instance = format!("{:x}", rand_u64());

    while let Some(cmd) = mailbox.recv().await {
        use pb::answer_message::Answer;
        let space = match (&mut space, &cmd) {
            (Some(s), _) => s,
            (
                None,
                SpaceCmd::Join {
                    filter,
                    properties_to_sync,
                    ..
                },
            ) => space.insert(Space::new(
                local_name.clone(),
                *filter,
                properties_to_sync.clone(),
                instance.clone(),
            )),
            // Nothing but a join can create the space.
            (None, SpaceCmd::Leave { session, query_id: Some(q), .. }) => {
                session.push(wire::answer(*q, Answer::LeaveSpaceAnswer(pb::LeaveSpaceAnswer {})));
                continue;
            }
            (None, _) => continue,
        };
        match cmd {
            SpaceCmd::Join {
                session,
                user,
                filter,
                query_id,
                ..
            } => {
                let id = user.space_user_id.clone();
                let joined = space.join(
                    filter,
                    user,
                    &mut Out {
                        name: &local_name,
                        sessions: &sessions,
                    },
                );
                match joined {
                    Ok(()) => {
                        sessions.insert(id.clone(), session.clone());
                        session.push(wire::answer(
                            query_id,
                            Answer::JoinSpaceAnswer(pb::JoinSpaceAnswer {
                                space_user_id: id.clone(),
                            }),
                        ));
                        space.after_join(
                            &id,
                            &mut Out {
                                name: &local_name,
                                sessions: &sessions,
                            },
                        );
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
                space.leave(
                    &id,
                    &mut Out {
                        name: &local_name,
                        sessions: &sessions,
                    },
                );
                sessions.remove(&id);
                if let Some(q) = query_id {
                    session.push(wire::answer(q, Answer::LeaveSpaceAnswer(pb::LeaveSpaceAnswer {})));
                }
            }
            SpaceCmd::Watch { id } => {
                space.watch(
                    &id,
                    &mut Out {
                        name: &local_name,
                        sessions: &sessions,
                    },
                );
            }
            SpaceCmd::Unwatch { id } => space.unwatch(
                &id,
                &mut Out {
                    name: &local_name,
                    sessions: &sessions,
                },
            ),
            SpaceCmd::Update { id, from, paths } => space.update_from_client(
                &id,
                &from,
                &paths,
                &mut Out {
                    name: &local_name,
                    sessions: &sessions,
                },
            ),
            SpaceCmd::Details {
                id,
                availability,
                chat_id,
                show_voice_indicator,
            } => space.update_from_details(
                &id,
                availability,
                chat_id.as_deref(),
                show_voice_indicator,
                &mut Out {
                    name: &local_name,
                    sessions: &sessions,
                },
            ),
            SpaceCmd::Metadata { id, delta } => space.update_metadata(
                &id,
                delta,
                &mut Out {
                    name: &local_name,
                    sessions: &sessions,
                },
            ),
            SpaceCmd::StateQuery {
                session,
                id,
                query_id,
                query,
            } => {
                let result = state_query(query).map_err(str::to_owned).and_then(|q| {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map_or(0, |d| d.as_millis() as i64);
                    space.state_query(
                        &id,
                        q,
                        now,
                        &mut || uuid::Uuid::new_v4().to_string(),
                        &mut Out {
                            name: &local_name,
                            sessions: &sessions,
                        },
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
            SpaceCmd::Private {
                id,
                receiver,
                mut event,
            } => {
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
                Out {
                    name: &local_name,
                    sessions: &sessions,
                }
                .private(&receiver, sender, event);
            }
            SpaceCmd::Restart {
                id,
                peer,
                connection_id,
            } => space.restart_connection(
                &id,
                &peer,
                connection_id.as_deref(),
                &mut Out {
                    name: &local_name,
                    sessions: &sessions,
                },
            ),
        }
    }
    registry.forget_dead(&key);
    METRICS.nb_spaces.dec();
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
