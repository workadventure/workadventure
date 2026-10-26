//! A map's WAM file and the map editor commands that change it: map-storage's MapsManager with the
//! CreateArea, UpdateArea and UpdateWAMSetting commands of libs/map-editor.
//!
//! The document stays JSON: every field the editor writes is kept, including those this server knows nothing
//! about. Only the area and settings commands the editor's zones need are applied (J2); the others are refused.

use std::collections::VecDeque;

use serde_json::{Map, Value, json};

/// WamFileMigration.getLatestVersion().
pub const LATEST_VERSION: &str = "2.1.0";
/// How long map-storage keeps a command for clients that loaded the file just before it.
pub const HISTORY_MS: u64 = 30_000;

#[derive(Debug, Clone, PartialEq)]
pub enum Edit {
    /// createAreaMessage: id, x, y, width, height, name, properties.
    CreateArea(Map<String, Value>),
    /// modifyAreaMessage: the fields to set, and the whole new property list when `modifyProperties` is set.
    ModifyArea {
        id: String,
        fields: Map<String, Value>,
        properties: Option<Vec<Value>>,
    },
    DeleteArea(String),
    /// createEntityMessage: the stored entity (prefabRef, x, y, properties, name). The size the client sends is
    /// not kept: the rights are checked at the top-left corner, the only point of an entity the file knows.
    CreateEntity {
        id: String,
        entity: Map<String, Value>,
    },
    /// modifyEntityMessage: fields merged into the entity, properties replaced when `modifyProperties` is set.
    ModifyEntity {
        id: String,
        fields: Map<String, Value>,
        properties: Option<Vec<Value>>,
    },
    DeleteEntity(String),
    /// deleteCustomEntityMessage: the entities made from that prefab go (the caller checks the owner).
    DeleteCustomEntity(String),
    /// updateWAMSettingsMessage: the block to store under `settings`, or None to clear it.
    Settings {
        key: &'static str,
        value: Option<Value>,
    },
    /// modifiyWAMMetadataMessage: `metadata` fields (Null removes one) and the vendor tags.
    Metadata {
        fields: Map<String, Value>,
        tags: Vec<String>,
    },
}

/// Who sends a command, with the rights map-storage receives along with it.
#[derive(Debug, Clone, Copy)]
pub struct Editor<'a> {
    pub uuid: &'a str,
    pub tags: &'a [String],
    pub can_edit: bool,
}

/// What a command did besides the WAM: the links of the private files it dropped (FileModule's hooks).
#[derive(Debug, Default, PartialEq)]
pub struct Applied {
    pub dropped_files: Vec<String>,
}

/// CustomFileService.getFilePath: where the file `name` of an openFile property is stored, under the map's world
/// folder. The property id comes from the client (a front-generated UUID): a separator in it would let the path
/// climb out of the world's folder, into another world's files.
pub fn uploaded_file_path(name: &str, property_id: &str) -> Result<String, String> {
    if property_id.contains(['/', '\\']) {
        return Err(format!("Invalid property id: {property_id}"));
    }
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name);
    let accepted = |ext: &str| {
        ["pdf", "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].contains(&ext.to_ascii_lowercase().as_str())
    };
    match base.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() && accepted(ext) => {
            Ok(format!("private/files/{stem}-{property_id}.{ext}"))
        }
        _ => Err(format!("Unsupported file \"{name}\"")),
    }
}

/// The links of a property list's files (openFile properties with a link), by property id.
fn file_links(props: &[Value]) -> Vec<(&str, &str)> {
    props
        .iter()
        .filter(|p| p["type"] == "openFile")
        .filter_map(|p| Some((p["id"].as_str()?, p["link"].as_str().filter(|l| !l.is_empty())?)))
        .collect()
}

/// Files the new property list no longer links: the property is gone, or its upload was closed.
fn dropped(old: &[Value], new: &[Value]) -> Vec<String> {
    file_links(old)
        .into_iter()
        .filter(|(id, _)| {
            new.iter().find(|p| p["id"] == *id).is_none_or(|p| {
                p["link"].as_str().is_none_or(str::is_empty) && p["name"].as_str().is_none_or(str::is_empty)
            })
        })
        .map(|(_, link)| link.to_owned())
        .collect()
}

fn props(v: &Value) -> &[Value] {
    v["properties"].as_array().map_or(&[], Vec::as_slice)
}

fn num(v: &Value) -> f64 {
    v.as_f64().unwrap_or(0.0)
}

