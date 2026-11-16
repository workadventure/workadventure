//! The Tiled map of a room, read on the server as the back does (MapFetcher), for the variables it declares.
//! A map-storage room reads its TMJ from the storage; another room fetches its map URL, unless it is on a
//! private network (then, as on the back, no checks and no persistence, unless STORE_VARIABLES_FOR_LOCAL_MAPS).

use std::net::IpAddr;
use std::time::Duration;

use wa_core::variables::{self, VariableDef};
use wa_core::wam::Wam;

use crate::AppState;
use crate::local_admin;

const MAX_MAP: usize = 50 * 1024 * 1024;

const LOCAL_MAP: &str = "You are loading a local map. If you use the scripting API in this map, please be aware that server-side checks and variable persistence is disabled.";
const UNREACHABLE_MAP: &str = "Your map does not seem accessible from the WorkAdventure servers. Is it behind a firewall or a proxy? Your map should be accessible from the WorkAdventure servers. If you use the scripting API in this map, please be aware that server-side checks and variable persistence is disabled.";

/// The variable definitions, or None with the warning the users get (VariablesManager with a null map).
pub type Defs = Result<Vec<VariableDef>, &'static str>;

/// GameRoom.getMapDetails: the admin's MapDetailsData (A2, from the back: no user, no language), or the
/// LocalAdmin derivation of the URL.
pub async fn details(app: &AppState, room_url: &str) -> serde_json::Value {
    match &app.admin {
        Some(admin) => admin.map_details(room_url, None, None).await,
        None => local_admin::map_details(&app.config, room_url),
    }
}

/// The storage key of the room's WAM file, if its map lives in this map-storage.
pub fn wam_key(app: &AppState, room_url: &str, details: &serde_json::Value) -> Option<String> {
    match details["wamUrl"].as_str() {
        Some(url) if app.admin.is_some() || app.config.use_domain_name_in_path => {
            crate::map_storage::wam_key_of_url(&app.config, url)
        }
        // Without an admin: the path after `/~/`, as before.
        _ => local_admin::wam_path(room_url),
    }
}

pub async fn variable_defs(app: &AppState, room_url: &str, wam: Option<(&str, &Wam)>) -> Defs {
    Ok(variables::from_tmj(&tmj(app, room_url, wam).await?))
}

/// The room's Tiled map: from the storage for a map-storage room (its WAM given), else from its map URL.
pub async fn tmj(app: &AppState, room_url: &str, wam: Option<(&str, &Wam)>) -> Result<serde_json::Value, &'static str> {
    let map = match wam {
        Some((rel, wam)) => {
            let dir = rel.rsplit_once('/').map_or("", |(d, _)| d);
            let path = normalize(dir, wam.map_url().ok_or(UNREACHABLE_MAP)?);
            app.storage.read(&path).await.ok_or(UNREACHABLE_MAP)?
        }
        None => {
            let details = details(app, room_url).await;
            let url = details["mapUrl"].as_str().ok_or(UNREACHABLE_MAP)?;
            if !app.config.store_variables_for_local_maps && is_local(url).await {
                return Err(LOCAL_MAP);
            }
            fetch(app, url).await.ok_or(UNREACHABLE_MAP)?
        }
    };
    serde_json::from_slice(&map).map_err(|_| UNREACHABLE_MAP)
}

/// MetaTagsBuilder for a bot (link previews): the map's `mapName` and `mapDescription`.
pub async fn tmj_of_page(app: &AppState, room_url: &str) -> Option<serde_json::Value> {
    let rel = local_admin::wam_path(room_url);
    let wam = match &rel {
        Some(rel) => Some(Wam::parse(&app.storage.read(rel).await?)?),
        None => None,
    };
    tmj(app, room_url, rel.as_deref().zip(wam.as_ref())).await.ok()
}

async fn fetch(app: &AppState, url: &str) -> Option<Vec<u8>> {
    let response = match app.http.get(url).timeout(Duration::from_secs(10)).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(%url, error = %e, "could not fetch the map");
            return None;
        }
    };
    if !response.status().is_success() || response.content_length().is_some_and(|l| l as usize > MAX_MAP) {
        tracing::warn!(%url, status = %response.status(), "the map was refused or is too big");
        return None;
    }
    let bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => {
            tracing::warn!(%url, error = %e, "the map could not be read to the end");
            return None;
        }
    };
    (bytes.len() <= MAX_MAP).then(|| bytes.to_vec())
}

fn normalize(dir: &str, rel: &str) -> String {
    let mut parts: Vec<&str> = dir.split('/').filter(|p| !p.is_empty()).collect();
    for p in rel.split('/') {
        match p {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            p => parts.push(p),
        }
    }
    parts.join("/")
}

/// MapFetcher.isLocalUrl: `localhost`, `*.localhost`, or a name with an address that is not public unicast.
pub(crate) async fn is_local(url: &str) -> bool {
    let Ok(parsed) = reqwest::Url::parse(url) else { return true };
    let Some(host) = parsed.host_str() else { return true };
    if host == "localhost" || host.ends_with(".localhost") {
        return true;
    }
    let host = host.trim_start_matches('[').trim_end_matches(']');
    let addresses: Vec<IpAddr> = match host.parse::<IpAddr>() {
        Ok(ip) => vec![ip],
        Err(_) => match tokio::net::lookup_host((host, parsed.port_or_known_default().unwrap_or(80))).await {
            Ok(found) => found.map(|a| a.ip()).collect(),
            Err(_) => return false,
        },
    };
    addresses.into_iter().any(|ip| !is_public_unicast(ip))
}

/// ipaddr.js's "unicast" range.
pub(crate) fn is_public_unicast(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let [a, b, ..] = v4.octets();
            !(v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_unspecified()
                || v4.is_broadcast()
                || v4.is_multicast()
                || v4.is_documentation()
                || a == 0
                || a >= 240
                || (a == 100 && (64..128).contains(&b)))
        }
        IpAddr::V6(v6) => match v6.to_ipv4_mapped() {
            Some(v4) => is_public_unicast(IpAddr::V4(v4)),
            None => {
                let first = v6.segments()[0];
                !(v6.is_loopback()
                    || v6.is_unspecified()
                    || v6.is_multicast()
                    || (first & 0xfe00) == 0xfc00
                    || (first & 0xffc0) == 0xfe80
                    || first == 0x2001 && v6.segments()[1] == 0x0db8)
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn local_and_private_addresses_are_local_public_ones_are_not() {
        for url in [
            "http://localhost/map.json",
            "http://maps.workadventure.localhost/a.json",
            "http://10.1.2.3/a.json",
            "http://192.168.0.1/a.json",
            "http://127.0.0.1:8080/a.json",
            "http://100.64.0.1/a.json",
            "http://[::1]/a.json",
            "http://[fd00::1]/a.json",
        ] {
            assert!(is_local(url).await, "{url}");
        }
        assert!(!is_local("http://8.8.8.8/a.json").await);
        assert!(!is_local("http://[2a00:1450::1]/a.json").await);
        assert_eq!(normalize("maps/sub", "../t.tmj"), "maps/t.tmj");
    }
}
