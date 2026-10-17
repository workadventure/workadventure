//! RFC 6902 patches: between two JSON documents, the way fast-json-patch's `compare` builds them (what the
//! TypeScript back sends: removals walk the old keys backwards so array indexes stay valid, additions follow),
//! and applied to a document (map-storage's `PATCH` of a WAM file).

use serde_json::{Value, json};

pub fn diff(before: &Value, after: &Value) -> Vec<Value> {
    let mut ops = Vec::new();
    generate(before, after, &mut String::new(), &mut ops);
    ops
}

fn entries(v: &Value) -> Vec<(String, &Value)> {
    match v {
        Value::Object(m) => m.iter().map(|(k, v)| (k.clone(), v)).collect(),
        Value::Array(a) => a.iter().enumerate().map(|(i, v)| (i.to_string(), v)).collect(),
        _ => Vec::new(),
    }
}

fn get<'a>(v: &'a Value, key: &str) -> Option<&'a Value> {
    match v {
        Value::Object(m) => m.get(key),
        Value::Array(a) => key.parse::<usize>().ok().and_then(|i| a.get(i)),
        _ => None,
    }
}

fn is_container(v: &Value) -> bool {
    v.is_object() || v.is_array()
}

fn generate(old: &Value, new: &Value, path: &mut String, ops: &mut Vec<Value>) {
    let old_entries = entries(old);
    let mut deleted = false;
    for (key, old_value) in old_entries.iter().rev() {
        let len = path.len();
        path.push('/');
        path.push_str(&key.replace('~', "~0").replace('/', "~1"));
        match get(new, key) {
            Some(new_value)
                if is_container(old_value)
                    && is_container(new_value)
                    && old_value.is_array() == new_value.is_array() =>
            {
                generate(old_value, new_value, path, ops);
            }
            Some(new_value) if *old_value != new_value => {
                ops.push(json!({"op": "replace", "path": path.as_str(), "value": new_value}));
            }
            Some(_) => {}
            None => {
                ops.push(json!({"op": "remove", "path": path.as_str()}));
                deleted = true;
            }
        }
        path.truncate(len);
    }
    let new_entries = entries(new);
    if !deleted && new_entries.len() == old_entries.len() {
        return;
    }
    for (key, new_value) in new_entries {
        if get(old, &key).is_none() {
            let escaped = key.replace('~', "~0").replace('/', "~1");
            ops.push(json!({"op": "add", "path": format!("{path}/{escaped}"), "value": new_value}));
        }
    }
}

fn unescape(token: &str) -> String {
    token.replace("~1", "/").replace("~0", "~")
}

/// The parent of `path` and the last token, unescaped.
fn split(path: &str) -> Result<(&str, String), String> {
    let (parent, last) = path.rsplit_once('/').ok_or_else(|| format!("Invalid path {path:?}"))?;
    Ok((parent, unescape(last)))
}

fn index(token: &str, len: usize, insert: bool) -> Result<usize, String> {
    let i = if insert && token == "-" {
        len
    } else {
        token.parse().map_err(|_| format!("Invalid array index {token:?}"))?
    };
    if i > len || (!insert && i == len) {
        return Err(format!("Array index {i} out of bounds"));
    }
    Ok(i)
}

fn remove(doc: &mut Value, path: &str) -> Result<Value, String> {
    let (parent, last) = split(path)?;
    match doc.pointer_mut(parent) {
        Some(Value::Object(m)) => m.remove(&last).ok_or_else(|| format!("No value at {path}")),
        Some(Value::Array(a)) => {
            let i = index(&last, a.len(), false)?;
            Ok(a.remove(i))
        }
        _ => Err(format!("No container at {parent:?}")),
    }
}

fn add(doc: &mut Value, path: &str, value: Value) -> Result<(), String> {
    if path.is_empty() {
        *doc = value;
        return Ok(());
    }
    let (parent, last) = split(path)?;
    match doc.pointer_mut(parent) {
        Some(Value::Object(m)) => {
            m.insert(last, value);
            Ok(())
        }
        Some(Value::Array(a)) => {
            let i = index(&last, a.len(), true)?;
            a.insert(i, value);
            Ok(())
        }
        _ => Err(format!("No container at {parent:?}")),
    }
}

