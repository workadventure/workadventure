//! `embeddableWebsiteQuery` (SocketManager.handleEmbeddableWebsiteQuery): can the front show a site in an iframe?
//! Domains of EMBEDDED_DOMAINS_WHITELIST can; others are asked (HEAD, GET when HEAD is not allowed, 5 s) and
//! judged on their CSP `frame-ancestors` and `X-Frame-Options` (EmbeddableHeaders.isFrameable).
//!
//! Unlike the pusher, the server never asks an address of a private network (loopback, RFC 1918, ULA, link-local,
//! CGNAT, multicast...): not at connection time (the resolver drops them, so a name rebound between check and
//! connect is still refused) and not after a redirection. A site on a private network is answered embeddable
//! without being asked: the user's browser, not this server, is the one that loads it.

use std::net::SocketAddr;
use std::sync::LazyLock;
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
    if let Some(ancestors) =
        csp.split(';').map(|d| d.trim().to_ascii_lowercase()).find(|d| d.starts_with("frame-ancestors"))
    {
        let own = host_of(own_origin).unwrap_or_default();
        return ancestors.split_whitespace().skip(1).any(|source| {
            let host = source.split_once("://").map_or(source, |(_, h)| h);
            source == "*" || source == "https:" || host == own || (host.starts_with("*.") && own.ends_with(&host[1..]))
        });
    }
    let xfo = get("x-frame-options").to_ascii_lowercase();
    xfo != "deny" && xfo != "sameorigin"
}

/// Resolves names to their public addresses only.
struct PublicOnly;

impl reqwest::dns::Resolve for PublicOnly {
    fn resolve(&self, name: reqwest::dns::Name) -> reqwest::dns::Resolving {
        Box::pin(async move {
            let found = tokio::net::lookup_host((name.as_str(), 0)).await?;
            let public: Vec<SocketAddr> = found.filter(|a| crate::room_map::is_public_unicast(a.ip())).collect();
            if public.is_empty() {
                return Err(format!("{} has no public address", name.as_str()).into());
            }
            Ok(Box::new(public.into_iter()) as reqwest::dns::Addrs)
        })
    }
}

/// An address literal of a private network (the resolver does not see those).
fn private_literal(url: &reqwest::Url) -> bool {
    let Some(host) = url.host_str() else { return true };
    match host.trim_start_matches('[').trim_end_matches(']').parse::<std::net::IpAddr>() {
        Ok(ip) => !crate::room_map::is_public_unicast(ip),
        Err(_) => host == "localhost" || host.ends_with(".localhost"),
    }
}

static PUBLIC_HTTP: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .dns_resolver(std::sync::Arc::new(PublicOnly))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 10 {
                attempt.error("too many redirects")
            } else if private_literal(attempt.url()) {
                // Not followed: the redirection itself is the answer.
                attempt.stop()
            } else {
                attempt.follow()
            }
        }))
        .build()
        .expect("HTTP client")
});

pub async fn check(url: String, whitelist: &str, own_origin: &str) -> pb::EmbeddableWebsiteAnswer {
    let answer = |state: bool, embeddable: bool, message: Option<&str>| pb::EmbeddableWebsiteAnswer {
        url: url.clone(),
        state,
        embeddable,
        message: message.map(str::to_owned),
    };
    if whitelisted(&url, whitelist) {
        return answer(true, true, None);
    }
    if crate::room_map::is_local(&url).await {
        return answer(true, true, None);
    }
    let http = &*PUBLIC_HTTP;
    let timeout = Duration::from_secs(5);
    let mut response = http.head(&url).timeout(timeout).send().await;
    if response.as_ref().is_ok_and(|r| r.status() == reqwest::StatusCode::METHOD_NOT_ALLOWED) {
        response = http.get(&url).timeout(timeout).send().await;
    }
    match response {
        Ok(r) if r.status().is_success() || r.status().is_redirection() => {
            answer(true, frameable(r.headers(), own_origin), None)
        }
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

#[cfg(test)]
mod ssrf {
    use super::*;

    #[tokio::test]
    async fn private_networks_are_never_asked() {
        for url in [
            "http://127.0.0.1:1/",
            "http://[::1]/",
            "http://169.254.169.254/latest/meta-data",
            "http://10.0.0.1/",
            "http://localhost/",
        ] {
            assert!(private_literal(&reqwest::Url::parse(url).unwrap()), "{url}");
            // Answered without a request (nothing listens on 127.0.0.1:1).
            let a = check(url.into(), "", "http://play.test").await;
            assert!(a.state && a.embeddable, "{url}");
        }
        assert!(!private_literal(&reqwest::Url::parse("https://93.184.216.34/").unwrap()));
        // The resolver refuses a name that only has private addresses.
        let r = reqwest::dns::Resolve::resolve(&PublicOnly, "localhost".parse().unwrap()).await;
        assert!(r.is_err());
    }
}
