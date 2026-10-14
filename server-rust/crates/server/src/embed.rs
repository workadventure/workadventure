//! `embeddableWebsiteQuery` (SocketManager.handleEmbeddableWebsiteQuery): can the front show a site in an iframe?
//! Domains of EMBEDDED_DOMAINS_WHITELIST can; others are asked (HEAD, GET when HEAD is not allowed, 5 s) and
//! judged on their CSP `frame-ancestors` and `X-Frame-Options` (EmbeddableHeaders.isFrameable).

use std::time::Duration;

use reqwest::header::HeaderMap;
use wa_proto::messages as pb;

fn host_of(url: &str) -> Option<String> {
    let rest = url.split_once("://")?.1;
    let authority = rest.split(['/', '?', '#']).next()?;
    let host = authority.rsplit_once('@').map_or(authority, |(_, h)| h);
    let host = host.split(':').next()?;
    (!host.is_empty()).then(|| host.to_ascii_lowercase())
}

fn whitelisted(url: &str, whitelist: &str) -> bool {
    let Some(host) = host_of(url) else { return false };
    whitelist
        .split(',')
        .map(|d| d.trim().to_ascii_lowercase())
        .filter(|d| !d.is_empty())
        .any(|d| host == d || host.ends_with(&format!(".{d}")))
}

/// isFrameable: `frame-ancestors` decides when present, else `X-Frame-Options`.
fn frameable(headers: &HeaderMap, own_origin: &str) -> bool {
    let get = |k: &str| headers.get(k).and_then(|v| v.to_str().ok()).unwrap_or("").to_owned();
    let csp = get("content-security-policy");
    if let Some(ancestors) = csp.split(';').map(|d| d.trim().to_ascii_lowercase()).find(|d| d.starts_with("frame-ancestors")) {
        let own = host_of(own_origin).unwrap_or_default();
        return ancestors.split_whitespace().skip(1).any(|source| {
            let host = source.split_once("://").map_or(source, |(_, h)| h);
            source == "*" || source == "https:" || host == own || (host.starts_with("*.") && own.ends_with(&host[1..]))
        });
    }
    let xfo = get("x-frame-options").to_ascii_lowercase();
    xfo != "deny" && xfo != "sameorigin"
}

pub async fn check(http: &reqwest::Client, url: String, whitelist: &str, own_origin: &str) -> pb::EmbeddableWebsiteAnswer {
    let answer = |state: bool, embeddable: bool, message: Option<&str>| pb::EmbeddableWebsiteAnswer {
        url: url.clone(),
        state,
        embeddable,
        message: message.map(str::to_owned),
    };
    if whitelisted(&url, whitelist) {
        return answer(true, true, None);
    }
    let timeout = Duration::from_secs(5);
    let mut response = http.head(&url).timeout(timeout).send().await;
    if response.as_ref().is_ok_and(|r| r.status() == reqwest::StatusCode::METHOD_NOT_ALLOWED) {
        response = http.get(&url).timeout(timeout).send().await;
    }
    match response {
        Ok(r) if r.status().is_success() || r.status().is_redirection() => answer(true, frameable(r.headers(), own_origin), None),
        // LinkedIn answers 999 to robots: reachable, not embeddable.
        Ok(r) if r.status().as_u16() == 999 => answer(true, false, None),
        _ => answer(false, false, Some("URL is not reachable")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::header::HeaderValue;

    #[test]
    fn whitelist_and_frame_headers() {
        assert!(whitelisted("https://docs.google.com/x", "google.com, klaxoon.com"));
        assert!(whitelisted("https://app.klaxoon.com/join", "google.com,klaxoon.com"));
        assert!(!whitelisted("https://evilgoogle.com/", "google.com"));
        let mut h = HeaderMap::new();
        assert!(frameable(&h, "http://play.test"));
        h.insert("x-frame-options", HeaderValue::from_static("SAMEORIGIN"));
        assert!(!frameable(&h, "http://play.test"));
        h.insert("content-security-policy", HeaderValue::from_static("default-src 'self'; frame-ancestors *.test"));
        assert!(frameable(&h, "http://play.test"));
    }
}
