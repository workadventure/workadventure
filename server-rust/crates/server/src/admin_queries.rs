//! The queries the pusher answers from the admin (SocketManager.handle*Query), when ADMIN_API_URL is set.

use wa_proto::messages as pb;

use crate::admin_api::AdminApi;
use crate::admin_types::{MemberData, WorldChatMembersData};
use crate::session::SessionInfo;

use pb::answer_message::Answer as A;
use pb::query_message::Query as Q;

fn member(m: MemberData) -> pb::Member {
    pb::Member { id: m.id, name: m.name, email: m.email, visit_card_url: m.visit_card_url, chat_id: m.chat_id }
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
            let rooms = list.into_iter().map(|r| pb::RoomShortDescription {
                name: r.name.unwrap_or_default(),
                room_url: r.room_url,
                // Not in the contract's schema: zod drops it, as here.
                wam_url: None,
                description: r.description,
                copyright: r.copyright,
                thumbnail: r.thumbnail,
                areas_searchable: r.areas_searchable.map(|n| n as i32),
                entities_searchable: r.entities_searchable.map(|n| n as i32),
            });
            A::RoomsFromSameWorldAnswer(pb::RoomsFromSameWorldAnswer { room_descriptions: rooms.collect() })
        }
        Q::RoomTagsQuery(_) => A::RoomTagsAnswer(pb::RoomTagsAnswer { tags: admin.room_tags(room).await }),
        Q::SearchTagsQuery(s) => {
            let tags: Vec<String> = admin.search("/api/world/tags", room, &s.search_text).await?;
            A::SearchTagsAnswer(pb::SearchTagsAnswer { tags })
        }
        Q::ChatMembersQuery(c) => {
            let data: WorldChatMembersData = admin.search("/api/chat/members", room, &c.search_text).await?;
            let members = data.members.into_iter().map(|m| pb::ChatMember {
                uuid: m.uuid,
                woka_name: m.woka_name,
                email: m.email,
                chat_id: m.chat_id,
                tags: m.tags,
            });
            A::ChatMembersAnswer(pb::ChatMembersAnswer { total: data.total as i64, members: members.collect() })
        }
        Q::SearchMemberQuery(s) => {
            let list: Vec<MemberData> = admin.search("/api/members", room, &s.search_text).await?;
            // Only id, name and email go back to the client.
            let members = list.into_iter().map(|m| pb::Member { visit_card_url: None, chat_id: None, ..member(m) });
            A::SearchMemberAnswer(pb::SearchMemberAnswer { members: members.collect() })
        }
        Q::GetMemberQuery(g) => {
            let m = admin.member(&g.uuid).await.map_err(|_| "User not found, probably left".to_owned())?;
            A::GetMemberAnswer(pb::GetMemberAnswer { member: Some(member(m)) })
        }
        Q::OauthRefreshTokenQuery(o) => {
            let failed =
                "The token refresh failed. Please try to login again or contact your administrator.".to_owned();
            let r = admin
                .refresh_oauth_token(&o.token_to_refresh, o.provider.as_deref(), o.user_identifier.as_deref())
                .await
                .map_err(|_| failed)?;
            A::OauthRefreshTokenAnswer(pb::OauthRefreshTokenAnswer { message: r.message, token: r.token })
        }
        Q::IceServersQuery(_) => {
            let list = admin.ice_servers(room, &info.user_uuid).await?;
            let servers = list.into_iter().map(|s| pb::IceServer {
                urls: s.urls,
                username: s.username,
                credential: s.credential,
                credential_type: s.credential_type.map(|t| t.to_string()),
            });
            A::IceServersAnswer(pb::IceServersAnswer { ice_servers: servers.collect() })
        }
        _ => return Err("Not an admin query".into()),
    })
}
