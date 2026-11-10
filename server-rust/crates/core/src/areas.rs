//! Area property variables (GameRoom's areaPropertyVariables: `(area, property, key) -> value`, in memory) and
//! what changes them as people come and go: LockableAreaManager (an area unlocks when the last one leaves) and
//! MaxUsersInAreaManager (`maxUsersReached`). Occupancy is counted on crossings, like AreaZoneTracker.

use std::collections::{BTreeMap, HashMap};

use serde_json::Value;

pub type VarKey = (String, String, String);

#[derive(Debug, Clone)]
struct Tracked {
    id: String,
    rect: (f64, f64, f64, f64),
    lock: Option<String>,
    /// (property id, maxUsers).
    max: Option<(String, u64)>,
}

impl Tracked {
    /// AreaZoneTracker.isPositionInArea: bounds included.
    fn contains(&self, (x, y): (f64, f64)) -> bool {
        let (ax, ay, w, h) = self.rect;
        x >= ax && x <= ax + w && y >= ay && y <= ay + h
    }
}

#[derive(Debug, Default)]
pub struct AreaVariables {
    values: BTreeMap<VarKey, String>,
    tracked: Vec<Tracked>,
    inside: HashMap<String, u64>,
}

impl AreaVariables {
    /// Follows the areas of a WAM file: those with a lock or a user limit are tracked. `positions` are where
    /// everybody is now: an area moved or resized off its last occupants unlocks, as when they walk out
    /// (AreaZoneTracker.emitEventsForUpdatedArea). Returns the variables that changed.
    pub fn track(&mut self, areas: &[Value], positions: impl Iterator<Item = (f64, f64)>) -> Vec<(VarKey, String)> {
        let num = |v: &Value| v.as_f64().unwrap_or(0.0);
        self.tracked = areas
            .iter()
            .filter_map(|a| {
                let props = a["properties"].as_array()?;
                let find = |t: &str| props.iter().find(|p| p["type"] == t);
                let lock = find("lockableAreaPropertyData").and_then(|p| p["id"].as_str().map(str::to_owned));
                let max = find("maxUsersInAreaPropertyData")
                    .and_then(|p| Some((p["id"].as_str()?.to_owned(), p["maxUsers"].as_u64()?)));
                (lock.is_some() || max.is_some()).then(|| Tracked {
                    id: a["id"].as_str().unwrap_or_default().to_owned(),
                    rect: (num(&a["x"]), num(&a["y"]), num(&a["width"]), num(&a["height"])),
                    lock,
                    max,
                })
            })
            .collect();
        let positions: Vec<(f64, f64)> = positions.collect();
        let previous = std::mem::take(&mut self.inside);
        self.inside = self
            .tracked
            .iter()
            .map(|t| (t.id.clone(), positions.iter().filter(|p| t.contains(**p)).count() as u64))
            .collect();
        let mut changes = Vec::new();
        for t in self.tracked.clone() {
            let (before, now) = (previous.get(&t.id).copied().unwrap_or(0), self.inside[&t.id]);
            let mut set = |prop: &str, key: &str, value: &str| {
                if self.set(&t.id, prop, key, value) {
                    changes.push(((t.id.clone(), prop.to_owned(), key.to_owned()), value.to_owned()));
                }
            };
            if now < before {
                if let Some(lock) = &t.lock
                    && now == 0
                {
                    set(lock, "lock", "false");
                }
                if let Some((prop, max)) = &t.max
                    && now < *max
                {
                    set(prop, "maxUsersReached", "false");
                }
            } else if now > before
                && let Some((prop, max)) = &t.max
                && now >= *max
            {
                set(prop, "maxUsersReached", "true");
            }
        }
        changes
    }

    pub fn get(&self, area: &str, property: &str, key: &str) -> Option<&str> {
        self.values.get(&(area.to_owned(), property.to_owned(), key.to_owned())).map(String::as_str)
    }

    /// Returns whether the value changed (only a change is broadcast).
    pub fn set(&mut self, area: &str, property: &str, key: &str, value: &str) -> bool {
        let k = (area.to_owned(), property.to_owned(), key.to_owned());
        if self.values.get(&k).is_some_and(|v| v == value) {
            return false;
        }
        self.values.insert(k, value.to_owned());
        true
    }