/// MathUtils.isOverlappingWithRectangle: bounds included.
fn inside(x: f64, y: f64, area: &Value) -> bool {
    let (ax, ay) = (num(&area["x"]), num(&area["y"]));
    (ax..=ax + num(&area["width"])).contains(&x) && (ay..=ay + num(&area["height"])).contains(&y)
}

/// The area gives the editor write access: its write tags, or it is their personal area.
fn writes(area: &Value, editor: Editor<'_>) -> bool {
    props(area).iter().any(|p| {
        (p["type"] == "restrictedRightsPropertyData"
            && p["writeTags"].as_array().is_some_and(|t| t.iter().any(|t| editor.tags.iter().any(|u| t == u))))
            || (p["type"] == "personalAreaPropertyData" && p["ownerId"] == editor.uuid)
    })
}

/// `isModifyAreaMessageOnlyClaim`: someone who may not edit can still take a free personal area, or give
/// back their own, and change nothing else.
fn is_claim(area: &Value, fields: &Map<String, Value>, properties: Option<&[Value]>, uuid: &str) -> bool {
    let personal = |list: &[Value]| list.iter().find(|p| p["type"] == "personalAreaPropertyData").cloned();
    let owner = |p: &Value| p["ownerId"].as_str().map(str::to_owned);
    let Some(existing) = personal(props(area)) else { return false };
    let before = owner(&existing);
    if before.as_deref().is_some_and(|o| o != uuid) {
        return false;
    }
    let Some(new_props) = properties else { return false };
    let Some(new_personal) = personal(new_props) else { return false };
    let after = owner(&new_personal);
    let claim = before.is_none() && after.as_deref() == Some(uuid);
    let revoke = before.as_deref() == Some(uuid) && after.is_none();
    if !claim && !revoke {
        return false;
    }
    if ["x", "y", "width", "height"].iter().any(|k| fields.get(*k).is_some_and(|v| num(v) != num(&area[*k]))) {
        return false;
    }
    let old = props(area);
    if new_props.len() != old.len() {
        return false;
    }
    let without_owner = |p: &Value| {
        let mut p = p.clone();
        if let Some(m) = p.as_object_mut() {
            m.remove("ownerId");
        }
        p
    };
    old.iter().all(|o| {
        new_props.iter().find(|n| n["id"] == o["id"]).is_some_and(|n| {
            n["type"] == o["type"]
                && if o["type"] == "personalAreaPropertyData" { without_owner(n) == without_owner(o) } else { n == o }
        })
    })
}

#[derive(Debug, Clone)]
pub struct Wam {
    doc: Map<String, Value>,
}

impl Wam {
    /// Reads a file as map-storage loads it: migrated to the latest version.
    pub fn parse(bytes: &[u8]) -> Option<Wam> {
        let Ok(Value::Object(doc)) = serde_json::from_slice(bytes) else { return None };
        let mut wam = Wam { doc };
        wam.migrate();
        Some(wam)
    }

    /// getFreshWAMFileContent from WAM_TEMPLATE_URL's file: the template, migrated, with the map's URL and
    /// metadata. None if the template is not a WAM file.
    pub fn fresh_from_template(template: &[u8], map_url: &str, tmj: &[u8]) -> Option<Wam> {
        let mut wam = Wam::parse(template)?;
        wam.check().ok()?;
        let fresh = Wam::fresh(map_url, tmj);
        for key in ["mapUrl", "metadata"] {
            wam.doc.insert(key.into(), fresh.doc[key].clone());
        }
        Some(wam)
    }

    /// The file map-storage creates for an uploaded map that has none (getFreshWAMFileContent).
    pub fn fresh(map_url: &str, tmj: &[u8]) -> Wam {
        let tmj: Value = serde_json::from_slice(tmj).unwrap_or(Value::Null);
        let property = |name: &str| {
            tmj["properties"]
                .as_array()?
                .iter()
                .find(|p| p["name"] == name && p["type"] == "string")
                .map(|p| p["value"].clone())
        };
        let mut metadata = Map::new();
        for (key, name) in [
            ("name", "mapName"),
            ("description", "mapDescription"),
            ("thumbnail", "mapImage"),
            ("copyright", "mapCopyright"),
        ] {
            if let Some(v) = property(name) {
                metadata.insert(key.into(), v);
            }
        }
        let Value::Object(doc) = json!({
            "version": LATEST_VERSION,
            "mapUrl": map_url,
            "areas": [],
            "entities": {},
            "entityCollections": [],
            "metadata": metadata,
        }) else {
            unreachable!("object literal")
        };
        Wam { doc }
    }

