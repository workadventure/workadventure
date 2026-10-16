//! Room variables (`WA.state`, the back's VariablesManager): declared in the Tiled map as `variable` objects,
//! values kept as raw JSON strings, checked against `readableBy` / `writableBy`, the `persist` ones saved.

use std::collections::HashMap;

use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VariableDef {
    pub name: String,
    /// JSON text of the default value.
    pub default: Option<String>,
    pub persist: bool,
    pub readable_by: Option<String>,
    pub writable_by: Option<String>,
}

/// The `variable` objects of a Tiled map: in object layers, group layers searched too. Objects made from a
/// template are skipped, as on the back.
pub fn from_tmj(map: &Value) -> Vec<VariableDef> {
    fn walk(layers: &Value, out: &mut Vec<VariableDef>) {
        for layer in layers.as_array().into_iter().flatten() {
            match layer["type"].as_str() {
                Some("group") => walk(&layer["layers"], out),
                Some("objectgroup") => {
                    for o in layer["objects"].as_array().into_iter().flatten() {
                        let is_variable = o["class"] == "variable" || o["type"] == "variable";
                        if !is_variable || o.get("template").is_some() {
                            continue;
                        }
                        let prop = |name: &str| {
                            o["properties"].as_array()?.iter().find(|p| p["name"] == name).map(|p| p["value"].clone())
                        };
                        let text = |name: &str| prop(name).and_then(|v| v.as_str().filter(|s| !s.is_empty()).map(str::to_owned));
                        out.push(VariableDef {
                            name: o["name"].as_str().unwrap_or_default().to_owned(),
                            default: prop("default").map(|v| v.to_string()),
                            persist: prop("persist").and_then(|v| v.as_bool()).unwrap_or(false),
                            readable_by: text("readableBy"),
                            writable_by: text("writableBy"),
                        });
                    }
                }
                _ => {}
            }
        }
    }
    let mut out = Vec::new();
    walk(&map["layers"], &mut out);
    out
}

/// A refused write (VariableError): the map may have changed since it was read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VariableError(pub String);

impl std::fmt::Display for VariableError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

/// Who writes: a user (name, tags), or the Room API, which may write anything defined.
#[derive(Debug, Clone, Copy)]
pub enum Writer<'a> {
    User { name: &'a str, tags: &'a [String] },
    RoomApi,
}

/// What a change means for the others: who may read it, and whether to save it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Changed {
    pub readable_by: Option<String>,
    pub persist: bool,
}

#[derive(Debug, Default)]
pub struct RoomVariables {
    /// None: the map could not be read; anything goes and nothing is saved (map=null on the back).
    defs: Option<HashMap<String, VariableDef>>,
    values: HashMap<String, String>,
}

impl RoomVariables {
    pub fn new(defs: Option<Vec<VariableDef>>) -> Self {
        let values = defs
            .iter()
            .flatten()
            .filter_map(|d| Some((d.name.clone(), d.default.clone()?)))
            .collect();
        Self {
            defs: defs.map(|d| d.into_iter().map(|d| (d.name.clone(), d)).collect()),
            values,
        }
    }

    /// Saved values, kept when the variable still exists and persists.
    pub fn restore(&mut self, saved: impl IntoIterator<Item = (String, String)>) {
        for (name, value) in saved {
            if self.defs.as_ref().is_some_and(|d| d.get(&name).is_some_and(|d| d.persist)) {
                self.values.insert(name, value);
            }
        }
    }

    /// What `roomJoinedMessage.variable` carries for these tags.
    pub fn readable(&self, tags: &[String]) -> Vec<(String, String)> {
        let mut out: Vec<(String, String)> = self
            .values
            .iter()
            .filter(|(name, _)| self.readable_by(name).is_none_or(|t| tags.iter().any(|u| u == t)))
            .map(|(n, v)| (n.clone(), v.clone()))
            .collect();
        out.sort();
        out
    }

    fn readable_by(&self, name: &str) -> Option<&str> {
        self.defs.as_ref()?.get(name)?.readable_by.as_deref()
    }

    /// The map was read again: the new definitions, and the current values of the variables still in it.
    pub fn reload(&mut self, defs: Option<Vec<VariableDef>>) {
        let mut fresh = Self::new(defs);
        for (name, value) in std::mem::take(&mut self.values) {
            if fresh.defs.as_ref().is_none_or(|d| d.contains_key(&name)) {
                fresh.values.insert(name, value);
            }
        }
        *self = fresh;
    }

    /// Whether the map was read (persistence and checks are on).
    pub fn has_map(&self) -> bool {
        self.defs.is_some()
    }

