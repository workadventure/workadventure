//! The property schemas of a WAM file: libs/map-editor's AreaDataProperty and EntityDataProperty unions.
//! map-storage stores command properties as they come, but parses the whole file (WAMFileFormat) every time it
//! loads it: a property this server accepted and the schema refuses would make the map unreadable by the
//! TypeScript servers. Fields with a default may be absent; unknown fields pass (zod strips them).

use serde_json::Value;

#[derive(Clone, Copy)]
enum Kind {
    Str,
    /// A string, or null.
    StrOrNull,
    Bool,
    Num,
    /// A number within bounds.
    Range(f64, f64),
    /// A number within bounds, or null.
    RangeOrNull(f64, f64),
    Strs,
    Trigger,
    ClaimMode,
    /// jitsiRoomConfig: optional booleans.
    JitsiConfig,
    /// livekitRoomConfig: two booleans, two optional ones.
    LivekitConfig,
    /// matrixRoomPropertyData.serverData: an optional `matrixRoomId` string.
    MatrixServerData,
    /// z.unknown().
    Any,
}

use Kind::*;

const INF: f64 = f64::INFINITY;

/// (field, kind, required).
type Fields = &'static [(&'static str, Kind, bool)];

const DESCRIPTION: Fields = &[("description", Str, false), ("searchable", Bool, false)];
const JITSI: Fields = &[
    ("roomName", Str, true),
    ("jitsiUrl", Str, false),
    ("closable", Bool, false),
    ("trigger", Trigger, false),
    ("triggerMessage", Str, false),
    ("noPrefix", Bool, false),
    ("width", Range(1.0, 100.0), false),
    ("jitsiRoomAdminTag", Str, false),
    ("jitsiRoomConfig", JitsiConfig, true),
];
const PLAY_AUDIO: Fields = &[
    ("audioLink", Str, true),
    ("volume", Num, false),
    ("triggerMessage", Str, false),
    ("playForAllUsers", Bool, false),
    ("audibleRadius", RangeOrNull(0.0, INF), false),
];
const OPEN_WEBSITE: Fields = &[
    ("link", StrOrNull, false),
    ("newTab", Bool, false),
    ("closable", Bool, false),
    ("allowAPI", Bool, false),
    ("trigger", Trigger, false),
    ("triggerMessage", Str, false),
    ("width", Range(1.0, 100.0), false),
    ("policy", Str, false),
    ("position", Num, false),
    ("application", Str, false),
    ("poster", Str, false),
    ("placeholder", Str, false),
    ("icon", Str, false),
    ("label", Str, false),
    ("regexUrl", Str, false),
    ("targetEmbedableUrl", Str, false),
    ("forceNewTab", Bool, false),
    ("hideUrl", Bool, false),
];
const OPEN_FILE: Fields = &[
    ("link", StrOrNull, false),
    ("name", StrOrNull, true),
    ("newTab", Bool, false),
    ("closable", Bool, false),
    ("trigger", Trigger, false),
    ("triggerMessage", Str, false),
    ("width", Range(1.0, 100.0), false),
    ("policy", Str, false),
    ("position", Num, false),
    ("hideUrl", Bool, false),
];
const LIVEKIT: Fields = &[
    ("roomName", Str, true),
    ("triggerMessage", Str, false),
    ("livekitRoomConfig", LivekitConfig, false),
    ("livekitRoomAdminTag", Str, false),
];

/// The fields of a property type, for an area or an entity; None if that type is not allowed there.
fn fields(kind: &str, entity: bool) -> Option<Fields> {
    let both = match kind {
        "jitsiRoomProperty" => Some(JITSI),
        "playAudio" => Some(PLAY_AUDIO),
        "openWebsite" => Some(OPEN_WEBSITE),
        "openFile" => Some(OPEN_FILE),
        "livekitRoomProperty" => Some(LIVEKIT),
        _ => None,
    };
    if both.is_some() {
        return both;
    }
    if entity {
        return (kind == "entityDescriptionProperties").then_some(DESCRIPTION);
    }
    Some(match kind {
        "start" => &[("isDefault", Bool, false)],
        "exit" => &[("url", Str, true), ("areaName", Str, true)],
        "focusable" => &[("zoom_margin", Num, false)],
        "highlight" => &[
            ("opacity", Range(0.0, 1.0), false),
            ("gradientWidth", Range(0.0, INF), false),
            ("duration", Num, false),
            ("color", Str, false),
        ],
        "silent" => &[],
        "speakerMegaphone" => &[("name", Str, true), ("chatEnabled", Bool, false), ("seeAttendees", Bool, false)],
        "listenerMegaphone" => &[
            ("speakerZoneName", Str, true),
            ("chatEnabled", Bool, false),
            ("allowTalking", Bool, false),
            ("raiseHandEnabled", Bool, false),
            ("waitingLink", Str, false),
        ],
        "areaDescriptionProperties" => DESCRIPTION,
        "restrictedRightsPropertyData" => &[("writeTags", Strs, false), ("readTags", Strs, false)],
        "personalAreaPropertyData" => &[
            ("accessClaimMode", ClaimMode, true),
            ("allowedTags", Strs, false),
            ("ownerId", StrOrNull, true),
        ],
        "extensionModule" => &[("subtype", Str, true), ("data", Any, false)],
        "matrixRoomPropertyData" => &[
            ("shouldOpenAutomatically", Bool, true),
            ("displayName", Str, true),
            ("serverData", MatrixServerData, false),
        ],
        "tooltipPropertyData" => &[("content", Str, true), ("duration", Num, false)],
        "maxUsersInAreaPropertyData" => &[("maxUsers", RangeOrNull(0.0, INF), false)],
        "lockableAreaPropertyData" => &[("allowedTags", Strs, false)],
        _ => return None,
    })
}