/// Applies the operations in order: add, remove, replace, move, copy, test.
pub fn apply(doc: &mut Value, ops: &[Value]) -> Result<(), String> {
    for op in ops {
        let path = op["path"].as_str().ok_or("Operation without a path")?;
        let from = || op["from"].as_str().ok_or_else(|| "Operation without a from".to_owned());
        let value = || op.get("value").cloned().ok_or_else(|| "Operation without a value".to_owned());
        match op["op"].as_str() {
            Some("add") => add(doc, path, value()?)?,
            Some("remove") => {
                remove(doc, path)?;
            }
            Some("replace") => {
                let target = doc.pointer_mut(path).ok_or_else(|| format!("No value at {path}"))?;
                *target = value()?;
            }
            Some("move") => {
                let moved = remove(doc, from()?)?;
                add(doc, path, moved)?;
            }
            Some("copy") => {
                let copied = doc.pointer(from()?).cloned().ok_or_else(|| format!("No value at {path}"))?;
                add(doc, path, copied)?;
            }
            Some("test") => {
                if doc.pointer(path) != Some(&value()?) {
                    return Err(format!("Test failed at {path}"));
                }
            }
            other => return Err(format!("Unknown operation {other:?}")),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_diff_takes_the_old_document_to_the_new_one() {
        let cases = [
            (json!({"a": [1, 2, 3], "b": {"x": 1}}), json!({"a": [2, 3], "b": {"y": "z"}})),
            (json!({"a": []}), json!({"a": [{"k": 1}, {"k": 2}]})),
            (json!({"polls": {"a/b~c": {"v": {}}}}), json!({"polls": {"a/b~c": {"v": {"u": 1}}}})),
            (json!({"r": {"recorder": null}}), json!({"r": {"recorder": "x"}})),
            (json!({"k": "bubble", "q": {"1": 1}}), json!({"q": {}})),
        ];
        for (a, b) in cases {
            let ops = diff(&a, &b);
            let mut doc = a.clone();
            apply(&mut doc, &ops).unwrap();
            assert_eq!(doc, b, "{ops:?}");
        }
    }

    #[test]
    fn a_patch_applies_in_order() {
        let mut doc = json!({"mapUrl": "a", "areas": [{"id": "x"}], "m": {}});
        let ops = [
            json!({"op": "replace", "path": "/mapUrl", "value": "b"}),
            json!({"op": "add", "path": "/areas/-", "value": {"id": "y"}}),
            json!({"op": "remove", "path": "/areas/0"}),
            json!({"op": "copy", "from": "/mapUrl", "path": "/m/a~1b"}),
            json!({"op": "test", "path": "/m/a~1b", "value": "b"}),
        ];
        apply(&mut doc, &ops).unwrap();
        assert_eq!(doc, json!({"mapUrl": "b", "areas": [{"id": "y"}], "m": {"a/b": "b"}}));
        assert!(apply(&mut doc, &[json!({"op": "remove", "path": "/nope"})]).is_err());
        assert!(apply(&mut doc, &[json!({"op": "test", "path": "/mapUrl", "value": "c"})]).is_err());
        // The diff and the patch agree.
        let (a, b) = (json!({"x": [1, 2, 3], "y": {"z": 1}}), json!({"x": [3], "w": true}));
        let mut c = a.clone();
        apply(&mut c, &diff(&a, &b)).unwrap();
        assert_eq!(c, b);
    }

    #[test]
    fn like_fast_json_patch() {
        // compare({hands: [a, b, c]}, {hands: [b, c]}): shift by replacing, then drop the last index.
        let ops = diff(&json!({"h": ["a", "b", "c"]}), &json!({"h": ["b", "c"]}));
        assert_eq!(
            ops,
            vec![
                json!({"op": "remove", "path": "/h/2"}),
                json!({"op": "replace", "path": "/h/1", "value": "c"}),
                json!({"op": "replace", "path": "/h/0", "value": "b"}),
            ]
        );
        assert_eq!(diff(&json!({"a": 1}), &json!({"a": 1})), Vec::<Value>::new());
        assert_eq!(
            diff(&json!({}), &json!({"kind": "area"})),
            vec![json!({"op": "add", "path": "/kind", "value": "area"})]
        );
    }
}
