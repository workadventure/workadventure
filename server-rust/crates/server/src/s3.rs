//! The recordings bucket (LIVEKIT_RECORDING_S3_*), path-style, with AWS Signature V4: list (ListObjects v1, as
//! the pusher), delete, and presigned GET URLs (on LIVEKIT_RECORDING_S3_CDN_ENDPOINT when set).

use hmac::{Hmac, KeyInit, Mac};
use percent_encoding::{AsciiSet, NON_ALPHANUMERIC, utf8_percent_encode};
use sha2::{Digest, Sha256};

use crate::config::Config;

/// RFC 3986 unreserved characters stay; the rest is encoded (SigV4's UriEncode).
const UNRESERVED: &AsciiSet = &NON_ALPHANUMERIC.remove(b'-').remove(b'_').remove(b'.').remove(b'~');

fn enc(s: &str) -> String {
    utf8_percent_encode(s, UNRESERVED).to_string()
}

/// A key's path: each segment encoded, the slashes kept.
fn enc_path(s: &str) -> String {
    s.split('/').map(enc).collect::<Vec<_>>().join("/")
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn hmac(key: &[u8], data: &str) -> Vec<u8> {
    let mut m = Hmac::<Sha256>::new_from_slice(key).expect("any key length");
    m.update(data.as_bytes());
    m.finalize().into_bytes().to_vec()
}

#[derive(Clone, Debug)]
pub struct Bucket {
    endpoint: String,
    /// Where presigned URLs point (the public CDN host), or the endpoint.
    public_endpoint: String,
    bucket: String,
    region: String,
    access_key: String,
    secret: String,
}

/// An object of a listing.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Object {
    pub key: String,
    pub size: Option<u64>,
}

impl Bucket {
    /// None unless the five variables are set (the pusher answers empty lists then).
    pub fn from_config(config: &Config) -> Option<Self> {
        let get = |k: &str| config.raw.get(&format!("LIVEKIT_RECORDING_S3_{k}")).filter(|v| !v.is_empty()).cloned();
        let endpoint = get("ENDPOINT")?.trim_end_matches('/').to_owned();
        Some(Self {
            public_endpoint: get("CDN_ENDPOINT").map_or_else(|| endpoint.clone(), |c| c.trim_end_matches('/').to_owned()),
            endpoint,
            bucket: get("BUCKET")?,
            region: get("REGION")?,
            access_key: get("ACCESS_KEY")?,
            secret: get("SECRET_KEY")?,
        })
    }

    fn host(endpoint: &str) -> String {
        endpoint.split_once("://").map_or(endpoint, |(_, h)| h).trim_end_matches('/').to_owned()
    }

    /// The signature of a request (SigV4). `query` is already canonical (sorted, encoded).
    fn sign(&self, method: &str, path: &str, query: &str, amz_date: &str, payload_hash: &str, headers: &[(&str, String)]) -> String {
        let date = &amz_date[..8];
        let scope = format!("{date}/{}/s3/aws4_request", self.region);
        let canonical_headers: String = headers.iter().map(|(k, v)| format!("{k}:{v}\n")).collect();
        let signed: Vec<&str> = headers.iter().map(|(k, _)| *k).collect();
        let canonical = format!("{method}\n{path}\n{query}\n{canonical_headers}\n{}\n{payload_hash}", signed.join(";"));
        let to_sign = format!("AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{}", hex(&Sha256::digest(canonical.as_bytes())));
        let k = hmac(format!("AWS4{}", self.secret).as_bytes(), date);
        let k = hmac(&k, &self.region);
        let k = hmac(&k, "s3");
        let k = hmac(&k, "aws4_request");
        hex(&hmac(&k, &to_sign))
    }

    fn now() -> String {
        let iso = crate::uploader::iso_now();
        // 2026-10-17T09:15:11.620Z -> 20261017T091511Z
        format!("{}{}{}T{}{}{}Z", &iso[0..4], &iso[5..7], &iso[8..10], &iso[11..13], &iso[14..16], &iso[17..19])
    }

    /// A signed request on the private endpoint.
    async fn send(&self, http: &reqwest::Client, method: reqwest::Method, key: &str, params: &[(&str, String)]) -> Result<String, String> {
        let amz_date = Self::now();
        let path = format!("/{}/{}", self.bucket, enc_path(key));
        let mut sorted: Vec<(String, String)> = params.iter().map(|(k, v)| (enc(k), enc(v))).collect();
        sorted.sort();
        let query = sorted.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join("&");
        let empty = hex(&Sha256::digest(b""));
        let headers = [("host", Self::host(&self.endpoint)), ("x-amz-content-sha256", empty.clone()), ("x-amz-date", amz_date.clone())];
        let signature = self.sign(method.as_str(), &path, &query, &amz_date, &empty, &headers);
        let authorization = format!(
            "AWS4-HMAC-SHA256 Credential={}/{}/{}/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature={signature}",
            self.access_key,
            &amz_date[..8],
            self.region
        );
        let url = if query.is_empty() { format!("{}{path}", self.endpoint) } else { format!("{}{path}?{query}", self.endpoint) };
        let response = http
            .request(method, url)
            .header("x-amz-content-sha256", empty)
            .header("x-amz-date", amz_date)
            .header("authorization", authorization)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        if status.is_success() { Ok(text) } else { Err(format!("S3 {status}: {text}")) }
    }

