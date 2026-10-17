//! Wire encoding: frames, batches, envelopes, and the translation between core types and protobuf.
//!
//! A message for many recipients is encoded once. A batch is built by concatenating pre-encoded payload
//! entries, and the nonce envelope by prefixing a few bytes: per recipient, only memcpy is left.

use bytes::{BufMut, Bytes, BytesMut};
use prost::Message;
use prost::encoding::{WireType, encode_key, encode_varint, encoded_len_varint};
use wa_core::geometry::{Direction, Position, Viewport};
use wa_core::room::{Group, User};
use wa_core::space::SpaceUser;
use wa_core::user::{Availability, DetailsChange, PlayerVariable, Say, Texture};
use wa_proto::messages as pb;

use crate::outbox::Frame;

// ------------------------------------------------------------------ frames

/// A `SubMessage` as a `BatchMessage.payload` entry (field 2): tag, length, body.
pub fn sub(message: pb::sub_message::Message) -> Frame {
    let sub = pb::SubMessage { message: Some(message) };
    let len = sub.encoded_len();
    let mut buf = BytesMut::with_capacity(1 + encoded_len_varint(len as u64) + len);
    encode_key(2, WireType::LengthDelimited, &mut buf);
    encode_varint(len as u64, &mut buf);
    sub.encode_raw(&mut buf);
    Frame::Sub(buf.freeze())
}

/// A top-level `ServerToClientMessage`.
pub fn direct(message: pb::server_to_client_message::Message) -> Frame {
    Frame::Direct(pb::ServerToClientMessage { message: Some(message) }.encode_to_vec().into())
}

pub fn answer(id: i32, answer: pb::answer_message::Answer) -> Frame {
    direct(pb::server_to_client_message::Message::AnswerMessage(pb::AnswerMessage { id, answer: Some(answer) }))
}

pub fn answer_error(id: i32, message: impl Into<String>) -> Frame {
    answer(id, pb::answer_message::Answer::Error(pb::ErrorMessage { message: message.into() }))
}

/// `ServerToClientMessage{batchMessage{event: "", payload}}` from pre-encoded payload entries.
pub fn batch_body(entries: &[Bytes]) -> Bytes {
    let batch_len: usize = entries.iter().map(Bytes::len).sum();
    let mut buf = BytesMut::with_capacity(batch_len + 6);
    encode_key(1, WireType::LengthDelimited, &mut buf);
    encode_varint(batch_len as u64, &mut buf);
    for e in entries {
        buf.put_slice(e);
    }
    buf.freeze()
}

/// `PusherToFrontWebSocketMessage{nonce, message}` around an encoded `ServerToClientMessage`.
pub fn envelope(nonce: u32, server_to_client: &[u8]) -> Bytes {
    let mut buf = BytesMut::with_capacity(server_to_client.len() + 12);
    encode_key(1, WireType::Varint, &mut buf);
    encode_varint(u64::from(nonce), &mut buf);
    encode_key(2, WireType::LengthDelimited, &mut buf);
    encode_varint(server_to_client.len() as u64, &mut buf);
    buf.put_slice(server_to_client);
    buf.freeze()
}

pub fn ping_entry() -> Bytes {
    match sub(pb::sub_message::Message::PingMessage(pb::PingMessage {})) {
        Frame::Sub(b) => b,
        Frame::Direct(_) => unreachable!("sub() builds a Sub"),
    }
}

// ------------------------------------------------------------------ core <-> protobuf

pub fn position_from(p: &pb::PositionMessage) -> Position {
    use pb::position_message::Direction as D;
    Position {
        x: p.x,
        y: p.y,
        direction: match D::try_from(p.direction).unwrap_or(D::Down) {
            D::Up => Direction::Up,
            D::Right => Direction::Right,
            D::Down => Direction::Down,
            D::Left => Direction::Left,
        },
        moving: p.moving,
    }
}

pub fn position_to(p: &Position) -> pb::PositionMessage {
    use pb::position_message::Direction as D;
    pb::PositionMessage {
        x: p.x,
        y: p.y,
        direction: match p.direction {
            Direction::Up => D::Up,
            Direction::Right => D::Right,
            Direction::Down => D::Down,
            Direction::Left => D::Left,
        } as i32,
        moving: p.moving,
    }
}

