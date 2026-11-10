//! The recordings bucket (LIVEKIT_RECORDING_S3_*), with `aws-sdk-s3`: path-style requests on the configured
//! endpoint, ListObjects v1 as the pusher, presigned GET URLs on LIVEKIT_RECORDING_S3_CDN_ENDPOINT when set.

use std::time::Duration;

use aws_sdk_s3::Client;
use aws_sdk_s3::config::{BehaviorVersion, Credentials, Region};
use aws_sdk_s3::presigning::PresigningConfig;

use crate::config::Config;

#[derive(Clone, Debug)]
pub struct Bucket {
    client: Client,
    /// Signs the URLs given to browsers: the public (CDN) endpoint, or the same one.
    public: Client,
    bucket: String,
}

/// An object of a listing.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Object {
    pub key: String,
    pub size: Option<u64>,
}

fn client(endpoint: &str, region: &str, credentials: &Credentials) -> Client {
    let config = aws_sdk_s3::Config::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(Region::new(region.to_owned()))
        .endpoint_url(endpoint.trim_end_matches('/'))
        .force_path_style(true)
        .credentials_provider(credentials.clone())
        .build();
    Client::from_conf(config)
}

impl Bucket {
    /// None unless the five variables are set (the pusher answers empty lists then).
    pub fn from_config(config: &Config) -> Option<Self> {
        let get = |k: &str| config.raw.get(&format!("LIVEKIT_RECORDING_S3_{k}")).filter(|v| !v.is_empty()).cloned();
        let endpoint = get("ENDPOINT")?;
        let region = get("REGION")?;
        let credentials = Credentials::new(get("ACCESS_KEY")?, get("SECRET_KEY")?, None, None, "LIVEKIT_RECORDING_S3");
        let public = get("CDN_ENDPOINT").unwrap_or_else(|| endpoint.clone());
        Some(Self {
            client: client(&endpoint, &region, &credentials),
            public: client(&public, &region, &credentials),
            bucket: get("BUCKET")?,
        })
    }

    /// Every object under `prefix`, page by page (Marker).
    pub async fn list(&self, prefix: &str) -> Result<Vec<Object>, String> {
        let mut out = Vec::new();
        let mut marker: Option<String> = None;
        loop {
            let page = self
                .client
                .list_objects()
                .bucket(&self.bucket)
                .prefix(prefix)
                .set_marker(marker.clone())
                .send()
                .await
                .map_err(|e| format!("S3 list: {}", aws_sdk_s3::error::DisplayErrorContext(&e)))?;
            let objects: Vec<Object> = page
                .contents()
                .iter()
                .map(|o| Object { key: o.key().unwrap_or_default().to_owned(), size: o.size().map(|s| s as u64) })
                .collect();
            let last = objects.last().map(|o| o.key.clone());
            out.extend(objects);
            if !page.is_truncated().unwrap_or(false) {
                return Ok(out);
            }
            marker = page.next_marker().filter(|m| !m.is_empty()).map(str::to_owned).or(last);
            if marker.is_none() {
                return Ok(out);
            }
        }
    }

    pub async fn delete(&self, key: &str) -> Result<(), String> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map(drop)
            .map_err(|e| format!("S3 delete: {}", aws_sdk_s3::error::DisplayErrorContext(&e)))
    }

    /// A presigned GET of `key`, valid `expires` seconds, on the public endpoint; `download` makes it an
    /// attachment with that file name. Empty if it cannot be signed.
    pub async fn presigned_get(&self, key: &str, expires: u64, download: Option<&str>) -> String {
        let mut get = self.public.get_object().bucket(&self.bucket).key(key);
        if let Some(name) = download {
            get = get
                .response_content_disposition(format!("attachment; filename=\"{name}\""))
                .response_content_type("application/octet-stream");
        }
        let Ok(presigning) = PresigningConfig::expires_in(Duration::from_secs(expires)) else { return String::new() };
        match get.presigned(presigning).await {
            Ok(r) => r.uri().to_owned(),
            Err(e) => {
                tracing::error!(%key, error = %aws_sdk_s3::error::DisplayErrorContext(&e), "could not presign an S3 URL");
                String::new()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn urls_are_signed_on_the_public_endpoint_and_downloads_are_attachments() {
        let raw = [
            ("ENDPOINT", "http://minio:9000"),
            ("CDN_ENDPOINT", "https://cdn.test"),
            ("BUCKET", "rec"),
            ("REGION", "us-east-1"),
            ("ACCESS_KEY", "a"),
            ("SECRET_KEY", "s"),
        ];
        let mut config =
            Config::load(crate::config::Env::new([("SECRET_KEY".to_owned(), "x".to_owned())].into_iter().collect()))
                .unwrap();
        for (k, v) in raw {
            config.raw.insert(format!("LIVEKIT_RECORDING_S3_{k}"), v.to_owned());
        }
        let b = Bucket::from_config(&config).unwrap();
        let url = b
            .presigned_get("u/recording-2026-10-17T09:15:11.mp4", 7200, Some("recording-2026-10-17T09:15:11.mp4"))
            .await;
        assert!(url.starts_with("https://cdn.test/rec/u/recording-2026-10-17T09%3A15%3A11.mp4?"), "{url}");
        assert!(url.contains("X-Amz-Expires=7200") && url.contains("X-Amz-Signature="), "{url}");
        assert!(url.contains("response-content-disposition=attachment"), "{url}");
        let poster = b.presigned_get("u/thumbnail-x_1.jpg", 3600, None).await;
        assert!(!poster.contains("response-content-disposition"), "{poster}");
    }
}