fn fits(v: &Value, kind: Kind) -> bool {
    let bool_or_absent = |v: &Value| v.is_null() || v.is_boolean();
    match kind {
        Str => v.is_string(),
        StrOrNull => v.is_string() || v.is_null(),
        Bool => v.is_boolean(),
        Num => v.is_number(),
        Range(min, max) => v.as_f64().is_some_and(|n| (min..=max).contains(&n)),
        RangeOrNull(min, max) => v.is_null() || fits(v, Range(min, max)),
        Strs => v.as_array().is_some_and(|a| a.iter().all(Value::is_string)),
        Trigger => matches!(v.as_str(), Some("onenter" | "onaction" | "onicon")),
        ClaimMode => matches!(v.as_str(), Some("dynamic" | "static")),
        JitsiConfig => {
            v.is_object() && ["startWithAudioMuted", "startWithVideoMuted"].iter().all(|k| bool_or_absent(&v[*k]))
        }
        LivekitConfig => {
            v.is_object()
                && v["startWithAudioMuted"].is_boolean()
                && v["startWithVideoMuted"].is_boolean()
                && ["disableChat", "raiseHandEnabled"].iter().all(|k| bool_or_absent(&v[*k]))
        }
        MatrixServerData => v.is_object() && (v["matrixRoomId"].is_null() || v["matrixRoomId"].is_string()),
        Any => true,
    }
}

/// Checks one property of an area (`entity` false) or an entity.
pub fn check(p: &Value, entity: bool, what: &str) -> Result<(), String> {
    let kind = p["type"].as_str().ok_or(format!("{what}.type must be a string"))?;
    if !p["id"].is_string() {
        return Err(format!("{what}.id must be a string"));
    }
    let fields = fields(kind, entity)
        .ok_or_else(|| format!("{what}: \"{kind}\" is not a property of an {}", if entity { "entity" } else { "area" }))?;
    let base: Fields = &[("buttonLabel", Str, false), ("hideButtonLabel", Bool, false), ("resourceUrl", Str, false)];
    for (name, kind, required) in base.iter().chain(fields) {
        match p.get(*name) {
            // `.optional()` takes undefined, not null: a field there must have its type.
            None => {
                if *required {
                    return Err(format!("{what}.{name} is required"));
                }
            }
            Some(v) => {
                if !fits(v, *kind) {
                    return Err(format!("{what}.{name} is invalid"));
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn properties_follow_the_map_editor_schemas() {
        let ok = |p: Value, entity: bool| check(&p, entity, "p").map_err(|e| format!("{p}: {e}"));
        ok(json!({"id": "a", "type": "silent"}), false).unwrap();
        ok(json!({"id": "a", "type": "highlight", "opacity": 0.6, "color": "#fff"}), false).unwrap();
        ok(json!({"id": "a", "type": "openFile", "link": null, "name": null, "extra": 1}), true).unwrap();
        ok(json!({"id": "a", "type": "personalAreaPropertyData", "accessClaimMode": "dynamic", "ownerId": null}), false).unwrap();
        ok(json!({"id": "a", "type": "livekitRoomProperty", "roomName": "r", "livekitRoomConfig": {"startWithAudioMuted": true, "startWithVideoMuted": false}}), true).unwrap();
        ok(json!({"id": "a", "type": "maxUsersInAreaPropertyData", "maxUsers": null}), false).unwrap();
        ok(json!({"id": "a", "type": "jitsiRoomProperty", "roomName": "r", "jitsiRoomConfig": {}}), false).unwrap();

        for (p, entity) in [
            (json!({"id": "a", "type": "nope"}), false),
            (json!({"id": "a", "type": "silent"}), true),
            (json!({"id": "a", "type": "entityDescriptionProperties"}), false),
            (json!({"id": "a", "type": "highlight", "opacity": 2}), false),
            (json!({"id": "a", "type": "openFile"}), false),
            (json!({"id": "a", "type": "exit", "url": "/x"}), false),
            (json!({"id": "a", "type": "openWebsite", "trigger": "never"}), false),
            (json!({"id": "a", "type": "personalAreaPropertyData", "accessClaimMode": "sometimes", "ownerId": null}), false),
            (json!({"id": "a", "type": "jitsiRoomProperty", "roomName": "r"}), false),
            (json!({"id": "a", "type": "silent", "buttonLabel": null}), false),
            (json!({"id": 3, "type": "silent"}), false),
        ] {
            assert!(ok(p.clone(), entity).is_err(), "{p} should be refused");
        }
    }
}
