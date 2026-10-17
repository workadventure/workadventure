//! A user's recordings in the bucket (RecordingService): the folder `<uuid>/` holds `recording-<time>.mp4` and
//! its thumbnails `thumbnail-<time>_<n>.jpg`. A user only ever reaches its own folder.

use std::collections::BTreeMap;

use wa_proto::messages as pb;

use crate::s3::{Bucket, Object};

/// `(recording|thumbnail)-YYYY-MM-DDTHH:MM:SS`: the kind and the time.
fn stamp(name: &str) -> Option<(&'static str, &str)> {
    for kind in ["recording", "thumbnail"] {
        if let Some(i) = name.find(&format!("{kind}-")) {
            let ts = name.get(i + kind.len() + 1..i + kind.len() + 20)?;
            let shape = ts.bytes().enumerate().all(|(j, b)| match j {
                4 | 7 => b == b'-',
                10 => b == b'T',
                13 | 16 => b == b':',
                _ => b.is_ascii_digit(),
            });
            if shape {
                return Some((kind, ts));
            }
        }
    }
    None
}

/// `_<n>.` in a thumbnail's name.
fn sequence(name: &str) -> u64 {
    name.rsplit_once('_')
        .and_then(|(_, rest)| rest.split_once('.'))
        .and_then(|(n, _)| n.parse().ok())
        .unwrap_or(0)
}

fn by_sequence(mut thumbs: Vec<&Object>) -> Vec<&Object> {
    thumbs.sort_by_key(|o| sequence(&o.key));
    thumbs
}

/// getRecordingsQuery: newest first, each with the second thumbnail as its poster (the first is often black).
pub async fn list(bucket: &Bucket, http: &reqwest::Client, uuid: &str) -> Result<Vec<pb::Recording>, String> {
    let prefix = format!("{uuid}/");
    let objects = bucket.list(http, &prefix).await?;
    tracing::debug!(%prefix, objects = objects.len(), "recordings listed");
    let mut sessions: BTreeMap<String, (Option<&Object>, Vec<&Object>)> = BTreeMap::new();
    for o in &objects {
        let Some((kind, ts)) = stamp(&o.key) else { continue };
        let entry = sessions.entry(ts.to_owned()).or_default();
        if kind == "recording" {
            entry.0 = Some(o);
        } else {
            entry.1.push(o);
        }
    }
    Ok(sessions
        .into_iter()
        .rev()
        .filter_map(|(ts, (video, thumbs))| {
            let video = video?;
            let thumbs = by_sequence(thumbs);
            let poster = thumbs.get(1).or(thumbs.first()).map(|t| bucket.presigned_get(&t.key, 3600, None)).unwrap_or_default();
            Some(pb::Recording {
                base_filename: format!("recording-{ts}"),
                timestamp: ts,
                video_file: Some(pb::VideoFile {
                    filename: video.key.strip_prefix(&prefix).unwrap_or(&video.key).to_owned(),
                    key: video.key.clone(),
                    size: video.size,
                }),
                poster_url: poster,
            })
        })
        .collect())
}

/// getRecordingThumbnailsQuery: at most 15, evenly spaced, the first one left out when there are others.
pub async fn thumbnails(bucket: &Bucket, http: &reqwest::Client, uuid: &str, base: &str) -> Result<Vec<String>, String> {
    let ts = base.strip_prefix("recording-").filter(|ts| stamp(base).is_some_and(|(_, s)| s == *ts && ts.len() == 19));
    let Some(ts) = ts else { return Err("Invalid recording name".into()) };
    let objects = bucket.list(http, &format!("{uuid}/thumbnail-{ts}_")).await?;
    let mut thumbs = by_sequence(objects.iter().collect());
    if thumbs.len() > 1 {
        thumbs.remove(0);
    }
    let picked: Vec<&Object> = if thumbs.len() <= 15 {
        thumbs
    } else {
        (0..15).map(|i| thumbs[i * (thumbs.len() - 1) / 14]).collect()
    };
    Ok(picked.into_iter().map(|t| bucket.presigned_get(&t.key, 3600, None)).collect())
}

/// deleteRecordingQuery: the video and its thumbnails; false when there was nothing or something failed.
pub async fn delete(bucket: &Bucket, http: &reqwest::Client, uuid: &str, recording_id: &str) -> bool {
    let ts = recording_id.trim_start_matches("recording-").trim_end_matches(".mp4");
    let Ok(objects) = bucket.list(http, &format!("{uuid}/")).await else { return false };
    let video = format!("{uuid}/{recording_id}");
    let thumbs = format!("{uuid}/thumbnail-{ts}_");
    let doomed: Vec<&Object> = objects.iter().filter(|o| o.key == video || o.key.starts_with(&thumbs)).collect();
    if doomed.is_empty() {
        return false;
    }
    let results = futures_util::future::join_all(doomed.iter().map(|o| bucket.delete(http, &o.key))).await;
    results.iter().all(Result::is_ok)
}

/// getSignedUrlQuery: a download link to one of the user's own files, for two hours.
pub fn signed_url(bucket: &Bucket, uuid: &str, key: &str) -> Result<String, String> {
    if !key.starts_with(&format!("{uuid}/")) {
        return Err("Unauthorized access to recording".into());
    }
    let name = key.rsplit('/').next().unwrap_or(key);
    Ok(bucket.presigned_get(key, 7200, Some(name)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recordings_and_thumbnails_are_told_apart_by_their_names() {
        assert_eq!(stamp("u/recording-2026-10-17T09:15:11.mp4"), Some(("recording", "2026-10-17T09:15:11")));
        assert_eq!(stamp("u/thumbnail-2026-10-17T09:15:11_3.jpeg"), Some(("thumbnail", "2026-10-17T09:15:11")));
        assert_eq!(stamp("u/notes.txt"), None);
        assert_eq!(stamp("u/recording-2026-10-17.mp4"), None);
        assert_eq!(sequence("u/thumbnail-2026-10-17T09:15:11_12.jpg"), 12);
    }
}