    /// Every object under `prefix` (ListObjects, page by page with Marker).
    pub async fn list(&self, http: &reqwest::Client, prefix: &str) -> Result<Vec<Object>, String> {
        let mut out = Vec::new();
        let mut marker: Option<String> = None;
        loop {
            let mut params = vec![("prefix", prefix.to_owned())];
            if let Some(m) = &marker {
                params.push(("marker", m.clone()));
            }
            let xml = self.send(http, reqwest::Method::GET, "", &params).await?;
            let page = parse_listing(&xml);
            let last = page.objects.last().map(|o| o.key.clone());
            out.extend(page.objects);
            if !page.truncated {
                return Ok(out);
            }
            marker = page.next_marker.or(last);
            if marker.is_none() {
                return Ok(out);
            }
        }
    }

    pub async fn delete(&self, http: &reqwest::Client, key: &str) -> Result<(), String> {
        self.send(http, reqwest::Method::DELETE, key, &[]).await.map(drop)
    }

    /// A presigned GET of `key`, valid `expires` seconds, on the public endpoint; `download` makes it an
    /// attachment with that file name.
    pub fn presigned_get(&self, key: &str, expires: u64, download: Option<&str>) -> String {
        let amz_date = Self::now();
        let path = format!("/{}/{}", self.bucket, enc_path(key));
        let credential = format!("{}/{}/{}/s3/aws4_request", self.access_key, &amz_date[..8], self.region);
        let mut params = vec![
            ("X-Amz-Algorithm".to_owned(), "AWS4-HMAC-SHA256".to_owned()),
            ("X-Amz-Credential".to_owned(), credential),
            ("X-Amz-Date".to_owned(), amz_date.clone()),
            ("X-Amz-Expires".to_owned(), expires.to_string()),
            ("X-Amz-SignedHeaders".to_owned(), "host".to_owned()),
        ];
        if let Some(name) = download {
            params.push(("response-content-disposition".to_owned(), format!("attachment; filename=\"{name}\"")));
            params.push(("response-content-type".to_owned(), "application/octet-stream".to_owned()));
        }
        let mut encoded: Vec<(String, String)> = params.iter().map(|(k, v)| (enc(k), enc(v))).collect();
        encoded.sort();
        let query = encoded.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join("&");
        let headers = [("host", Self::host(&self.public_endpoint))];
        let signature = self.sign("GET", &path, &query, &amz_date, "UNSIGNED-PAYLOAD", &headers);
        format!("{}{path}?{query}&X-Amz-Signature={signature}", self.public_endpoint)
    }
}

struct Listing {
    objects: Vec<Object>,
    truncated: bool,
    next_marker: Option<String>,
}

/// The text of every `<tag>…</tag>` in `xml`, entities decoded.
fn tags(xml: &str, tag: &str) -> Vec<String> {
    let (open, close) = (format!("<{tag}>"), format!("</{tag}>"));
    xml.split(open.as_str())
        .skip(1)
        .filter_map(|rest| {
            let text = rest.split_once(close.as_str())?.0;
            Some(text.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&"))
        })
        .collect()
}

// ponytail: S3's ListBucketResult read by tag names, not a general XML parser; enough for its flat shape.
fn parse_listing(xml: &str) -> Listing {
    let objects = tags(xml, "Contents")
        .into_iter()
        .map(|c| Object {
            key: tags(&c, "Key").into_iter().next().unwrap_or_default(),
            size: tags(&c, "Size").first().and_then(|s| s.parse().ok()),
        })
        .collect();
    Listing {
        objects,
        truncated: tags(xml, "IsTruncated").first().map(String::as_str) == Some("true"),
        next_marker: tags(xml, "NextMarker").into_iter().next().filter(|m| !m.is_empty()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_listing_is_read_and_a_url_is_signed_like_aws_does() {
        let xml = "<ListBucketResult><IsTruncated>true</IsTruncated><Contents><Key>u/recording-a&amp;b.mp4</Key><Size>12</Size></Contents>\
                   <Contents><Key>u/thumbnail-x_1.jpg</Key><Size>3</Size></Contents></ListBucketResult>";
        let l = parse_listing(xml);
        assert!(l.truncated);
        assert_eq!(l.objects[0], Object { key: "u/recording-a&b.mp4".into(), size: Some(12) });
        assert_eq!(enc_path("u/a b+c.mp4"), "u/a%20b%2Bc.mp4");
        // AWS's documented signing key example (Signature Version 4, "Deriving the signing key").
        let k = hmac(b"AWS4wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20120215");
        let k = hmac(&hmac(&hmac(&k, "us-east-1"), "iam"), "aws4_request");
        assert_eq!(hex(&k), "f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d");
    }
}
