//! A player's moderation and admin messages: ban (by account or IP), global message, report, chat id.

use super::*;
use pb::client_to_server_message::Message as M;

impl Logic {
    pub(super) async fn moderation(&mut self, message: M) {
        let session = self.parts_session.clone();
        match message {
            // handleBanPlayerMessage: admins only, silently ignored otherwise. Without an admin API a ban
            // cannot be stored: it falls back to a kick, as LocalAdmin's refusal does on the pusher.
            M::BanPlayerMessage(m) => {
                if !session.info.tags.iter().any(|t| t == "admin") {
                    return;
                }
                let (Some(admin), false) = (self.app.admin.clone(), m.kick) else {
                    self.social(Social::Kick { uuid: m.ban_user_uuid, reason: m.reason, banned: false }).await;
                    return;
                };
                // A7: stored by the admin, which refuses the user from then on (A3); kicked anyway if it fails.
                let Some(room) = self.room.clone() else { return };
                let app = self.app.clone();
                tokio::spawn(async move {
                    // byIp: the address the server sees for the user, unless the moderator shares it.
                    let ip = if m.by_ip {
                        let users = crate::room_actor::world_users(&app, &session.info.world).await.unwrap_or_default();
                        users
                            .into_iter()
                            .find(|u| u.uuid == m.ban_user_uuid)
                            .map(|u| u.ip)
                            .filter(|ip| !ip.is_empty() && *ip != session.info.ip_address)
                    } else {
                        None
                    };
                    let message = if m.reason.is_empty() {
                        format!("User banned by admin {}", session.info.user_uuid)
                    } else {
                        m.reason.clone()
                    };
                    let banned = admin
                        .ban(
                            &m.ban_user_uuid,
                            &session.info.room_id,
                            &m.ban_user_name,
                            &message,
                            &session.info.user_uuid,
                            ip.as_deref(),
                        )
                        .await
                        .unwrap_or(false);
                    let act = Social::Kick { uuid: m.ban_user_uuid, reason: m.reason, banned };
                    let _ = room.send(RoomCmd::Social { session, act }).await;
                });
            }
            // emitPlayGlobalMessage: admins only, to the room or to every room of the world.
            M::PlayGlobalMessage(m) => {
                if !session.info.tags.iter().any(|t| t == "admin") {
                    return;
                }
                let app = self.app.clone();
                // The announcement shows who sent it; its "Join" button never leaves the sender's site.
                let announcement = pb::SendUserMessage {
                    r#type: m.r#type,
                    message: m.content,
                    sender_name: self.name.clone(),
                    sender_textures: wire::textures_to(&session.info.textures),
                    broadcast_to_world: m.broadcast_to_world,
                    join_url: same_origin_join_url(&m.join_url, &session.info.room_id),
                };
                tokio::spawn(async move {
                    let rooms = match (&app.admin, m.broadcast_to_world) {
                        (Some(admin), true) => {
                            match admin.rooms_from_same_world(&session.info.room_id, &[], true).await {
                                Ok(list) => list.into_iter().map(|r| r.room_url).collect(),
                                Err(e) => {
                                    tracing::warn!(error = %e, "the admin did not list the rooms of the world");
                                    return;
                                }
                            }
                        }
                        _ => vec![session.info.room_id.clone()],
                    };
                    for url in rooms {
                        let room = room_actor::get_or_spawn(&app, &url);
                        let _ = room.send(RoomCmd::AdminMessage(announcement.clone())).await;
                    }
                });
            }
            M::ReportPlayerMessage(m) => {
                if let Some(admin) = self.app.admin.clone() {
                    tokio::spawn(async move {
                        if let Err(e) = admin
                            .report(
                                &m.reported_user_uuid,
                                &m.report_comment,
                                &session.info.user_uuid,
                                &session.info.room_id,
                            )
                            .await
                        {
                            tracing::warn!(error = %e, "the admin did not take a report");
                        }
                    });
                }
            }
            M::UpdateChatIdMessage(m) => {
                self.chat_id = Some(m.chat_id.clone());
                if let Some(admin) = self.app.admin.clone() {
                    tokio::spawn(async move {
                        if let Err(e) = admin.update_chat_id(&m.email, &m.chat_id, &session.info.room_id).await {
                            tracing::warn!(error = %e, "the admin did not take a chat id");
                            session.push(wire::sub(pb::sub_message::Message::ErrorMessage(pb::ErrorMessage {
                                message: e,
                            })));
                        }
                    });
                }
            }
            _ => {}
        }
    }
}

/// The place an announcement leads to, as an absolute URL, if it stays on the sender's origin; empty otherwise
/// (another site, a scheme without an origin such as `javascript:`, or a room URL that does not parse).
fn same_origin_join_url(join_url: &str, sender_room_url: &str) -> String {
    if join_url.is_empty() {
        return String::new();
    }
    let Ok(room) = reqwest::Url::parse(sender_room_url) else { return String::new() };
    match room.join(join_url) {
        Ok(url) if url.origin() == room.origin() => url.into(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::same_origin_join_url;

    #[test]
    fn an_announcement_only_leads_to_a_place_of_the_senders_site() {
        let room = "https://play.test/@/acme/world/lobby";
        assert_eq!(same_origin_join_url("", room), "");
        assert_eq!(same_origin_join_url("#moveTo=stage", room), "https://play.test/@/acme/world/lobby#moveTo=stage");
        assert_eq!(
            same_origin_join_url("https://play.test/@/acme/world/hall#moveTo=stage", room),
            "https://play.test/@/acme/world/hall#moveTo=stage"
        );
        for elsewhere in [
            "https://evil.test/@/acme/world/lobby#moveTo=stage",
            "//evil.test/x",
            "http://play.test/@/acme/world/lobby",
            "https://play.test:8443/x",
            "javascript:alert(1)",
            "data:text/html,x",
        ] {
            assert_eq!(same_origin_join_url(elsewhere, room), "", "{elsewhere}");
        }
        assert_eq!(same_origin_join_url("#moveTo=stage", "not a url"), "");
    }
}