pub fn viewport_from(v: &pb::ViewportMessage) -> Viewport {
    Viewport { left: v.left, top: v.top, right: v.right, bottom: v.bottom }
}

pub fn textures_to(textures: &[Texture]) -> Vec<pb::CharacterTextureMessage> {
    textures.iter().map(|t| pb::CharacterTextureMessage { url: t.url.clone(), id: t.id.clone() }).collect()
}

fn say_to(s: &Say) -> pb::SayMessage {
    pb::SayMessage { message: s.message.clone(), r#type: s.kind }
}

pub fn user_joined(u: &User) -> pb::sub_message::Message {
    pb::sub_message::Message::UserJoinedMessage(pb::UserJoinedMessage {
        user_id: u.id,
        name: u.profile.name.clone(),
        character_textures: textures_to(&u.profile.textures),
        position: Some(position_to(&u.position)),
        companion_texture: u
            .profile
            .companion
            .as_ref()
            .map(|c| pb::CompanionTextureMessage { url: c.url.clone(), id: c.id.clone() }),
        visit_card_url: u.profile.visit_card_url.clone().unwrap_or_default(),
        user_uuid: u.profile.uuid.clone(),
        outline_color: u.appearance.outline_color.unwrap_or(0),
        has_outline: u.appearance.outline_color.is_some(),
        availability_status: u.appearance.availability.0,
        variables: u.appearance.variables.clone().into_iter().collect(),
        chat_id: u.appearance.chat_id.clone(),
        say_message: u.appearance.say.as_ref().map(say_to),
    })
}

pub fn user_moved(u: &User) -> pb::sub_message::Message {
    pb::sub_message::Message::UserMovedMessage(pb::UserMovedMessage {
        user_id: u.id,
        position: Some(position_to(&u.position)),
    })
}

pub fn group_update(g: &Group) -> pb::sub_message::Message {
    pb::sub_message::Message::GroupUpdateMessage(pb::GroupUpdateMessage {
        group_id: g.id,
        position: Some(pb::PointMessage { x: g.x.floor() as i32, y: g.y.floor() as i32 }),
        group_size: Some(g.users.len() as u32),
        locked: Some(g.locked),
        user_ids: g.users.clone(),
    })
}

pub fn details_from(d: &pb::SetPlayerDetailsMessage) -> DetailsChange {
    DetailsChange {
        outline_color: d.outline_color,
        remove_outline_color: d.remove_outline_color,
        show_voice_indicator: d.show_voice_indicator,
        availability: Availability(d.availability_status),
        variable: d.set_variable.as_ref().map(|v| PlayerVariable {
            name: v.name.clone(),
            value: v.value.clone(),
            public: v.public,
            persist: v.persist,
            ttl: v.ttl,
            scope: v.scope,
        }),
        chat_id: d.chat_id.clone(),
        say: d.say_message.as_ref().map(|s| Say { message: s.message.clone(), kind: s.r#type }),
    }
}

pub fn details_to(d: &DetailsChange) -> pb::SetPlayerDetailsMessage {
    pb::SetPlayerDetailsMessage {
        outline_color: d.outline_color,
        remove_outline_color: d.remove_outline_color,
        show_voice_indicator: d.show_voice_indicator,
        availability_status: d.availability.0,
        set_variable: d.variable.as_ref().map(|v| pb::SetPlayerVariableMessage {
            name: v.name.clone(),
            value: v.value.clone(),
            public: v.public,
            persist: v.persist,
            ttl: v.ttl,
            scope: v.scope,
        }),
        chat_id: d.chat_id.clone(),
        say_message: d.say.as_ref().map(say_to),
    }
}

pub fn space_user_to(u: &SpaceUser) -> pb::SpaceUser {
    pb::SpaceUser {
        space_user_id: u.space_user_id.clone(),
        name: u.name.clone(),
        play_uri: u.play_uri.clone(),
        color: u.color.clone(),
        character_textures: textures_to(&u.textures),
        is_logged: u.is_logged,
        availability_status: u.availability.0,
        room_name: u.room_name.clone(),
        visit_card_url: u.visit_card_url.clone(),
        tags: u.tags.clone(),
        camera_state: u.camera_state,
        microphone_state: u.microphone_state,
        screen_sharing_state: u.screen_sharing_state,
        megaphone_state: u.megaphone_state,
        jitsi_participant_id: None,
        uuid: u.uuid.clone(),
        chat_id: u.chat_id.clone(),
        show_voice_indicator: u.show_voice_indicator,
        attendees_state: u.attendees_state,
        cpu_limited: u.cpu_limited,
    }
}

/// The client-updatable fields of a SpaceUser sent by a client.
pub fn space_user_update_from(u: &pb::SpaceUser) -> SpaceUser {
    SpaceUser {
        camera_state: u.camera_state,
        microphone_state: u.microphone_state,
        screen_sharing_state: u.screen_sharing_state,
        megaphone_state: u.megaphone_state,
        attendees_state: u.attendees_state,
        cpu_limited: u.cpu_limited,
        ..SpaceUser::default()
    }
}

/// `Color.getColorByString` of shared-utils: a 32-bit string hash turned into #rrggbb.
pub fn color_of(name: &str) -> String {
    let mut hash: i32 = 0;
    for c in name.encode_utf16() {
        hash = i32::from(c).wrapping_add(hash.wrapping_shl(5)).wrapping_sub(hash);
    }
    let mut color = String::from("#");
    for i in 0..3 {
        let value = (hash >> (i * 8)) & 0xff;
        color.push_str(&format!("{value:02x}"));
    }
    color
}

/// google.protobuf.Value as JSON. Whole numbers come out as integers, as JSON.stringify writes them.
pub fn json_from(v: &prost_types::Value) -> serde_json::Value {
    use prost_types::value::Kind;
    use serde_json::Value as J;
    match &v.kind {
        None | Some(Kind::NullValue(_)) => J::Null,
        Some(Kind::BoolValue(b)) => J::Bool(*b),
        Some(Kind::StringValue(s)) => J::String(s.clone()),
        Some(Kind::NumberValue(n)) if n.fract() == 0.0 && n.abs() < 9e15 => J::from(*n as i64),
        Some(Kind::NumberValue(n)) => serde_json::Number::from_f64(*n).map_or(J::Null, J::Number),
        Some(Kind::ListValue(l)) => J::Array(l.values.iter().map(json_from).collect()),
        Some(Kind::StructValue(s)) => J::Object(s.fields.iter().map(|(k, v)| (k.clone(), json_from(v))).collect()),
    }
}

/// The editor commands that change the WAM; None for those that change files (uploads, custom entities).
/// The other way: JSON to a protobuf Value.
pub fn json_to(v: &serde_json::Value) -> prost_types::Value {
    use prost_types::value::Kind;
    use serde_json::Value as J;
    let kind = match v {
        J::Null => Kind::NullValue(0),
        J::Bool(b) => Kind::BoolValue(*b),
        J::Number(n) => Kind::NumberValue(n.as_f64().unwrap_or(0.0)),
        J::String(s) => Kind::StringValue(s.clone()),
        J::Array(a) => Kind::ListValue(prost_types::ListValue { values: a.iter().map(json_to).collect() }),
        J::Object(o) => {
            Kind::StructValue(prost_types::Struct { fields: o.iter().map(|(k, v)| (k.clone(), json_to(v))).collect() })
        }
    };
    prost_types::Value { kind: Some(kind) }
}

pub fn edit_from(m: &pb::edit_map_message::Message) -> Option<wa_core::wam::Edit> {
    use pb::edit_map_message::Message as M;
    use serde_json::{Map, Value};
    use wa_core::wam::Edit;
    let properties = |p: &[prost_types::Value]| Value::Array(p.iter().map(json_from).collect());
    Some(match m {
        M::CreateAreaMessage(a) => {
            let mut area = Map::new();
            area.insert("id".into(), a.id.clone().into());
            area.insert("x".into(), a.x.into());
            area.insert("y".into(), a.y.into());
            area.insert("width".into(), a.width.into());
            area.insert("height".into(), a.height.into());
            area.insert("name".into(), a.name.clone().into());
            area.insert("properties".into(), properties(&a.properties));
            Edit::CreateArea(area)
        }
        M::ModifyAreaMessage(a) => {
            let mut fields = Map::new();
            if let Some(v) = &a.name {
                fields.insert("name".into(), v.clone().into());
            }
            for (k, v) in [("x", a.x), ("y", a.y)] {
                if let Some(v) = v {
                    fields.insert(k.into(), v.into());
                }
            }
            for (k, v) in [("width", a.width), ("height", a.height)] {
                if let Some(v) = v {
                    fields.insert(k.into(), v.into());
                }
            }
            Edit::ModifyArea {
                id: a.id.clone(),
                fields,
                properties: (a.modify_properties == Some(true)).then(|| a.properties.iter().map(json_from).collect()),
            }
        }
        M::DeleteAreaMessage(a) => Edit::DeleteArea(a.id.clone()),
        M::CreateEntityMessage(e) => {
            let mut entity = Map::new();
            entity.insert(
                "prefabRef".into(),
                serde_json::json!({"id": e.prefab_id, "collectionName": e.collection_name}),
            );
            entity.insert("x".into(), e.x.into());
            entity.insert("y".into(), e.y.into());
            entity.insert("properties".into(), properties(&e.properties));
            if let Some(name) = &e.name {
                entity.insert("name".into(), name.clone().into());
            }
            Edit::CreateEntity { id: e.id.clone(), entity, width: f64::from(e.width), height: f64::from(e.height) }
        }
        M::ModifyEntityMessage(e) => {
            let mut fields = Map::new();
            fields.insert("x".into(), e.x.into());
            fields.insert("y".into(), e.y.into());
            if let Some(name) = &e.name {
                fields.insert("name".into(), name.clone().into());
            }
            Edit::ModifyEntity {
                id: e.id.clone(),
                fields,
                properties: (e.modify_properties == Some(true)).then(|| e.properties.iter().map(json_from).collect()),
                width: f64::from(e.width),
                height: f64::from(e.height),
            }
        }
        M::DeleteEntityMessage(e) => Edit::DeleteEntity(e.id.clone()),
        M::DeleteCustomEntityMessage(e) => Edit::DeleteCustomEntity(e.id.clone()),
        M::ModifiyWamMetadataMessage(m) => {
            let mut fields = Map::new();
            fields.insert("name".into(), m.name.clone().into());
            for (k, v) in [("description", &m.description), ("thumbnail", &m.thumbnail), ("copyright", &m.copyright)] {
                fields.insert(k.into(), v.clone().map_or(Value::Null, Value::String));
            }
            let tags = m.tags.as_deref().filter(|t| !t.is_empty()).map(|t| t.split(',').map(str::to_owned).collect());
            Edit::Metadata { fields, tags: tags.unwrap_or_default() }
        }
        M::UpdateWamSettingsMessage(s) => {
            use pb::update_wam_settings_message::Message as S;
            match s.message.as_ref()? {
                S::UpdateMegaphoneSettingMessage(m) => {
                    Edit::Settings { key: "megaphone", value: m.settings.as_ref().map(json_from) }
                }
                S::UpdateRecordingSettingMessage(m) => {
                    Edit::Settings { key: "recording", value: m.settings.as_ref().map(json_from) }
                }
            }
        }
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_hand_built_batch_decodes_like_a_prost_one() {
        let entries: Vec<Bytes> = [1, 2]
            .into_iter()
            .map(|id| match sub(pb::sub_message::Message::UserLeftMessage(pb::UserLeftMessage { user_id: id })) {
                Frame::Sub(b) => b,
                Frame::Direct(_) => unreachable!(),
            })
            .collect();
        let frame = envelope(7, &batch_body(&entries));
        let decoded = pb::PusherToFrontWebSocketMessage::decode(frame).unwrap();
        assert_eq!(decoded.nonce, 7);
        let Some(pb::server_to_client_message::Message::BatchMessage(batch)) = decoded.message.unwrap().message else {
            panic!("not a batch")
        };
        assert_eq!(batch.event, "");
        assert_eq!(batch.payload.len(), 2);
        assert_eq!(
            batch.payload[1].message,
            Some(pb::sub_message::Message::UserLeftMessage(pb::UserLeftMessage { user_id: 2 }))
        );
    }

    #[test]
    fn colors_match_the_typescript_hash() {
        // Values computed with libs/shared-utils/src/String/color.ts.
        assert_eq!(color_of(""), "#000000");
        assert_eq!(color_of("a"), "#610000");
        assert_eq!(color_of("Alice"), "#60a6c6");
        assert_eq!(color_of("a very long name with ünicode é 🚀 and more and more and more"), "#0a2033");
    }
}
