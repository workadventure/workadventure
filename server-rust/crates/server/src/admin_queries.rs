//! The queries the pusher answers from the admin (SocketManager.handle*Query), when ADMIN_API_URL is set.

use serde_json::Value;
use wa_proto::messages as pb;

use crate::admin_api::AdminApi;
use crate::session::SessionInfo;

use pb::answer_message::Answer as A;
use pb::query_message::Query as Q;

fn text(v: &Value) -> Option<String> {
    v.as_str().map(str::to_owned)
}

fn member(m: &Value) -> pb::Member {
    pb::Member {
        id: m["id"].as_str().map_or_else(|| m["id"].to_string(), str::to_owned),
        name: text(&m["name"]),
        email: text(&m["email"]),
        visit_card_url: text(&m["visitCardUrl"]),
        chat_id: text(&m["chatID"]),
    }
}

fn strings(v: &Value) -> Vec<String> {
    v.as_array().into_iter().flatten().filter_map(|s| s.as_str().map(str::to_owned)).collect()
}

/// Whether the admin answers this query (otherwise LocalAdmin's answer stands).
pub fn handles(q: &Q, admin: &AdminApi) -> bool {
    match q {
        Q::RoomsFromSameWorldQuery(_)
        | Q::RoomTagsQuery(_)
        | Q::SearchTagsQuery(_)
        | Q::ChatMembersQuery(_)
        | Q::SearchMemberQuery(_)
        | Q::GetMemberQuery(_)
        | Q::OauthRefreshTokenQuery(_) => true,
        Q::IceServersQuery(_) => admin.has("api/ice-servers"),
        _ => false,
    }
}

/// The answer, or the error the front gets.
pub async fn answer(admin: &AdminApi, info: &SessionInfo, q: Q) -> Result<A, String> {
    let room = info.room_id.as_str();
    Ok(match q {
        Q::RoomsFromSameWorldQuery(_) => {
            let list = admin.rooms_from_same_world(room, &info.tags, false).await?;
            let rooms = list.as_array().into_iter().flatten().map(|r| pb::RoomShortDescription {
                name: text(&r["name"]).unwrap_or_default(),
                room_url: text(&r["roomUrl"]).unwrap_or_default(),
                wam_url: text(&r["wamUrl"]),
                description: text(&r["description"]),
                copyright: text(&r["copyright"]),
                thumbnail: text(&r["thumbnail"]),
                areas_searchable: r["areasSearchable"].as_i64().map(|n| n as i32),
                entities_searchable: r["entitiesSearchable"].as_i64().map(|n| n as i32),
            });
            A::RoomsFromSameWorldAnswer(pb::RoomsFromSameWorldAnswer { room_descriptions: rooms.collect() })
        }
        Q::RoomTagsQuery(_) => A::RoomTagsAnswer(pb::RoomTagsAnswer { tags: admin.room_tags(room).await }),
        Q::SearchTagsQuery(s) => {
            let tags = admin.search("/api/world/tags", room, &s.search_text).await?;
            A::SearchTagsAnswer(pb::SearchTagsAnswer { tags: strings(&tags) })
        }
        Q::ChatMembersQuery(c) => {
            let data = admin.search("/api/chat/members", room, &c.search_text).await?;
            let members = data["members"].as_array().into_iter().flatten().map(|m| pb::ChatMember {
                uuid: text(&m["uuid"]).unwrap_or_default(),
                woka_name: text(&m["wokaName"]),
                email: text(&m["email"]),
                chat_id: text(&m["chatId"]),
                tags: strings(&m["tags"]),
            });
            A::ChatMembersAnswer(pb::ChatMembersAnswer {
                total: data["total"].as_i64().unwrap_or(0),
                members: members.collect(),
            })
        }
        Q::SearchMemberQuery(s) => {
            let list = admin.search("/api/members", room, &s.search_text).await?;
            // Only id, name and email go back to the client.
            let members = list.as_array().into_iter().flatten().map(|m| pb::Member {
                visit_card_url: None,
                chat_id: None,
                ..member(m)
            });
            A::SearchMemberAnswer(pb::SearchMemberAnswer { members: members.collect() })
        }
        Q::GetMemberQuery(g) => {
            let m = admin.member(&g.uuid).await.map_err(|_| "User not found, probably left".to_owned())?;
            A::GetMemberAnswer(pb::GetMemberAnswer { member: Some(member(&m)) })
        }
        Q::OauthRefreshTokenQuery(o) => {
            let failed =
                "The token refresh failed. Please try to login again or contact your administrator.".to_owned();
            let r = admin
                .refresh_oauth_token(&o.token_to_refresh, o.provider.as_deref(), o.user_identifier.as_deref())
                .await
                .map_err(|_| failed)?;
            A::OauthRefreshTokenAnswer(pb::OauthRefreshTokenAnswer {
                message: text(&r["message"]).unwrap_or_default(),
                token: text(&r["token"]).unwrap_or_default(),
            })
        }
        Q::IceServersQuery(_) => {
            let list = admin.ice_servers(room, &info.user_uuid).await?;
            let servers = list.as_array().into_iter().flatten().map(|s| pb::IceServer {
                urls: if s["urls"].is_string() {
                    vec![text(&s["urls"]).unwrap_or_default()]
                } else {
                    strings(&s["urls"])
                },
                username: text(&s["username"]),
                credential: text(&s["credential"]),
                credential_type: text(&s["credentialType"]),
            });
            A::IceServersAnswer(pb::IceServersAnswer { ice_servers: servers.collect() })
        }
        _ => return Err("Not an admin query".into()),
    })
}
