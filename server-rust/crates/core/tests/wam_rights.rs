//! Map editor scenarios with map-storage's rights: restricted areas, personal areas, entities, deletions.
//! Each one is a sequence of commands, then what the file holds.

use serde_json::{Map, Value, json};
use wa_core::wam::{Edit, Editor, Wam};

fn obj(v: Value) -> Map<String, Value> {
    v.as_object().unwrap().clone()
}

fn doc(w: &Wam) -> Value {
    serde_json::from_slice(&w.to_json()).unwrap()
}

const ADMIN: Editor<'static> = Editor { uuid: "admin", tags: &[], can_edit: true };

/// A restricted area (writeTags: "builder") at (0,0)-(200,200), a free personal desk at (500,0)-(600,100), and
/// a desk owned by "bob" at (700,0)-(800,100).
fn office() -> Wam {
    let v = json!({"version": "2.1.0", "mapUrl": "./a.tmj", "entities": {}, "areas": [
        {"id": "workshop", "x": 0, "y": 0, "width": 200, "height": 200, "name": "", "visible": true,
         "properties": [{"id": "r", "type": "restrictedRightsPropertyData", "writeTags": ["builder"], "readTags": []}]},
        {"id": "desk", "x": 500, "y": 0, "width": 100, "height": 100, "name": "", "visible": true,
         "properties": [{"id": "pa", "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "allowedTags": [], "ownerId": null}]},
        {"id": "bob-desk", "x": 700, "y": 0, "width": 100, "height": 100, "name": "", "visible": true,
         "properties": [{"id": "pb", "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "allowedTags": [], "ownerId": "bob"}]}
    ]});
    Wam::parse(v.to_string().as_bytes()).unwrap()
}

fn place(id: &str, x: f64, y: f64) -> Edit {
    Edit::CreateEntity {
        id: id.into(),
        entity: obj(json!({"prefabRef": {"id": "chair", "collectionName": "basic"}, "x": x, "y": y, "properties": []})),
    }
}

fn claim(area: &str, prop: &str, owner: Option<&str>, x: f64) -> Edit {
    Edit::ModifyArea {
        id: area.into(),
        fields: obj(json!({"x": x})),
        properties: Some(vec![
            json!({"id": prop, "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "allowedTags": [], "ownerId": owner}),
        ]),
    }
}

#[test]
fn a_member_with_the_write_tag_builds_inside_the_restricted_area_only() {
    let mut w = office();
    let builder_tags = ["builder".to_owned()];
    let builder = Editor { uuid: "carl", tags: &builder_tags, can_edit: false };
    let visitor = Editor { uuid: "vera", tags: &[], can_edit: false };

    w.apply("c1", place("in", 50.0, 50.0), builder).unwrap();
    // Rights are at the top-left corner (the size the client sends cannot be trusted): one sticking out on the
    // right is in; one up and left of the area is out, and nothing changes.
    w.apply("c2", place("edge", 180.0, 50.0), builder).unwrap();
    assert!(w.apply("c3", place("out", -10.0, 50.0), builder).is_err());
    // Without the tag, not even inside.
    assert!(w.apply("c4", place("v", 60.0, 60.0), visitor).is_err());
    // An editor places anything anywhere.
    w.apply("c5", place("anywhere", 300.0, 300.0), ADMIN).unwrap();
    let entities = doc(&w)["entities"].as_object().unwrap().keys().cloned().collect::<Vec<_>>();
    assert_eq!(entities, ["anywhere", "edge", "in"]);
    assert_eq!(w.last_command_id(), Some("c5"));

    // Moving it out of the area is refused; within, it moves.
    let moved = |x: f64| Edit::ModifyEntity { id: "in".into(), fields: obj(json!({"x": x})), properties: None };
    assert!(w.apply("c6", moved(400.0), builder).is_err());
    w.apply("c7", moved(80.0), builder).unwrap();
    assert_eq!(doc(&w)["entities"]["in"]["x"], 80.0);
    // Deleting: the visitor may not (intentional gap: map-storage lets anyone delete any entity), the builder may.
    assert!(w.apply("c8", Edit::DeleteEntity("in".into()), visitor).is_err());
    w.apply("c9", Edit::DeleteEntity("in".into()), builder).unwrap();
    assert!(doc(&w)["entities"].get("in").is_none());
}

#[test]
fn a_free_personal_desk_is_claimed_given_back_and_built_on_by_its_owner_only() {
    let mut w = office();
    let alice = Editor { uuid: "alice", tags: &[], can_edit: false };
    let eve = Editor { uuid: "eve", tags: &[], can_edit: false };
    let owner = |w: &Wam, i: usize| doc(w)["areas"][i]["properties"][0]["ownerId"].clone();

    // A claim that also moves the desk is not a claim.
    assert!(w.apply("c1", claim("desk", "pa", Some("alice"), 510.0), alice).is_err());
    w.apply("c2", claim("desk", "pa", Some("alice"), 500.0), alice).unwrap();
    assert_eq!(owner(&w, 1), "alice");
    // Taken: Eve can neither take it nor free it; nobody takes Bob's.
    assert!(w.apply("c3", claim("desk", "pa", Some("eve"), 500.0), eve).is_err());
    assert!(w.apply("c4", claim("desk", "pa", None, 500.0), eve).is_err());
    assert!(w.apply("c5", claim("bob-desk", "pb", Some("eve"), 700.0), eve).is_err());

    // The owner builds on her desk, not on Bob's.
    w.apply("c6", place("lamp", 550.0, 50.0), alice).unwrap();
    assert!(w.apply("c7", place("lamp2", 750.0, 50.0), alice).is_err());
    assert!(w.apply("c8", place("lamp3", 550.0, 60.0), eve).is_err());

    // She gives it back; then Eve may take it.
    w.apply("c9", claim("desk", "pa", None, 500.0), alice).unwrap();
    assert_eq!(owner(&w, 1), Value::Null);
    w.apply("c10", claim("desk", "pa", Some("eve"), 500.0), eve).unwrap();
    assert_eq!(owner(&w, 1), "eve");
}

#[test]
fn deleting_an_area_or_unlinking_a_file_names_the_private_files_to_remove() {
    let mut w = office();
    let file = |link: &str| json!({"id": "f", "type": "openFile", "link": link, "name": "doc.pdf", "newTab": false});
    let area = obj(
        json!({"id": "library", "x": 0, "y": 300, "width": 50, "height": 50, "name": "", "properties": [file("http://maps/private/files/doc-f.pdf")]}),
    );
    w.apply("c1", Edit::CreateArea(area), ADMIN).unwrap();
    // The link goes (upload closed): the file is to remove.
    let unlinked = json!({"id": "f", "type": "openFile", "link": "", "name": "", "newTab": false});
    let applied = w
        .apply(
            "c2",
            Edit::ModifyArea { id: "library".into(), fields: Map::new(), properties: Some(vec![unlinked]) },
            ADMIN,
        )
        .unwrap();
    assert_eq!(applied.dropped_files, ["http://maps/private/files/doc-f.pdf"]);

    // Deleting the area: the non-editor is refused, the editor's command names its files.
    w.apply(
        "c3",
        Edit::ModifyArea {
            id: "library".into(),
            fields: Map::new(),
            properties: Some(vec![file("http://maps/private/files/b-f.pdf")]),
        },
        ADMIN,
    )
    .unwrap();
    let alice = Editor { uuid: "alice", tags: &[], can_edit: false };
    assert!(w.apply("c4", Edit::DeleteArea("library".into()), alice).is_err());
    let applied = w.apply("c5", Edit::DeleteArea("library".into()), ADMIN).unwrap();
    assert_eq!(applied.dropped_files, ["http://maps/private/files/b-f.pdf"]);
    assert!(doc(&w)["areas"].as_array().unwrap().iter().all(|a| a["id"] != "library"));
}

#[test]
fn a_deleted_custom_entity_takes_its_placed_copies_with_it() {
    let mut w = office();
    let custom = |id: &str, prefab: &str| Edit::CreateEntity {
        id: id.into(),
        entity: obj(
            json!({"prefabRef": {"id": prefab, "collectionName": "custom entities"}, "x": 300, "y": 300, "properties": []}),
        ),
    };
    w.apply("c1", custom("a", "statue"), ADMIN).unwrap();
    w.apply("c2", custom("b", "statue"), ADMIN).unwrap();
    w.apply("c3", custom("c", "fountain"), ADMIN).unwrap();
    w.apply("c4", Edit::DeleteCustomEntity("statue".into()), ADMIN).unwrap();
    let left = doc(&w)["entities"].as_object().unwrap().keys().cloned().collect::<Vec<_>>();
    assert_eq!(left, ["c"]);
}

#[test]
fn a_command_that_breaks_the_file_is_refused_and_changes_nothing() {
    let mut w = office();
    let before = doc(&w);
    let broken = Edit::ModifyArea { id: "workshop".into(), fields: obj(json!({"width": "wide"})), properties: None };
    let refused = w.apply("c1", broken, ADMIN).unwrap_err();
    assert!(refused.contains("must be a number"), "{refused}");
    assert_eq!(doc(&w), before);
    assert_eq!(w.last_command_id(), None);
}

#[test]
fn a_zone_editor_neither_pulls_an_entity_into_their_zone_nor_edits_one_outside_it() {
    let mut w = office();
    let builder_tags = ["builder".to_owned()];
    let builder = Editor { uuid: "carl", tags: &builder_tags, can_edit: false };
    w.apply("c1", place("statue", 300.0, 300.0), ADMIN).unwrap();
    let before = doc(&w);
    let modify = |fields: Value| Edit::ModifyEntity { id: "statue".into(), fields: obj(fields), properties: None };

    // Into the zone, or renamed where it stands: refused, the file unchanged.
    assert!(w.apply("c2", modify(json!({"x": 50, "y": 50})), builder).is_err());
    assert!(w.apply("c3", modify(json!({"x": 300, "y": 300, "name": "mine"})), builder).is_err());
    assert_eq!(doc(&w), before);
    // Nor deleted.
    assert!(w.apply("c4", Edit::DeleteEntity("statue".into()), builder).is_err());
    assert_eq!(doc(&w), before);
}

#[test]
fn only_someone_who_edits_somewhere_may_upload() {
    let w = office();
    let builder_tags = ["builder".to_owned()];
    assert!(w.has_editor_access(ADMIN));
    assert!(w.has_editor_access(Editor { uuid: "carl", tags: &builder_tags, can_edit: false }));
    // Bob owns a desk.
    assert!(w.has_editor_access(Editor { uuid: "bob", tags: &[], can_edit: false }));
    assert!(!w.has_editor_access(Editor { uuid: "vera", tags: &[], can_edit: false }));
}
