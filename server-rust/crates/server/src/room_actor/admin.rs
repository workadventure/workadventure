//! What the admin and the Room API ask of a room: listening, bans, refresh, messages, lists.

use super::*;

impl RoomActor {
    pub(super) async fn admin(&mut self, cmd: RoomCmd) {
        use pb::server_to_client_message::Message as Top;
        match cmd {
            RoomCmd::Api(cmd) => match cmd {
                RoomApiCmd::Read { name, reply } => {
                    let _ = reply.send(self.room_vars.get(&name).map(str::to_owned));
                }
                RoomApiCmd::Save { name, value, reply } => {
                    let saved = set_variable(
                        &mut self.room_vars,
                        &self.app,
                        &self.url,
                        &self.sessions,
                        &mut self.var_listeners,
                        Writer::RoomApi,
                        &name,
                        &value,
                    );
                    let _ = reply.send(saved.map_err(|e| e.to_string()));
                }
                RoomApiCmd::ListenVariable { name, tx } => self.var_listeners.add(name, tx),
                RoomApiCmd::ListenEvent { name, tx } => self.event_listeners.add(name, tx),
            },
            RoomCmd::AdminListen { tx } => {
                for s in self.sessions.values() {
                    let name = s
                        .user_id()
                        .and_then(|id| self.room.user(id))
                        .map(|u| u.profile.name.clone())
                        .unwrap_or_default();
                    let _ = tx.try_send(member_join(&s.info, &name, &self.url));
                }
                self.admins.push(tx);
            }
            RoomCmd::AdminBan { uuid, reason } => {
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
                            r#type: "banned".into(),
                            message: reason.clone(),
                        })));
                        s.end_after_queued();
                    }
                }
            }
            RoomCmd::Refresh => {
                self.version += 1;
                let frame = wire::direct(Top::RefreshRoomMessage(pb::RefreshRoomMessage {
                    room_id: self.url.clone(),
                    version_number: self.version,
                    time_to_refresh: None,
                }));
                Fanout::new(&mut self.sessions).each_all(&frame);
            }
            RoomCmd::AdminMessage { kind, message } => {
                let frame = wire::direct(Top::SendUserMessage(pb::SendUserMessage { r#type: kind, message }));
                Fanout::new(&mut self.sessions).each_all(&frame);
            }
            RoomCmd::Group(reply) => {
                let _ = reply.send(self.details["group"].as_str().filter(|g| !g.is_empty()).map(str::to_owned));
            }
            RoomCmd::Users(reply) => {
                let users = self
                    .sessions
                    .iter()
                    .map(|(id, s)| WorldUser {
                        uuid: s.info.user_uuid.clone(),
                        name: self.room.user(*id).map(|u| u.profile.name.clone()).unwrap_or_default(),
                        ip: s.info.ip_address.clone(),
                    })
                    .collect();
                let _ = reply.send((self.url.clone(), users));
            }
            RoomCmd::WorldFull => {
                Fanout::new(&mut self.sessions)
                    .each_all(&wire::direct(Top::WorldFullWarningMessage(pb::WorldFullWarningMessage {})));
            }
            RoomCmd::ExternalModule(m) => {
                let Some(uuid) = m.recipient_uuid.clone() else { return };
                let frame = wire::direct(Top::ExternalModuleMessage(m));
                for id in self.room.ids_of(&uuid) {
                    if let Some(s) = self.sessions.get(&id) {
                        s.push(frame.clone());
                    }
                }
            }
            RoomCmd::Describe { reply } => {
                let _ = reply.send((self.url.clone(), self.sessions.len()));
            }
            _ => {}
        }
    }
}