    /// Sets a value (VariablesManager.setVariable). Ok(None) when the value did not change: nothing to send.
    pub fn set(&mut self, name: &str, value: &str, writer: Writer<'_>) -> Result<Option<Changed>, VariableError> {
        let def = match &self.defs {
            None => None,
            Some(defs) => Some(defs.get(name).ok_or_else(|| {
                VariableError(format!(
                    "Trying to set a variable \"{name}\" that is not defined as an object in the map."
                ))
            })?),
        };
        if let (Some(def), Writer::User { name: user, tags }) = (def, writer)
            && let Some(required) = &def.writable_by
            && !tags.iter().any(|t| t == required)
        {
            return Err(VariableError(format!(
                "Trying to set a variable \"{name}\". User \"{user}\" does not have sufficient permission. Required tag: \"{required}\". User tags: {}.",
                tags.join(", ")
            )));
        }
        let changed = Changed {
            readable_by: def.and_then(|d| d.readable_by.clone()),
            persist: def.is_some_and(|d| d.persist),
        };
        if self.values.get(name).map(String::as_str) == Some(value) {
            return Ok(None);
        }
        self.values.insert(name.to_owned(), value.to_owned());
        Ok(Some(changed))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn map() -> Value {
        json!({"layers": [
            {"type": "group", "layers": [{"type": "objectgroup", "objects": [
                {"name": "doorOpen", "class": "variable", "properties": [
                    {"name": "default", "value": true}, {"name": "persist", "value": true},
                    {"name": "writableBy", "value": "admin"}, {"name": "readableBy", "value": ""}
                ]},
                {"name": "secret", "type": "variable", "properties": [{"name": "readableBy", "value": "vip"}]},
                {"name": "fromTemplate", "class": "variable", "template": "x.tx"},
                {"name": "notAVariable", "class": "area"}
            ]}]},
            {"type": "tilelayer"}
        ]})
    }

    #[test]
    fn variables_come_from_the_map_with_their_rights() {
        let defs = from_tmj(&map());
        assert_eq!(defs.len(), 2);
        assert_eq!(defs[0].default.as_deref(), Some("true"));
        assert!(defs[0].persist && defs[0].readable_by.is_none());
        let mut v = RoomVariables::new(Some(defs));
        assert_eq!(v.readable(&[]), vec![("doorOpen".to_owned(), "true".to_owned())]);
        let admin = ["admin".to_owned()];
        let (alice, boss) = (Writer::User { name: "Alice", tags: &[] }, Writer::User { name: "Boss", tags: &admin });
        let refused = v.set("doorOpen", "false", alice).unwrap_err();
        assert!(refused.0.contains("Required tag: \"admin\""), "{refused}");
        assert_eq!(v.set("doorOpen", "false", boss), Ok(Some(Changed { readable_by: None, persist: true })));
        assert_eq!(v.set("doorOpen", "false", boss), Ok(None));
        assert!(v.set("nope", "1", boss).unwrap_err().0.contains("not defined as an object in the map"));
        // The Room API bypasses the tags.
        assert!(v.set("doorOpen", "true", Writer::RoomApi).unwrap().is_some());
        assert_eq!(v.set("secret", "\"s\"", alice).unwrap().unwrap().readable_by.as_deref(), Some("vip"));
        assert_eq!(v.readable(&[]).len(), 1);
        assert_eq!(v.readable(&["vip".into()]).len(), 2);
        // Saved values come back only for variables that still persist.
        let mut fresh = RoomVariables::new(Some(from_tmj(&map())));
        fresh.restore([("doorOpen".into(), "false".into()), ("secret".into(), "\"x\"".into())]);
        assert_eq!(fresh.readable(&["vip".into()]), vec![("doorOpen".into(), "false".into())]);
    }

    #[test]
    fn without_a_map_anything_goes_and_nothing_persists() {
        let mut v = RoomVariables::new(None);
        let alice = Writer::User { name: "Alice", tags: &[] };
        assert_eq!(v.set("x", "1", alice), Ok(Some(Changed { readable_by: None, persist: false })));
        v.restore([("y".into(), "2".into())]);
        assert_eq!(v.readable(&[]), vec![("x".into(), "1".into())]);
    }

    #[test]
    fn a_map_read_again_brings_new_variables_and_keeps_the_values_of_the_old_ones() {
        let mut v = RoomVariables::new(Some(vec![]));
        let alice = Writer::User { name: "Alice", tags: &[] };
        assert!(v.set("doorOpen", "false", alice).is_err());
        v.reload(Some(from_tmj(&map())));
        assert_eq!(v.set("doorOpen", "false", Writer::RoomApi).unwrap().map(|c| c.persist), Some(true));
        v.reload(Some(from_tmj(&map())));
        assert_eq!(v.readable(&[]), vec![("doorOpen".into(), "false".into())]);
        v.reload(Some(vec![]));
        assert!(v.readable(&[]).is_empty());
    }
}