    pub fn to_json(&self) -> Vec<u8> {
        serde_json::to_vec(&self.doc).unwrap_or_default()
    }

    /// The map (TMJ) of this file, relative to it.
    pub fn map_url(&self) -> Option<&str> {
        self.doc.get("mapUrl").and_then(Value::as_str)
    }

    pub fn last_command_id(&self) -> Option<&str> {
        self.doc.get("lastCommandId").and_then(Value::as_str)
    }

    pub fn areas(&self) -> &[Value] {
        self.doc.get("areas").and_then(Value::as_array).map_or(&[], Vec::as_slice)
    }

    pub fn settings(&self) -> Option<&Value> {
        self.doc.get("settings")
    }

    /// Applies an editor command, with map-storage's rights. A refused or invalid command changes nothing.
    pub fn apply(&mut self, command_id: &str, edit: Edit, editor: Editor<'_>) -> Result<Applied, String> {
        let before = self.doc.clone();
        let result = self.apply_inner(command_id, edit, editor).and_then(|applied| {
            self.check()?;
            Ok(applied)
        });
        if result.is_err() {
            self.doc = before;
        }
        result
    }

    fn apply_inner(&mut self, command_id: &str, edit: Edit, editor: Editor<'_>) -> Result<Applied, String> {
        let refused = || Err(format!("User {} is not allowed to edit the map", editor.uuid));
        let mut applied = Applied::default();
        match edit {
            Edit::CreateArea(mut area) => {
                if !editor.can_edit {
                    return refused();
                }
                let id = area.get("id").and_then(Value::as_str).unwrap_or_default().to_owned();
                let areas = self.areas_mut();
                if areas.iter().any(|a| a["id"] == id.as_str()) {
                    return Err(format!("MapEditorError: Could not execute CreateArea Command. Area ID: {id}"));
                }
                area.insert("visible".into(), true.into());
                areas.push(Value::Object(area));
            }
            Edit::ModifyArea { id, fields, properties } => {
                let Some(current) = self.areas().iter().find(|a| a["id"] == id.as_str()).cloned() else {
                    // map-storage logs it and moves on.
                    return Ok(applied);
                };
                if !editor.can_edit && !is_claim(&current, &fields, properties.as_deref(), editor.uuid) {
                    return Err(format!(
                        "User {} is not allowed to edit the map and this modification is not a valid claim or revoke",
                        editor.uuid
                    ));
                }
                let Some(Value::Object(area)) = self.areas_mut().iter_mut().find(|a| a["id"] == id.as_str()) else {
                    return Ok(applied);
                };
                for (k, v) in fields {
                    area.insert(k, v);
                }
                if let Some(mut new) = properties {
                    let old = area.get("properties").and_then(Value::as_array).cloned().unwrap_or_default();
                    applied.dropped_files = dropped(&old, &new);
                    // A property sent without its server data keeps the stored one (GameMapAreas.updateArea).
                    for p in &mut new {
                        let kept = old.iter().find(|o| o["id"] == p["id"]).map(|o| &o["serverData"]);
                        let empty = p.get("serverData").is_none_or(|s| s == &json!({}));
                        if let (Some(kept), true) = (kept.filter(|k| !k.is_null()), empty) {
                            p["serverData"] = kept.clone();
                        }
                    }
                    area.insert("properties".into(), Value::Array(new));
                }
            }
            Edit::DeleteArea(id) => {
                if !editor.can_edit {
                    return refused();
                }
                let areas = self.areas_mut();
                if let Some(i) = areas.iter().position(|a| a["id"] == id.as_str()) {
                    let area = areas.remove(i);
                    applied.dropped_files = dropped(props(&area), &[]);
                }
            }
            Edit::CreateEntity { id, entity } => {
                if !self.can_write_at(num(&entity["x"]), num(&entity["y"]), editor) {
                    return Err(format!("User {} is not allowed to place an entity here", editor.uuid));
                }
                // An id that is already there is ignored (GameMapEntities.addEntity).
                self.entities_mut().entry(id).or_insert(Value::Object(entity));
            }
            Edit::ModifyEntity { id, mut fields, properties } => {
                let Some(current) = self.doc["entities"].get(&id).cloned() else { return Ok(applied) };
                let x = fields.get("x").map_or_else(|| num(&current["x"]), num);
                let y = fields.get("y").map_or_else(|| num(&current["y"]), num);
                // Where it is and where it goes: a zone editor neither pulls an entity in nor pushes one out.
                if !self.can_write_at(num(&current["x"]), num(&current["y"]), editor)
                    || !self.can_write_at(x, y, editor)
                {
                    return Err(format!("User {} is not allowed to edit this entity", editor.uuid));
                }
                let Some(Value::Object(entity)) = self.entities_mut().get_mut(&id) else { return Ok(applied) };
                if let Some(new) = properties {
                    applied.dropped_files = dropped(props(&current), &new);
                    fields.insert("properties".into(), Value::Array(new));
                }
                for (k, v) in fields {
                    match (entity.get_mut(&k), v) {
                        (Some(Value::Object(old)), Value::Object(new)) if k != "properties" => old.extend(new),
                        (_, v) => {
                            entity.insert(k, v);
                        }
                    }
                }
            }
            Edit::DeleteEntity(id) => {
                let Some(current) = self.doc["entities"].get(&id).cloned() else { return Ok(applied) };
                // Only where one could have placed it. One already gone is a no-op that still goes out (above).
                if !self.can_write_at(num(&current["x"]), num(&current["y"]), editor) {
                    return Err(format!("User {} is not allowed to delete this entity", editor.uuid));
                }
                self.entities_mut().remove(&id);
                applied.dropped_files = dropped(props(&current), &[]);
            }
            Edit::DeleteCustomEntity(prefab) => {
                self.entities_mut().retain(|_, e| e["prefabRef"]["id"] != prefab.as_str());
            }
            Edit::Settings { key, value } => {
                if !editor.can_edit {
                    return refused();
                }
                if value.as_ref().is_some_and(|v| !v.is_object() && !v.is_null()) {
                    return Err(format!("Invalid {key} settings"));
                }
                let settings = self.doc.entry("settings").or_insert_with(|| json!({}));
                if !settings.is_object() {
                    *settings = json!({});
                }
                let settings = settings.as_object_mut().expect("just made an object");
                match value.filter(|v| !v.is_null()) {
                    Some(v) => settings.insert(key.into(), v),
                    None => settings.remove(key),
                };
            }
            Edit::Metadata { fields, tags } => {
                if !editor.can_edit {
                    return refused();
                }
                for (key, value) in [("metadata", None), ("vendor", Some(tags))] {
                    let block = self.doc.entry(key).or_insert_with(|| json!({}));
                    if !block.is_object() {
                        *block = json!({});
                    }
                    let block = block.as_object_mut().expect("just made an object");
                    match value {
                        Some(tags) => {
                            block.insert("tags".into(), tags.into());
                        }
                        None => {
                            for (k, v) in &fields {
                                if v.is_null() {
                                    block.remove(k)
                                } else {
                                    block.insert(k.clone(), v.clone())
                                };
                            }
                        }
                    }
                }
            }
        }
        self.doc.insert("lastCommandId".into(), command_id.into());
        Ok(applied)
    }

