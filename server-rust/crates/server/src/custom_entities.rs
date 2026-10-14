//! The map editor's own files: custom entities (CustomEntityCollectionService: images under
//! `assets/entities/`, listed in `assets/entities/entities.json`, which the front loads) and the files of
//! openFile properties (CustomFileService: `private/files/`).

use serde_json::{Value, json};
use wa_core::wam::Editor;
use wa_proto::messages as pb;

use crate::map_storage::Storage;
use crate::wire;

const COLLECTION: &str = "assets/entities/entities.json";

fn empty_collection() -> Value {
    json!({"version": "1.0", "collection": [], "collectionName": "custom entities", "tags": []})
}

fn basename(path: &str) -> &str {
    path.rsplit(['/', '\\']).next().unwrap_or(path)
}

fn extension_in(name: &str, allowed: &[&str]) -> bool {
    name.rsplit_once('.').is_some_and(|(_, ext)| allowed.contains(&ext.to_ascii_lowercase().as_str()))
}

/// Where a link points to, as a decoded path.
pub fn link_path(link: &str) -> String {
    let rest = link.split_once("://").map_or(link, |(_, r)| r);
    let path = rest.find('/').map_or("", |i| &rest[i..]);
    let path = path.split(['?', '#']).next().unwrap_or(path);
    percent_encoding::percent_decode_str(path).decode_utf8_lossy().into_owned()
}

/// `uploadEntityMessage`: anyone may add one; its owner is the sender (set by the caller).
pub async fn upload(storage: &Storage, m: &pb::UploadEntityMessage) -> Result<(), String> {
    let image = basename(&m.image_path).to_owned();
    if !extension_in(&image, &["jpg", "jpeg", "png", "webp"]) {
        return Err(format!("Invalid image extension for {image}"));
    }
    storage
        .put_asset(format!("assets/entities/{image}"), m.file.to_vec())
        .await
        .map_err(|e| e.to_string())?;
    let direction = ["Up", "Right", "Down", "Left"].get(m.direction as usize).copied().unwrap_or("Down");
    let mut entry = json!({
        "id": m.id, "name": m.name, "tags": m.tags, "imagePath": m.image_path,
        "direction": direction, "color": m.color, "ownerId": m.owner_id,
    });
    if let Some(grid) = &m.collision_grid {
        entry["collisionGrid"] = wire::json_from(grid);
    }
    if let Some(depth) = m.depth_offset {
        entry["depthOffset"] = depth.into();
    }
    storage
        .update_json(COLLECTION, empty_collection(), move |c| {
            let list = c["collection"].as_array_mut().ok_or("Invalid custom entity collection")?;
            list.retain(|e| e["id"] != entry["id"]);
            list.push(entry);
            Ok(())
        })
        .await
}

/// canUserEditCustomEntity: an editor, or the one who uploaded it.
fn allowed(entry: &Value, editor: Editor<'_>) -> Result<(), String> {
    if editor.can_edit || entry["ownerId"].as_str().is_some_and(|o| o == editor.uuid) {
        Ok(())
    } else {
        Err(format!("User {} is not allowed to edit this custom entity", editor.uuid))
    }
}

pub async fn modify(storage: &Storage, m: &pb::ModifyCustomEntityMessage, editor: Editor<'_>) -> Result<(), String> {
    let (id, name, tags) = (m.id.clone(), m.name.clone(), m.tags.clone());
    let grid = m.collision_grid.as_ref().map(wire::json_from);
    let depth = m.depth_offset;
    let (can_edit, uuid) = (editor.can_edit, editor.uuid.to_owned());
    storage
        .update_json(COLLECTION, empty_collection(), move |c| {
            let entry = c["collection"]
                .as_array_mut()
                .and_then(|l| l.iter_mut().find(|e| e["id"] == id.as_str()))
                .ok_or(format!("Custom entity {id} not found"))?;
            allowed(entry, Editor { uuid: &uuid, tags: &[], can_edit })?;
            entry["name"] = name.into();
            entry["tags"] = tags.into();
            // Replaced, so an unset grid erases it (CustomEntityCollectionService.modifyEntity).
            match grid {
                Some(g) => entry["collisionGrid"] = g,
                None => drop(entry.as_object_mut().and_then(|e| e.remove("collisionGrid"))),
            }
            match depth {
                Some(d) => entry["depthOffset"] = d.into(),
                None => drop(entry.as_object_mut().and_then(|e| e.remove("depthOffset"))),
            }
            Ok(())
        })
        .await
}

/// Removes the entry and its image; the caller removes the map's entities made from it.
pub async fn delete(storage: &Storage, id: &str, editor: Editor<'_>) -> Result<(), String> {
    let (id, can_edit, uuid) = (id.to_owned(), editor.can_edit, editor.uuid.to_owned());
    let image = storage
        .update_json(COLLECTION, empty_collection(), move |c| {
            let list = c["collection"].as_array_mut().ok_or("Invalid custom entity collection")?;
            let i = list.iter().position(|e| e["id"] == id.as_str()).ok_or(format!("Custom entity {id} not found"))?;
            allowed(&list[i], Editor { uuid: &uuid, tags: &[], can_edit })?;
            let entry = list.remove(i);
            Ok(entry["imagePath"].as_str().map(|p| basename(p).to_owned()))
        })
        .await?;
    if let Some(image) = image {
        storage.remove_asset(&format!("assets/entities/{image}")).await;
    }
    Ok(())
}

/// `uploadFileMessage`: the file of an openFile property, as `private/files/<name>-<propertyId><ext>`.
pub async fn upload_file(storage: &Storage, m: &pb::UploadFileMessage) -> Result<(), String> {
    let name = basename(&m.name);
    let (stem, ext) = name.rsplit_once('.').map_or((name, ""), |(s, e)| (s, e));
    if !extension_in(name, &["pdf", "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]) {
        return Err(format!("Invalid file extension for {name}"));
    }
    storage
        .put_asset(format!("private/files/{stem}-{}.{ext}", m.property_id), m.file.to_vec())
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn links_become_storage_paths() {
        assert_eq!(link_path("http://maps.test:8880/private/files/a%20b-1.pdf?x=1"), "/private/files/a b-1.pdf");
        assert_eq!(basename("dir/img.PNG"), "img.PNG");
        assert!(extension_in("img.PNG", &["png"]));
        assert!(!extension_in("img.exe", &["png"]));
    }
}
