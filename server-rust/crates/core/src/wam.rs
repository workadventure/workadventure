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
    /// updateWAMSettingsMessage: the block to store under `settings`, or None to clear it.
    Settings { key: &'static str, value: Option<Value> },
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

    pub fn last_command_id(&self) -> Option<&str> {
        self.doc.get("lastCommandId").and_then(Value::as_str)
    }

    pub fn areas(&self) -> &[Value] {
        self.doc.get("areas").and_then(Value::as_array).map_or(&[], Vec::as_slice)
    }

    pub fn settings(&self) -> Option<&Value> {
        self.doc.get("settings")
    }

    /// Applies an editor command. Refused when the user may not edit the map; nothing changes then.
    pub fn apply(&mut self, command_id: &str, edit: Edit, can_edit: bool) -> Result<(), String> {
        // A modify without the right is only allowed as a claim on a personal area, which J2 does not need.
        if !can_edit {
            return Err("User is not allowed to edit the map".into());
        }
        match edit {
            Edit::CreateArea(mut area) => {
                let id = area.get("id").and_then(Value::as_str).unwrap_or_default().to_owned();
                let areas = self.areas_mut();
                if areas.iter().any(|a| a["id"] == id.as_str()) {
                    return Err(format!("MapEditorError: Could not execute CreateArea Command. Area ID: {id}"));
                }
                area.insert("visible".into(), true.into());
                areas.push(Value::Object(area));
            }
            Edit::ModifyArea { id, fields, properties } => {
                let Some(Value::Object(area)) = self.areas_mut().iter_mut().find(|a| a["id"] == id.as_str()) else {
                    // map-storage logs it and moves on.
                    return Ok(());
                };
                for (k, v) in fields {
                    area.insert(k, v);
                }
                if let Some(mut new) = properties {
                    // A property sent without its server data keeps the stored one (GameMapAreas.updateArea).
                    let old = area.get("properties").and_then(Value::as_array).cloned().unwrap_or_default();
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
            Edit::Settings { key, value } => {
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
        }
        self.doc.insert("lastCommandId".into(), command_id.into());
        Ok(())
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
                        && let Some(tag) = p["jitsiRoomConfig"].as_object_mut().and_then(|c| c.remove("jitsiRoomAdminTag"))
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
        let start = known
            .and_then(|k| self.items.iter().position(|(_, id, _)| id == k))
            .map_or(0, |i| i + 1);
        self.items.iter().skip(start).map(|(_, _, t)| t).collect()
    }
}
