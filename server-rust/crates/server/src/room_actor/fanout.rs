//! From the core's events to the sessions: each frame encoded once.

use super::*;

pub(super) fn variable_frame((area, property, key): VarKey, value: String) -> Frame {
    wire::sub(pb::sub_message::Message::AreaPropertyVariableMessage(pb::AreaPropertyVariableMessage {
        area_id: area,
        property_id: property,
        key,
        value,
    }))
}

/// Encodes each event once, then hands the bytes to every recipient.
pub(super) struct Fanout<'a> {
    pub(super) sessions: &'a mut HashMap<UserId, Arc<Session>>,
    pub(super) joining: Option<Arc<Session>>,
    /// The area variables a joining user gets in roomJoinedMessage.
    pub(super) variables: Vec<pb::AreaPropertyVariableMessage>,
    /// The room variables it may read.
    pub(super) room_variables: Vec<pb::VariableMessage>,
    /// The items' last states.
    pub(super) items: Vec<pb::ItemStateMessage>,
    /// The joining player's own variables.
    pub(super) player_variables: Vec<pb::VariableMessage>,
}

impl<'a> Fanout<'a> {
    pub(super) fn new(sessions: &'a mut HashMap<UserId, Arc<Session>>) -> Self {
        Self {
            sessions,
            joining: None,
            variables: Vec::new(),
            room_variables: Vec::new(),
            items: Vec::new(),
            player_variables: Vec::new(),
        }
    }

    pub(super) fn variables(&self, changes: Vec<(VarKey, String)>) {
        for (key, value) in changes {
            self.each_all(&variable_frame(key, value));
        }
    }

    pub(super) fn each_all(&self, frame: &Frame) {
        for s in self.sessions.values() {
            s.push(frame.clone());
        }
    }

    pub(super) fn each(&self, to: &[UserId], frame: &Frame) {
        for id in to {
            if let Some(s) = self.sessions.get(id) {
                s.push(frame.clone());
            }
        }
    }
}

impl Sink for Fanout<'_> {
    fn emit(&mut self, to: &[UserId], event: Event<'_>) {
        use pb::server_to_client_message::Message as Top;
        use pb::sub_message::Message as Sub;
        let frame = match event {
            Event::RoomJoined(user) => {
                if let Some(session) = self.joining.take() {
                    session.set_user_id(user.id);
                    session.push(wire::direct(Top::RoomJoinedMessage(pb::RoomJoinedMessage {
                        current_user_id: user.id,
                        character_textures: wire::textures_to(&user.profile.textures),
                        companion_texture: user
                            .profile
                            .companion
                            .as_ref()
                            .map(|c| pb::CompanionTextureMessage { url: c.url.clone(), id: c.id.clone() }),
                        can_edit: user.profile.can_edit,
                        activated_invite_user: session.info.activated_invite_user,
                        user_room_token: session.info.user_room_token.clone(),
                        area_property_variable: std::mem::take(&mut self.variables),
                        variable: std::mem::take(&mut self.room_variables),
                        item: std::mem::take(&mut self.items),
                        player_variable: std::mem::take(&mut self.player_variables),
                        applications: session.info.applications.clone(),
                    })));
                    self.sessions.insert(user.id, session);
                }
                return;
            }
            Event::UserMoved(user) => {
                // Moves coalesce in the outbox: encode once, push as a move.
                let Frame::Sub(bytes) = wire::sub(wire::user_moved(user)) else { return };
                for id in to {
                    if let Some(s) = self.sessions.get(id) {
                        s.push_move(user.id, bytes.clone());
                    }
                }
                return;
            }
            Event::UserJoined(user) => wire::sub(wire::user_joined(user)),
            Event::UserLeft(id) => wire::sub(Sub::UserLeftMessage(pb::UserLeftMessage { user_id: id })),
            Event::GroupUpdated(g) => wire::sub(wire::group_update(g)),
            Event::GroupDeleted(id) => wire::sub(Sub::GroupDeleteMessage(pb::GroupDeleteMessage { group_id: id })),
            Event::GroupUsersUpdated(g) => wire::sub(Sub::GroupUsersUpdateMessage(pb::GroupUsersUpdateMessage {
                group_id: g.id,
                user_ids: g.users.clone(),
            })),
            Event::DetailsUpdated(id, change) => {
                wire::sub(Sub::PlayerDetailsUpdatedMessage(pb::PlayerDetailsUpdatedMessage {
                    user_id: id,
                    details: Some(wire::details_to(change)),
                }))
            }
            Event::JoinGroupSpace(g) => wire::direct(Top::JoinSpaceRequestMessage(pb::JoinSpaceRequestMessage {
                space_name: g.space_name.clone(),
                properties_to_sync: ["cameraState", "microphoneState", "screenSharingState"].map(String::from).to_vec(),
            })),
            Event::Emote(actor, emote) => wire::sub(Sub::EmoteEventMessage(pb::EmoteEventMessage {
                actor_user_id: actor,
                emote: emote.to_owned(),
            })),
            Event::LeaveGroupSpace(name) => wire::direct(Top::LeaveSpaceRequestMessage(pb::LeaveSpaceRequestMessage {
                space_name: name.to_owned(),
            })),
        };
        self.each(to, &frame);
    }
}

/// Tells the users what the map's edits and reloads gave.
pub(super) fn deliver(
    outcomes: Vec<Outcome>,
    map: &Option<MapFile>,
    variables: &mut AreaVariables,
    room: &Room,
    sessions: &mut HashMap<UserId, Arc<Session>>,
    url: &str,
) {
    use pb::sub_message::Message as Sub;
    for outcome in outcomes {
        let ok = match &outcome {
            Outcome::Edited { result, .. } => result.is_ok(),
            Outcome::Reloaded => true,
        };
        if ok && let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref()) {
            let changes = variables.track(wam.areas(), room.positions());
            Fanout::new(sessions).variables(changes);
        }
        match outcome {
            // Everyone gets it, the sender included: its pending command is acknowledged by the id.
            Outcome::Edited { result: Ok(echo), .. } => {
                Fanout::new(sessions).each_all(&wire::sub(Sub::EditMapCommandMessage(echo)));
            }
            Outcome::Edited { session, id, result: Err(reason) } => {
                session.push(wire::sub(Sub::EditMapCommandMessage(pb::EditMapCommandMessage {
                    id,
                    edit_map_message: Some(pb::EditMapMessage {
                        message: Some(pb::edit_map_message::Message::ErrorCommandMessage(pb::ErrorCommandMessage {
                            reason,
                        })),
                    }),
                })));
            }
            // The users are asked to reload: the file they have is not the one the room now uses.
            Outcome::Reloaded => {
                let frame =
                    wire::direct(pb::server_to_client_message::Message::RefreshRoomMessage(pb::RefreshRoomMessage {
                        room_id: url.to_owned(),
                        version_number: 0,
                        time_to_refresh: Some(30),
                    }));
                Fanout::new(sessions).each_all(&frame);
            }
        }
    }
}
