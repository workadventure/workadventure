//! RFC 6902 patches between two JSON documents, the way fast-json-patch's `compare` builds them (what the
//! TypeScript back sends): removals walk the old keys backwards so array indexes stay valid, additions follow.

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
                if is_container(old_value) && is_container(new_value) && old_value.is_array() == new_value.is_array() =>
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Applies add/remove/replace, enough to check that a diff takes `a` to `b`.
    fn apply(doc: &mut Value, ops: &[Value]) {
        for op in ops {
            let path = op["path"].as_str().unwrap();
            let (parent, last) = path.rsplit_once('/').unwrap();
            let last = last.replace("~1", "/").replace("~0", "~");
            let target = doc.pointer_mut(parent).unwrap();
            match (op["op"].as_str().unwrap(), target) {
                ("add", Value::Array(a)) => a.insert(last.parse().unwrap(), op["value"].clone()),
                ("remove", Value::Array(a)) => drop(a.remove(last.parse().unwrap())),
                ("replace", Value::Array(a)) => a[last.parse::<usize>().unwrap()] = op["value"].clone(),
                ("add" | "replace", Value::Object(m)) => drop(m.insert(last, op["value"].clone())),
                ("remove", Value::Object(m)) => drop(m.remove(&last)),
                other => panic!("{other:?}"),
            }
        }
    }

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
            apply(&mut doc, &ops);
            assert_eq!(doc, b, "{ops:?}");
        }
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
