//! The WAM document: migrations on load, the area and settings commands, the catch-up history.

use serde_json::{Map, Value, json};
use wa_core::wam::{Edit, Editor, History, Wam};

fn obj(v: Value) -> Map<String, Value> {
    v.as_object().unwrap().clone()
}

fn wam(v: Value) -> Wam {
    Wam::parse(v.to_string().as_bytes()).unwrap()
}

const ADMIN: Editor<'static> = Editor { uuid: "admin", tags: &[], can_edit: true };
const GUEST: Editor<'static> = Editor { uuid: "guest", tags: &[], can_edit: false };

fn doc(w: &Wam) -> Value {
    serde_json::from_slice(&w.to_json()).unwrap()
}

#[test]
fn an_old_file_is_migrated_like_map_storage_does() {
    let w = wam(json!({
        "version": "1.0.0", "mapUrl": "./a.tmj", "entities": {},
        "areas": [
            {"id": "a", "properties": [{"id": "p", "type": "livekitRoomProperty"}]},
            {"id": "b", "properties": [{"id": "j", "type": "jitsiRoomProperty", "jitsiRoomConfig": {"jitsiRoomAdminTag": "mod"}}]},
            {"id": "c", "properties": [{"id": "x", "type": "highlight"}]},
        ],
    }));
    let d = doc(&w);
    assert_eq!(d["version"], "2.1.0");
    assert_eq!(d["areas"][0]["properties"][1], json!({"id": "p-lock", "type": "lockableAreaPropertyData"}));
    assert_eq!(d["areas"][1]["properties"][0]["jitsiRoomAdminTag"], "mod");
    assert!(d["areas"][1]["properties"][0]["jitsiRoomConfig"].get("jitsiRoomAdminTag").is_none());
    assert_eq!(d["areas"][2]["properties"].as_array().unwrap().len(), 1);
    assert!(Wam::parse(b"[1]").is_none());
}

#[test]
fn areas_are_created_once_and_modified_in_place() {
    let mut w = wam(json!({"version": "2.1.0", "mapUrl": "./a.tmj", "areas": [], "entities": {}, "custom": 1}));
    let area = obj(json!({"id": "a", "x": 32, "y": 64, "width": 10, "height": 20, "name": "", "properties": []}));
    w.apply("c1", Edit::CreateArea(area.clone()), ADMIN).unwrap();
    assert!(w.apply("c2", Edit::CreateArea(area.clone()), ADMIN).is_err());
    assert_eq!(w.last_command_id(), Some("c1"));
    assert_eq!(w.areas()[0]["visible"], true);

    let props = vec![
        json!({"id": "p", "type": "livekitRoomProperty", "serverData": {}}),
        json!({"id": "q", "type": "highlight"}),
    ];
    let modify = |name: Option<&str>, properties: Option<Vec<Value>>| Edit::ModifyArea {
        id: "a".into(),
        fields: name.map(|n| obj(json!({"name": n}))).unwrap_or_default(),
        properties,
    };
    w.apply("c3", modify(Some("Room"), Some(props)), ADMIN).unwrap();
    assert_eq!(w.areas()[0]["name"], "Room");
    assert_eq!(w.areas()[0]["x"], 32);
    assert_eq!(w.areas()[0]["properties"][1]["type"], "highlight");

    // Without modifyProperties the list stays; server data the client did not send stays too.
    w.apply("c4", modify(Some("Hall"), None), ADMIN).unwrap();
    assert_eq!(w.areas()[0]["properties"].as_array().unwrap().len(), 2);
    let mut stored = doc(&w);
    stored["areas"][0]["properties"][0]["serverData"] = json!({"room": "r1"});
    let mut w = wam(stored);
    w.apply("c5", modify(None, Some(vec![json!({"id": "p", "type": "livekitRoomProperty"})])), ADMIN)
        .unwrap();
    assert_eq!(w.areas()[0]["properties"][0]["serverData"], json!({"room": "r1"}));

    // An unknown area is not an error; fields this server does not know survive.
    w.apply("c6", Edit::ModifyArea { id: "zz".into(), fields: Map::new(), properties: None }, ADMIN).unwrap();
    assert_eq!(doc(&w)["custom"], 1);
}

#[test]
fn editing_needs_the_right_and_a_refusal_changes_nothing() {
    let mut w = wam(json!({"version": "2.1.0", "mapUrl": "./a.tmj", "areas": [], "entities": {}}));
    let before = w.to_json();
    let area = obj(json!({"id": "a", "x": 0, "y": 0, "width": 1, "height": 1, "name": "", "properties": []}));
    assert!(w.apply("c1", Edit::CreateArea(area), GUEST).is_err());
    assert_eq!(w.to_json(), before);
}

#[test]
fn megaphone_settings_are_set_and_cleared() {
    let mut w = wam(json!({"version": "2.1.0", "mapUrl": "./a.tmj", "areas": [], "entities": {}}));
    let on = Edit::Settings { key: "megaphone", value: Some(json!({"enabled": true, "title": "Live", "scope": "WORLD"})) };
    w.apply("c1", on, ADMIN).unwrap();
    assert_eq!(w.settings().unwrap()["megaphone"]["title"], "Live");
    assert!(w.apply("c2", Edit::Settings { key: "megaphone", value: Some(json!("x")) }, ADMIN).is_err());
    w.apply("c3", Edit::Settings { key: "megaphone", value: None }, ADMIN).unwrap();
    assert!(w.settings().unwrap().get("megaphone").is_none());
}

#[test]
fn a_fresh_file_takes_its_metadata_from_the_map() {
    let tmj = json!({"properties": [
        {"name": "mapName", "type": "string", "value": "Office"},
        {"name": "mapImage", "type": "int", "value": 3},
    ]});
    let d = doc(&Wam::fresh("./office.tmj", tmj.to_string().as_bytes()));
    assert_eq!(d["mapUrl"], "./office.tmj");
    assert_eq!(d["version"], "2.1.0");
    assert_eq!(d["metadata"], json!({"name": "Office"}));
    assert_eq!(d["areas"], json!([]));
}

#[test]
fn a_late_client_gets_the_commands_its_file_misses() {
    let mut h = History::default();
    for (i, id) in ["a", "b", "c"].into_iter().enumerate() {
        h.push(1_000 * i as u64, id.to_owned(), id);
    }
    assert_eq!(h.after(Some("c"), Some("c")), Vec::<&&str>::new());
    assert_eq!(h.after(Some("a"), Some("c")), vec![&"b", &"c"]);
    assert_eq!(h.after(Some("gone"), Some("c")), vec![&"a", &"b", &"c"]);
    assert_eq!(h.after(None, Some("c")).len(), 3);
    // Older than 30 s: forgotten.
    h.push(40_000, "d".into(), "d");
    assert_eq!(h.after(None, Some("d")), vec![&"d"]);
}