    pub fn all(&self) -> impl Iterator<Item = (&VarKey, &String)> {
        self.values.iter()
    }

    /// Someone went from `from` to `to` (None: not in the room). Returns the variables that changed.
    pub fn moved(&mut self, from: Option<(f64, f64)>, to: Option<(f64, f64)>) -> Vec<(VarKey, String)> {
        let mut changes = Vec::new();
        for t in self.tracked.clone() {
            let was = from.is_some_and(|p| t.contains(p));
            let is = to.is_some_and(|p| t.contains(p));
            if was == is {
                continue;
            }
            let count = self.inside.entry(t.id.clone()).or_default();
            *count = if is { *count + 1 } else { count.saturating_sub(1) };
            let count = *count;
            let mut set = |prop: &str, key: &str, value: &str| {
                if self.set(&t.id, prop, key, value) {
                    changes.push(((t.id.clone(), prop.to_owned(), key.to_owned()), value.to_owned()));
                }
            };
            if let Some(lock) = &t.lock
                && !is
                && count == 0
            {
                set(lock, "lock", "false");
            }
            if let Some((prop, max)) = &t.max {
                if is && count >= *max {
                    set(prop, "maxUsersReached", "true");
                } else if !is && count < *max {
                    set(prop, "maxUsersReached", "false");
                }
            }
        }
        changes
    }
}

/// hasAreaPropertyPermission: the property must exist; a lock with allowed tags needs one of them.
pub fn may_set(areas: &[Value], area: &str, property: &str, tags: &[String]) -> bool {
    let Some(p) = areas
        .iter()
        .find(|a| a["id"] == area)
        .and_then(|a| a["properties"].as_array()?.iter().find(|p| p["id"] == property))
    else {
        return false;
    };
    if p["type"] != "lockableAreaPropertyData" {
        return true;
    }
    let allowed: Vec<&str> = p["allowedTags"].as_array().into_iter().flatten().filter_map(Value::as_str).collect();
    allowed.is_empty() || tags.iter().any(|t| allowed.contains(&t.as_str()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn a_lock_opens_when_the_last_one_leaves_and_a_full_area_says_so() {
        let areas = [json!({"id": "a", "x": 0, "y": 0, "width": 100, "height": 100, "properties": [
            {"id": "l", "type": "lockableAreaPropertyData", "allowedTags": ["admin"]},
            {"id": "m", "type": "maxUsersInAreaPropertyData", "maxUsers": 2}
        ]})];
        let mut v = AreaVariables::default();
        assert!(v.track(&areas, [(50.0, 50.0)].into_iter()).is_empty());
        assert!(v.set("a", "l", "lock", "true"));
        assert!(!v.set("a", "l", "lock", "true"));
        let full = v.moved(None, Some((10.0, 100.0)));
        assert_eq!(full, vec![(("a".into(), "m".into(), "maxUsersReached".into()), "true".into())]);
        assert!(v.moved(Some((10.0, 100.0)), Some((20.0, 20.0))).is_empty());
        let one_left = v.moved(Some((20.0, 20.0)), None);
        assert_eq!(one_left, vec![(("a".into(), "m".into(), "maxUsersReached".into()), "false".into())]);
        let empty = v.moved(Some((50.0, 50.0)), Some((500.0, 0.0)));
        assert_eq!(empty, vec![(("a".into(), "l".into(), "lock".into()), "false".into())]);
        // The area moves off the one inside it: unlocked.
        assert!(v.set("a", "l", "lock", "true"));
        assert!(v.moved(None, Some((50.0, 50.0))).is_empty());
        let mut moved = areas[0].clone();
        moved["x"] = 1000.into();
        assert_eq!(
            v.track(&[moved], [(50.0, 50.0)].into_iter()),
            vec![(("a".into(), "l".into(), "lock".into()), "false".into())]
        );
        assert!(may_set(&areas, "a", "l", &["admin".into()]));
        assert!(!may_set(&areas, "a", "l", &["member".into()]));
        assert!(may_set(&areas, "a", "m", &[]));
        assert!(!may_set(&areas, "a", "nope", &[]));
    }
}