    /// EntityPermissions at an entity's top-left corner: the editor edits the map, or the point lies in an area
    /// they write to.
    pub fn can_write_at(&self, x: f64, y: f64, editor: Editor<'_>) -> bool {
        editor.can_edit || self.areas().iter().any(|a| inside(x, y, a) && writes(a, editor))
    }

    /// isGameMapContainsSpecificAreas: the editor edits the map, or there is an area they write to. Uploads are
    /// tied to no position, so this is what they need.
    pub fn has_editor_access(&self, editor: Editor<'_>) -> bool {
        editor.can_edit || self.areas().iter().any(|a| writes(a, editor))
    }

    /// WAMFileFormat, structurally: the fields the server and the front rely on, with their types. Unknown
    /// fields pass, as zod strips them rather than refuses them.
    /// Properties are checked against their schemas (wam_properties).
    pub fn check(&self) -> Result<(), String> {
        let d = &self.doc;
        let text = |v: &Value, what: &str| if v.is_string() { Ok(()) } else { Err(format!("{what} must be a string")) };
        let number =
            |v: &Value, what: &str| if v.is_number() { Ok(()) } else { Err(format!("{what} must be a number")) };
        let property_list = |v: &Value, what: &str, entity: bool| -> Result<(), String> {
            for (i, p) in v.as_array().ok_or(format!("{what}.properties must be an array"))?.iter().enumerate() {
                crate::wam_properties::check(p, entity, &format!("{what}.properties[{i}]"))?;
            }
            Ok(())
        };
        text(&d["version"], "version")?;
        text(&d["mapUrl"], "mapUrl")?;
        for (i, a) in d["areas"].as_array().ok_or("areas must be an array")?.iter().enumerate() {
            let what = format!("areas[{i}]");
            text(&a["id"], &format!("{what}.id"))?;
            text(&a["name"], &format!("{what}.name"))?;
            for k in ["x", "y", "width", "height"] {
                number(&a[k], &format!("{what}.{k}"))?;
            }
            if !a["visible"].is_boolean() {
                return Err(format!("{what}.visible must be a boolean"));
            }
            property_list(&a["properties"], &what, false)?;
        }
        for (id, e) in d["entities"].as_object().ok_or("entities must be an object")? {
            let what = format!("entities.{id}");
            text(&e["prefabRef"]["id"], &format!("{what}.prefabRef.id"))?;
            text(&e["prefabRef"]["collectionName"], &format!("{what}.prefabRef.collectionName"))?;
            number(&e["x"], &format!("{what}.x"))?;
            number(&e["y"], &format!("{what}.y"))?;
            if e.get("properties").is_some() {
                property_list(&e["properties"], &what, true)?;
            }
        }
        if let Some(c) = d.get("entityCollections") {
            for (i, c) in c.as_array().ok_or("entityCollections must be an array")?.iter().enumerate() {
                text(&c["url"], &format!("entityCollections[{i}].url"))?;
            }
        }
        if d.get("settings").is_some_and(|s| !s.is_object() && !s.is_null()) {
            return Err("settings must be an object".into());
        }
        Ok(())
    }

