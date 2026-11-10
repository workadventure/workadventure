//! The chat rooms of the map's areas (Matrix): entering an area invites the player into its room (an admin of
//! the world as a moderator), leaving it or the game kicks them out.

use super::*;

impl Logic {
    /// enterChatRoomAreaQuery: answered once Synapse was asked (its failures are only logged, as the pusher).
    pub(super) fn enter_chat_room_area(&mut self, id: i32, room: String) {
        use pb::answer_message::Answer as A;
        let session = self.parts_session.clone();
        let Some(chat_id) = self.chat_id.clone().filter(|c| !c.is_empty()) else {
            session.push(wire::answer_error(id, "Error entering chat room area, try again later 🙏"));
            return;
        };
        self.chat_rooms.push(room.clone());
        let matrix = self.app.matrix.clone();
        let admin = session.info.tags.iter().any(|t| t == "admin");
        tokio::spawn(async move {
            if let Some(m) = matrix {
                if let Err(e) = m.invite(&chat_id, &room).await {
                    tracing::warn!(%room, error = %e, "could not invite a player into an area's chat room");
                }
                if admin && let Err(e) = m.promote(&chat_id, &room).await {
                    tracing::warn!(%room, error = %e, "could not make an admin moderator of an area's chat room");
                }
            }
            session.push(wire::answer(id, A::EnterChatRoomAreaAnswer(pb::EnterChatRoomAreaAnswer {})));
        });
    }

    /// leaveChatRoomAreaMessage.
    pub(super) fn leave_chat_room_area(&mut self, room: String) {
        self.chat_rooms.retain(|r| *r != room);
        self.kick_from_chat_rooms(vec![room]);
    }

    /// When the session ends: out of every area room it is in.
    pub(super) fn leave_all_chat_rooms(&mut self) {
        let rooms = std::mem::take(&mut self.chat_rooms);
        self.kick_from_chat_rooms(rooms);
    }

    fn kick_from_chat_rooms(&self, rooms: Vec<String>) {
        let (Some(matrix), Some(chat_id)) = (self.app.matrix.clone(), self.chat_id.clone().filter(|c| !c.is_empty()))
        else {
            return;
        };
        if rooms.is_empty() {
            return;
        }
        tokio::spawn(async move {
            for room in rooms {
                if let Err(e) = matrix.kick(&chat_id, &room).await {
                    tracing::warn!(%room, error = %e, "could not kick a player out of an area's chat room");
                }
            }
        });
    }
}
