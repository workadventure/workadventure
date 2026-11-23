//! A player's messages to the spaces it joined: filters, its own state, metadata, events, media restarts.

use super::*;
use pb::client_to_server_message::Message as M;

impl Logic {
    /// An admin moderates every conversation; a meeting room can also name a moderator tag in its advanced options
    /// (livekitRoomAdminTag), which the room reads from its WAM.
    async fn can_moderate(&self, local: &str) -> bool {
        let tags = &self.parts_session.info.tags;
        if tags.iter().any(|t| t == "admin") {
            return true;
        }
        let (reply, answer) = tokio::sync::oneshot::channel();
        let space = local.rsplit('.').next().unwrap_or(local).to_owned();
        self.to_room(RoomCmd::ModeratorTag { space, reply }).await;
        matches!(answer.await, Ok(Some(tag)) if tags.contains(&tag))
    }

    pub(super) async fn space_message(&mut self, message: M) {
        let space_user_id = self.parts_session.space_user_id();
        match message {
            M::AddSpaceFilterMessage(f) => {
                let (Some(f), Some(id)) = (f.space_filter_message, space_user_id) else { return };
                self.to_space(&f.space_name, SpaceCmd::Watch { id }).await;
            }
            M::RemoveSpaceFilterMessage(f) => {
                let (Some(f), Some(id)) = (f.space_filter_message, space_user_id) else { return };
                self.to_space(&f.space_name, SpaceCmd::Unwatch { id }).await;
            }
            M::UpdateSpaceUserMessage(update) => {
                let (Some(from), Some(id)) = (update.user, space_user_id) else { return };
                let paths: Vec<String> = update
                    .update_mask
                    .map(|m| m.paths)
                    .unwrap_or_default()
                    .into_iter()
                    .filter(|p| CLIENT_UPDATABLE.contains(&p.as_str()))
                    .collect();
                if paths.is_empty() {
                    return;
                }
                self.to_space(
                    &update.space_name,
                    SpaceCmd::Update { id, from: wire::space_user_update_from(&from), paths },
                )
                .await;
            }
            M::UpdateSpaceMetadataMessage(m) => {
                let Some(id) = space_user_id else { return };
                let Ok(serde_json::Value::Object(map)) = serde_json::from_str::<serde_json::Value>(&m.metadata) else {
                    return;
                };
                let delta = map.into_iter().map(|(k, v)| (k, v.to_string())).collect();
                self.to_space(&m.space_name, SpaceCmd::Metadata { id, delta }).await;
            }
            M::PublicEvent(e) => {
                use pb::space_event::Event as E;
                let (Some(event), Some(id)) = (e.space_event, space_user_id) else { return };
                let moderation = matches!(event.event, Some(E::MuteAudioForEverybody(_) | E::MuteVideoForEverybody(_)));
                let moderator = moderation && self.can_moderate(&e.space_name).await;
                self.to_space(&e.space_name, SpaceCmd::Public { id, event, moderator }).await;
            }
            M::PrivateEvent(e) => {
                use pb::private_space_event::Event as P;
                let (Some(event), Some(id)) = (e.space_event, space_user_id) else { return };
                let moderation = matches!(event.event, Some(P::MuteAudio(_) | P::MuteVideo(_) | P::KickOffUser(_)));
                let moderator = moderation && self.can_moderate(&e.space_name).await;
                let receiver = e.receiver_user_id;
                self.to_space(&e.space_name, SpaceCmd::Private { id, receiver, event, moderator }).await;
            }
            M::BackEvent(e) => {
                let Some(id) = space_user_id else { return };
                if let Some(pb::BackEvent { event: Some(pb::back_event::Event::MeetingConnectionRestartMessage(r)) }) =
                    e.back_event
                {
                    // LiveKit's restart carries no peer: the requester just gets a fresh invitation.
                    self.to_space(
                        &e.space_name,
                        SpaceCmd::Restart { id, peer: r.user_id, connection_id: r.connection_id },
                    )
                    .await;
                }
            }
            _ => {}
        }
    }
}
