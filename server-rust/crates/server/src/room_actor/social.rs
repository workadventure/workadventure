//! Between the players of a room: follow, bubble lock, emotes, items, meeting invitations, kicks.

use super::*;

impl RoomActor {
    pub(super) async fn social(&mut self, session: Arc<Session>, act: Social) {
        use pb::server_to_client_message::Message as Top;
        let Some(me) = session.user_id().filter(|id| self.sessions.contains_key(id)) else { return };
        let direct = |to: UserId, sessions: &HashMap<UserId, Arc<Session>>, m: Top| {
            if let Some(s) = sessions.get(&to) {
                s.push(wire::direct(m));
            }
        };
        let others_in_group =
            |room: &Room| -> Vec<UserId> { room.group_members(me).into_iter().filter(|u| *u != me).collect() };
        match act {
            Social::FollowRequest(m) => {
                for to in others_in_group(&self.room) {
                    direct(to, &self.sessions, Top::FollowRequestMessage(m));
                }
            }
            Social::FollowConfirmation(m) => {
                if self.room.user(m.leader).is_some() {
                    send_follow(self.follows.confirm(me, m.leader, &self.room.group_members(me)), &self.sessions);
                }
            }
            Social::FollowAbort(m) => {
                send_follow(self.follows.abort(me, m.leader), &self.sessions);
                // Those who got the request and did not accept yet.
                if me == m.leader {
                    for to in others_in_group(&self.room) {
                        direct(to, &self.sessions, Top::FollowAbortMessage(m));
                    }
                }
            }
            Social::LockGroup(lock) => self.room.lock_group(me, lock, &mut Fanout::new(&mut self.sessions)),
            Social::Emote(emote) => {
                if wa_core::social::is_valid_emote(&emote) {
                    self.room.emote(me, &emote, &mut Fanout::new(&mut self.sessions));
                }
            }
            Social::Item(m) => {
                let state = m.state_json.clone();
                Fanout::new(&mut self.sessions)
                    .each_all(&wire::sub(pb::sub_message::Message::ItemEventMessage(m.clone())));
                self.items.insert(m.item_id, state);
            }
            Social::InvitationRequest(m) => {
                let admin = session.info.tags.iter().any(|t| t == "admin");
                if !admin
                    && !self.invitations.try_send(SystemClock.now_ms(), &session.info.user_uuid, &m.receiver_user_uuid)
                {
                    session.push(wire::direct(Top::MeetingInvitationRequestTooHighMessage(
                        pb::MeetingInvitationRequestTooHighMessage {},
                    )));
                    return;
                }
                let sender_name = self.room.user(me).map(|u| u.profile.name.clone()).unwrap_or_default();
                for to in self.room.ids_of(&m.receiver_user_uuid).into_iter().filter(|u| *u != me) {
                    let received = pb::MeetingInvitationRequestReceivedMessage {
                        sender_user_uuid: session.info.user_uuid.clone(),
                        sender_play_uri: self.url.clone(),
                        sender_name: sender_name.clone(),
                        sender_user_id: Some(me),
                    };
                    direct(to, &self.sessions, Top::MeetingInvitationRequestReceivedMessage(received));
                }
            }
            Social::InvitationResponse(m) => {
                let responder_name = self.room.user(me).map(|u| u.profile.name.clone()).unwrap_or_default();
                for to in self.room.ids_of(&m.request_sender_user_uuid).into_iter().filter(|u| *u != me) {
                    let received = pb::MeetingInvitationResponseReceivedMessage {
                        accepted: m.accept,
                        responder_name: responder_name.clone(),
                    };
                    direct(to, &self.sessions, Top::MeetingInvitationResponseReceivedMessage(received));
                }
                if m.accept {
                    self.invitations.clear(&m.request_sender_user_uuid);
                }
                // The responder's other tabs close their popup.
                for to in self.room.ids_of(&session.info.user_uuid).into_iter().filter(|u| *u != me) {
                    direct(
                        to,
                        &self.sessions,
                        Top::MeetingInvitationRequestClosedMessage(pb::MeetingInvitationRequestClosedMessage {}),
                    );
                }
            }
            Social::Kick { uuid, reason, banned } => {
                // SocketManager.banUser: out of the room, told why, then the connection ends (4000).
                for id in self.room.ids_of(&uuid) {
                    let changes = self.variables.moved(self.room.position_of(id), None);
                    send_follow(self.follows.left(id), &self.sessions);
                    self.room.leave(id, &mut Fanout::new(&mut self.sessions));
                    Fanout::new(&mut self.sessions).variables(changes);
                    if let Some(s) = self.sessions.remove(&id) {
                        dec_room_gauge(&METRICS.nb_clients_per_room, &self.url);
                        tell_admins(
                            &mut self.admins,
                            &serde_json::json!({"type": "MemberLeave", "data": {"uuid": s.info.user_uuid}}).to_string(),
                        );
                        s.push(wire::direct(Top::BanUserMessage(pb::BanUserMessage {
                            r#type: if banned { "banned" } else { "kicked" }.into(),
                            message: reason.clone(),
                        })));
                        s.end_after_queued();
                    }
                }
            }
        }
    }
}
