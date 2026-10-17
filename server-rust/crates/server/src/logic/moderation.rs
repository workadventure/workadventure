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
                tokio::spawn(async move {
                    let rooms = match (&app.admin, m.broadcast_to_world) {
                        (Some(admin), true) => {
                            match admin.rooms_from_same_world(&session.info.room_id, &[], true).await {
                                Ok(list) => list
                                    .as_array()
                                    .into_iter()
                                    .flatten()
                                    .filter_map(|r| r["roomUrl"].as_str().map(str::to_owned))
                                    .collect(),
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
                        let _ = room
                            .send(RoomCmd::AdminMessage { kind: m.r#type.clone(), message: m.content.clone() })
                            .await;
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