    fn entities_mut(&mut self) -> &mut Map<String, Value> {
        let entities = self.doc.entry("entities").or_insert_with(|| json!({}));
        if !entities.is_object() {
            *entities = json!({});
        }
        entities.as_object_mut().expect("just made an object")
    }

    fn areas_mut(&mut self) -> &mut Vec<Value> {
        let areas = self.doc.entry("areas").or_insert_with(|| json!([]));
        if !areas.is_array() {
            *areas = json!([]);
        }
        areas.as_array_mut().expect("just made an array")
    }

    /// WamFileMigration: 1.0.0 -> 2.0.0 -> 2.1.0.
    fn migrate(&mut self) {
        let version = self.doc.get("version").and_then(Value::as_str).unwrap_or("1.0.0").to_owned();
        if version == "1.0.0" {
            // The Jitsi admin tag moves out of jitsiRoomConfig.
            for area in self.areas_mut() {
                for p in area["properties"].as_array_mut().into_iter().flatten() {
                    if p["type"] == "jitsiRoomProperty"
                        && let Some(tag) =
                            p["jitsiRoomConfig"].as_object_mut().and_then(|c| c.remove("jitsiRoomAdminTag"))
                    {
                        p["jitsiRoomAdminTag"] = tag;
                    }
                }
            }
        }
        if version == "1.0.0" || version == "2.0.0" {
            // Rooms and speaker zones get a lock.
            for area in self.areas_mut() {
                let Some(props) = area["properties"].as_array_mut() else { continue };
                let parent = props.iter().find_map(|p| {
                    matches!(p["type"].as_str(), Some("livekitRoomProperty" | "jitsiRoomProperty" | "speakerMegaphone"))
                        .then(|| p["id"].as_str().unwrap_or_default().to_owned())
                });
                if let Some(id) = parent {
                    props.push(json!({"id": format!("{id}-lock"), "type": "lockableAreaPropertyData"}));
                }
            }
        }
        self.doc.insert("version".into(), LATEST_VERSION.into());
    }
}

/// The commands of the last 30 s, for clients that loaded the file before they were saved.
#[derive(Debug)]
pub struct History<T> {
    items: VecDeque<(u64, String, T)>,
}

impl<T> Default for History<T> {
    fn default() -> Self {
        Self { items: VecDeque::new() }
    }
}

impl<T> History<T> {
    pub fn push(&mut self, now_ms: u64, id: String, item: T) {
        while self.items.front().is_some_and(|(at, _, _)| now_ms.saturating_sub(*at) > HISTORY_MS) {
            self.items.pop_front();
        }
        self.items.push_back((now_ms, id, item));
    }

    pub fn clear(&mut self) {
        self.items.clear();
    }

    /// What a client that loaded the file at `known` misses (MapsManager.getCommandsNewerThan): nothing if it
    /// has the latest, what follows its command if it is still here, else everything kept.
    pub fn after(&self, known: Option<&str>, latest: Option<&str>) -> Vec<&T> {
        if known.is_some() && known == latest {
            return Vec::new();
        }
        let start = known.and_then(|k| self.items.iter().position(|(_, id, _)| id == k)).map_or(0, |i| i + 1);
        self.items.iter().skip(start).map(|(_, _, t)| t).collect()
    }
}
