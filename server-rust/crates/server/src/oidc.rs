//! OpenID Connect login (AuthenticateController + OpenIDClient): authorization code flow with PKCE, then the
//! optional Matrix single sign-on hop, logout and token revocation.
//!
//! The ID token is verified as OIDC Core 3.1.3.7 asks: signature (the provider's JWKS, or the client secret for an
//! HMAC one), `iss` (the discovered issuer), `aud` (this client), `exp`, and the `nonce` this server sent. The PKCE
//! verifier and the nonce travel in one HttpOnly cookie sealed with AES-256-GCM under a key derived from
//! SECRET_KEY: unreadable and unforgeable by the browser.

use std::time::Duration;

use axum::Router;
use axum::extract::{RawQuery, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use base64::Engine;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::AppState;
use crate::front::query_pairs;
use crate::jwt::{self, Claims};

pub struct OidcConfig {
    pub client_id: String,
    pub client_secret: String,
    pub issuer: String,
    pub scope: String,
    pub prompt: Option<String>,
    pub username_claim: String,
    pub locale_claim: String,
    pub tags_claim: String,
    pub redirect_url: String,
}

impl OidcConfig {
    /// `None` when no OpenID provider is configured.
    pub fn from(config: &crate::config::Config) -> Option<Self> {
        let get = |new: &str, old: &str| {
            config
                .raw
                .get(new)
                .filter(|v| !v.is_empty())
                .or_else(|| config.raw.get(old).filter(|v| !v.is_empty()))
                .cloned()
        };
        let client_id = get("OPENID_CLIENT_ID", "OPID_CLIENT_ID")?;
        let deprecated = config.raw.keys().any(|k| k.starts_with("OPID_"));
        Some(Self {
            client_id,
            client_secret: get("OPENID_CLIENT_SECRET", "OPID_CLIENT_SECRET").unwrap_or_default(),
            issuer: get("OPENID_CLIENT_ISSUER", "OPID_CLIENT_ISSUER").unwrap_or_default(),
            scope: get("OPENID_SCOPE", "OPID_SCOPE").unwrap_or_else(|| "openid email profile ".into()),
            prompt: get("OPENID_PROMPT", "OPID_PROMPT").or_else(|| deprecated.then(|| "login".into())),
            username_claim: get("OPENID_USERNAME_CLAIM", "OPID_USERNAME_CLAIM").unwrap_or_else(|| "username".into()),
            locale_claim: get("OPENID_LOCALE_CLAIM", "OPID_LOCALE_CLAIM").unwrap_or_else(|| "locale".into()),
            tags_claim: get("OPENID_TAGS_CLAIM", "OPID_TAGS_CLAIM").unwrap_or_else(|| "tags".into()),
            redirect_url: format!("{}/openid-callback", config.pusher_url.trim_end_matches('/')),
        })
    }
}

#[derive(Clone)]
pub struct Provider {
    issuer: String,
    jwks_uri: Option<String>,
    authorization_endpoint: String,
    token_endpoint: String,
    userinfo_endpoint: String,
    revocation_endpoint: Option<String>,
}

async fn provider(state: &AppState) -> Result<Provider, String> {
    if let Some(p) = state.oidc_provider.lock().clone() {
        return Ok(p);
    }
    let oidc = state.oidc.as_ref().ok_or("OpenID is not configured")?;
    let url = format!("{}/.well-known/openid-configuration", oidc.issuer.trim_end_matches('/'));
    let meta: Value = state
        .http
        .get(&url)
        .timeout(Duration::from_secs(50))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let field = |k: &str| meta[k].as_str().map(str::to_owned);
    let p = Provider {
        issuer: field("issuer").ok_or("no issuer")?,
        jwks_uri: field("jwks_uri"),
        authorization_endpoint: field("authorization_endpoint").ok_or("no authorization_endpoint")?,
        token_endpoint: field("token_endpoint").ok_or("no token_endpoint")?,
        userinfo_endpoint: field("userinfo_endpoint").ok_or("no userinfo_endpoint")?,
        revocation_endpoint: field("revocation_endpoint"),
    };
    *state.oidc_provider.lock() = Some(p.clone());
    Ok(p)
}

fn cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| v.split(';'))
        .filter_map(|c| c.trim().split_once('='))
        .find(|(k, _)| *k == name)
        .map(|(_, v)| percent_decode(v))
}

fn percent_decode(v: &str) -> String {
    form_urlencoded::parse(format!("x={}", v.replace('+', "%2B")).as_bytes())
        .next()
        .map(|(_, v)| v.into_owned())
        .unwrap_or_default()
}

fn set_cookie(name: &str, value: &str) -> String {
    let encoded: String = form_urlencoded::byte_serialize(value.as_bytes()).collect();
    format!("{name}={encoded}; Path=/; HttpOnly")
}

fn clear_cookie(name: &str) -> String {
    format!("{name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT")
}

fn host_of(url: &str) -> Option<String> {
    let rest = url.split_once("://")?.1;
    let authority = rest.split(['/', '?', '#']).next()?;
    let host = authority.rsplit_once('@').map_or(authority, |(_, h)| h);
    Some(host.split(':').next()?.to_ascii_lowercase())
}

/// Where the browser may be sent back after a login or a logout: the admin decides (A21, white label hosts),
/// else LocalVerifyDomainService: only this server's own host.
async fn same_domain(state: &AppState, play_uri: &str) -> bool {
    if let Some(admin) = state.admin.as_ref().filter(|a| a.has("api/domain/verify")) {
        return admin.verify_domain(play_uri).await;
    }
    host_of(play_uri).is_some() && host_of(play_uri) == host_of(&state.config.pusher_url)
}

fn redirect(to: &str, cookies: &[String]) -> Response {
    let mut r = (StatusCode::FOUND, [(header::LOCATION, to.to_owned())]).into_response();
    for c in cookies {
        if let Ok(v) = c.parse() {
            r.headers_mut().append(header::SET_COOKIE, v);
        }
    }
    r
}

fn cookie_key(secret: &str) -> aws_lc_rs::aead::LessSafeKey {
    let key = Sha256::digest(format!("workadventure oidc cookie:{secret}").as_bytes());
    let key = aws_lc_rs::aead::UnboundKey::new(&aws_lc_rs::aead::AES_256_GCM, &key).expect("a 32-byte key");
    aws_lc_rs::aead::LessSafeKey::new(key)
}

/// `nonce || ciphertext || tag`, base64url.
fn seal(secret: &str, plain: &str) -> String {
    let mut nonce = [0u8; 12];
    aws_lc_rs::rand::fill(&mut nonce).expect("system randomness");
    let mut data = plain.as_bytes().to_vec();
    cookie_key(secret)
        .seal_in_place_append_tag(
            aws_lc_rs::aead::Nonce::assume_unique_for_key(nonce),
            aws_lc_rs::aead::Aad::empty(),
            &mut data,
        )
        .expect("sealing");
    URL_SAFE_NO_PAD.encode([nonce.as_slice(), &data].concat())
}

fn unseal(secret: &str, sealed: &str) -> Option<String> {
    let raw = URL_SAFE_NO_PAD.decode(sealed).ok()?;
    let (nonce, rest) = raw.split_at_checked(12)?;
    let nonce = aws_lc_rs::aead::Nonce::try_assume_unique_for_key(nonce).ok()?;
    let mut data = rest.to_vec();
    let plain = cookie_key(secret).open_in_place(nonce, aws_lc_rs::aead::Aad::empty(), &mut data).ok()?;
    String::from_utf8(plain.to_vec()).ok()
}

/// The id_token: signed by the provider, for this client, not expired, carrying the nonce of this login.
async fn verify_id_token(state: &AppState, p: &Provider, id_token: &str, nonce: &str) -> Result<(), String> {
    use jsonwebtoken::{Algorithm, DecodingKey, Validation, jwk::JwkSet};
    let oidc = state.oidc.as_ref().ok_or("OpenID is not configured")?;
    let header = jsonwebtoken::decode_header(id_token).map_err(|e| e.to_string())?;
    let key = if matches!(header.alg, Algorithm::HS256 | Algorithm::HS384 | Algorithm::HS512) {
        DecodingKey::from_secret(oidc.client_secret.as_bytes())
    } else {
        let uri = p.jwks_uri.as_deref().ok_or("no jwks_uri")?;
        let r = state.http.get(uri).timeout(Duration::from_secs(50)).send().await.map_err(|e| e.to_string())?;
        let keys: JwkSet = r.json().await.map_err(|e| e.to_string())?;
        let jwk = match &header.kid {
            Some(kid) => keys.find(kid),
            None => keys.keys.first(),
        }
        .ok_or("no key of the JWKS matches the id_token")?;
        DecodingKey::from_jwk(jwk).map_err(|e| e.to_string())?
    };
    let mut v = Validation::new(header.alg);
    v.set_issuer(&[&p.issuer]);
    v.set_audience(&[&oidc.client_id]);
    v.set_required_spec_claims(&["exp", "iss", "aud"]);
    v.leeway = 60;
    let claims = jsonwebtoken::decode::<Value>(id_token, &key, &v).map_err(|e| e.to_string())?.claims;
    if claims["nonce"].as_str() != Some(nonce) {
        return Err("the id_token's nonce is not this login's".into());
    }
    Ok(())
}

fn random_token() -> String {
    URL_SAFE_NO_PAD.encode([uuid::Uuid::new_v4().as_bytes().as_slice(), uuid::Uuid::new_v4().as_bytes()].concat())
}

async fn login_screen(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let pairs = query_pairs(q.as_deref());
    let get = |k: &str| pairs.iter().find(|(key, _)| key == k).map(|(_, v)| v.clone());
    let Some(play_uri) = get("playUri") else {
        return (StatusCode::BAD_REQUEST, axum::Json(serde_json::json!(["Parameter playUri: Required"])))
            .into_response();
    };
    if !same_domain(&state, &play_uri).await {
        return (StatusCode::FORBIDDEN, "Unauthorized domain in playUri").into_response();
    }
    let (Some(oidc), Ok(p)) = (state.oidc.as_ref(), provider(&state).await) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "OpenID provider unavailable").into_response();
    };
    if !oidc.scope.contains("email") || !oidc.scope.contains("openid") {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid scope, 'email' and 'openid' are required").into_response();
    }
    let verifier = random_token();
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let oidc_state = uuid::Uuid::new_v4().to_string();
    let nonce = random_token();
    let mut params = form_urlencoded::Serializer::new(String::new());
    params
        .append_pair("client_id", &oidc.client_id)
        .append_pair("scope", &oidc.scope)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", &oidc.redirect_url)
        .append_pair("state", &oidc_state)
        .append_pair("nonce", &nonce)
        .append_pair("playUri", &play_uri);
    if let Some(prompt) = &oidc.prompt {
        params.append_pair("prompt", prompt);
    }
    for k in ["manuallyTriggered", "chatRoomId", "providerId"] {
        if let Some(v) = get(k) {
            params.append_pair(k, &v);
        }
    }
    let scopes: Vec<&str> = pairs
        .iter()
        .filter(|(k, _)| k == "providerScopes" || k == "providerScopes[]")
        .map(|(_, v)| v.as_str())
        .collect();
    if !scopes.is_empty() {
        params.append_pair("providerScopes", &scopes.join(","));
    }
    params.append_pair("code_challenge", &challenge).append_pair("code_challenge_method", "S256");
    let sep = if p.authorization_endpoint.contains('?') { '&' } else { '?' };
    redirect(
        &format!("{}{sep}{}", p.authorization_endpoint, params.finish()),
        &[
            set_cookie(
                "code_verifier",
                &seal(&state.config.secret_key, &serde_json::json!([verifier, nonce]).to_string()),
            ),
            set_cookie("oidc_state", &oidc_state),
            set_cookie("playUri", &play_uri),
        ],
    )
}

/// The provider's claims for an access token.
async fn userinfo(state: &AppState, p: &Provider, access_token: &str, play_uri: Option<&str>) -> Result<Value, String> {
    let mut req = state.http.get(&p.userinfo_endpoint).bearer_auth(access_token).timeout(Duration::from_secs(50));
    if let Some(uri) = play_uri {
        req = req.query(&[("playUri", uri)]);
    }
    let r = req.send().await.map_err(|e| e.to_string())?;
    if !r.status().is_success() {
        return Err(format!("userinfo answered {}", r.status()));
    }
    r.json().await.map_err(|e| e.to_string())
}

fn basic_auth(oidc: &OidcConfig) -> String {
    let enc = |s: &str| form_urlencoded::byte_serialize(s.as_bytes()).collect::<String>();
    format!("Basic {}", STANDARD.encode(format!("{}:{}", enc(&oidc.client_id), enc(&oidc.client_secret))))
}

/// The access token and the id_token.
async fn exchange_code(state: &AppState, p: &Provider, code: &str, verifier: &str) -> Result<(String, String), String> {
    let oidc = state.oidc.as_ref().ok_or("OpenID is not configured")?;
    let body = form_urlencoded::Serializer::new(String::new())
        .append_pair("grant_type", "authorization_code")
        .append_pair("code", code)
        .append_pair("redirect_uri", &oidc.redirect_url)
        .append_pair("code_verifier", verifier)
        .finish();
    let r = state
        .http
        .post(&p.token_endpoint)
        .header(header::AUTHORIZATION, basic_auth(oidc))
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(body)
        .timeout(Duration::from_secs(50))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let tokens: Value = r.json().await.map_err(|e| e.to_string())?;
    let text = |k: &str| tokens[k].as_str().map(str::to_owned);
    match (text("access_token"), text("id_token")) {
        (Some(access), Some(id)) => Ok((access, id)),
        _ => Err(format!("no access token or no id_token: {tokens}")),
    }
}

fn escape_html(s: &str) -> String {
    let mut out = String::new();
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            '/' => out.push_str("&#x2F;"),
            '`' => out.push_str("&#x60;"),
            '=' => out.push_str("&#x3D;"),
            c => out.push(c),
        }
    }
    out
}

fn html(body: String, cookies: &[String]) -> Response {
    let mut r = ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], body).into_response();
    for c in cookies {
        if let Ok(v) = c.parse() {
            r.headers_mut().append(header::SET_COOKIE, v);
        }
    }
    r
}

async fn openid_callback(State(state): State<AppState>, headers: HeaderMap, RawQuery(q): RawQuery) -> Response {
    let fail =
        || (StatusCode::INTERNAL_SERVER_ERROR, "An error occurred while connecting to OpenID Provider").into_response();
    let Some(play_uri) = cookie(&headers, "playUri") else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Missing playUri in cookies").into_response();
    };
    let sealed = cookie(&headers, "code_verifier").and_then(|c| unseal(&state.config.secret_key, &c));
    let flow: Option<(String, String)> = sealed.and_then(|s| serde_json::from_str(&s).ok());
    let (Some(oidc), Some((verifier, nonce))) = (state.oidc.as_ref(), flow) else {
        tracing::error!("OpenID callback: no OpenID configuration or no readable code_verifier cookie");
        return fail();
    };
    let pairs = query_pairs(q.as_deref());
    let get = |k: &str| pairs.iter().find(|(key, _)| key == k).map(|(_, v)| v.clone());
    // The state must come back, and be this browser's.
    match (cookie(&headers, "oidc_state"), get("state")) {
        (Some(expected), Some(got)) if expected == got => {}
        (expected, got) => {
            tracing::error!(cookie = expected.is_some(), param = got.is_some(), "OpenID callback: state mismatch");
            return fail();
        }
    }
    let Some(code) = get("code") else {
        tracing::error!("OpenID callback: no code");
        return fail();
    };
    let Ok(p) = provider(&state).await else {
        tracing::error!("OpenID callback: provider metadata unavailable");
        return fail();
    };
    let access_token = match exchange_code(&state, &p, &code, &verifier).await {
        Ok((access, id_token)) => match verify_id_token(&state, &p, &id_token, &nonce).await {
            Ok(()) => access,
            Err(e) => {
                tracing::error!(error = %e, "OpenID id_token refused");
                return fail();
            }
        },
        Err(e) => {
            tracing::error!(error = %e, "OpenID code exchange failed");
            return fail();
        }
    };
    let info = match userinfo(&state, &p, &access_token, Some(&play_uri)).await {
        Ok(i) => i,
        Err(e) => {
            tracing::error!(error = %e, "OpenID userinfo failed");
            return fail();
        }
    };
    let text = |k: &str| info[k].as_str().filter(|s| !s.is_empty()).map(str::to_owned);
    let Some(email) = text("email").or_else(|| text("sub")) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "No email in the response").into_response();
    };
    let tags = match &info[oidc.tags_claim.as_str()] {
        Value::Array(a) => Some(a.iter().filter_map(|t| t.as_str().map(str::to_owned)).collect()),
        _ => None,
    };
    let token = jwt::create(
        &state.config.secret_key,
        Claims {
            identifier: email.clone(),
            access_token: Some(access_token),
            username: text(&oidc.username_claim),
            locale: text(&oidc.locale_claim),
            tags,
            matrix_user_id: Some(email.replacen('@', "_", 1)),
        },
    );
    let consumed = [clear_cookie("code_verifier"), clear_cookie("oidc_state")];
    let matrix =
        text("matrix_url").or_else(|| state.config.raw.get("MATRIX_PUBLIC_URI").filter(|v| !v.is_empty()).cloned());
    if let Some(matrix) = matrix {
        // The token can be larger than a cookie: it goes through localStorage.
        let callback = format!("{}/matrix-callback", state.config.pusher_url.trim_end_matches('/'));
        let mut path = "/_matrix/client/v3/login/sso/redirect".to_owned();
        if let Some(idp) = text("matrix_identity_provider") {
            path = format!("{path}/{idp}");
        }
        let callback: String = form_urlencoded::byte_serialize(callback.as_bytes()).collect();
        let target = format!("{}{path}?redirectUrl={callback}", matrix.trim_end_matches('/'));
        return html(
            format!(
                "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <script>\n        // The authToken can be bigger than the cookie limit max size so we need to use localStorage to store it.\n        window.localStorage.setItem(\"authToken\", \"{}\");\n\n        window.location.href = \"{target}\";\n    </script>\n</head>\n<body>\n</body>\n</html>",
                escape_html(&token)
            ),
            &consumed,
        );
    }
    let mut cookies = consumed.to_vec();
    cookies.push(clear_cookie("playUri"));
    // A JWT only has URL-safe characters.
    redirect(&format!("{play_uri}?token={token}"), &cookies)
}

async fn matrix_callback(headers: HeaderMap, RawQuery(q): RawQuery) -> Response {
    let Some(play_uri) = cookie(&headers, "playUri") else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Missing playUri in cookies").into_response();
    };
    let pairs = query_pairs(q.as_deref());
    let get = |k: &str| pairs.iter().find(|(key, _)| key == k).map(|(_, v)| v.clone());
    let Some(login_token) = get("loginToken") else {
        return (StatusCode::BAD_REQUEST, axum::Json(serde_json::json!(["Parameter loginToken: Required"])))
            .into_response();
    };
    let mut extra = form_urlencoded::Serializer::new(String::new());
    extra.append_pair("matrixLoginToken", &login_token);
    if let Some(room) = get("chatRoomId") {
        extra.append_pair("chatRoomId", &room);
    }
    let sep = if play_uri.contains('?') { '&' } else { '?' };
    let play = format!("{play_uri}{sep}{}", extra.finish());
    html(
        format!(
            "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <script>\n        // The authToken can be bigger than the cookie limit max size so we need to use localStorage to store it.\n        const token = window.localStorage.getItem(\"authToken\");\n\n        const playUrl = new URL(\"{play}\");\n        playUrl.searchParams.append(\"token\", token);\n\n\n        window.location.href = playUrl.toString();\n    </script>\n</head>\n<body>\n</body>\n</html>"
        ),
        &[clear_cookie("playUri"), clear_cookie("authToken")],
    )
}

async fn logout(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let pairs = query_pairs(q.as_deref());
    let get = |k: &str| pairs.iter().find(|(key, _)| key == k).map(|(_, v)| v.clone());
    let (Some(play_uri), Some(token)) = (get("playUri"), get("token")) else {
        return (StatusCode::BAD_REQUEST, axum::Json(serde_json::json!(["Parameter playUri or token: Required"])))
            .into_response();
    };
    if !same_domain(&state, &play_uri).await {
        return (StatusCode::FORBIDDEN, "Unauthorized domain in playUri").into_response();
    }
    let Some(access_token) = jwt::verify(&state.config.secret_key, &token).ok().and_then(|c| c.access_token) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Cannot log out, no access token found.").into_response();
    };
    if let (Ok(p), Some(oidc)) = (provider(&state).await, state.oidc.as_ref())
        && let Some(revocation) = &p.revocation_endpoint
    {
        let body = form_urlencoded::Serializer::new(String::new()).append_pair("token", &access_token).finish();
        let revoked = state
            .http
            .post(revocation)
            .header(header::AUTHORIZATION, basic_auth(oidc))
            .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
            .body(body)
            .timeout(Duration::from_secs(10))
            .send()
            .await;
        if let Err(e) = revoked {
            tracing::warn!(error = %e, "OpenID token revocation failed");
        }
    }
    match get("redirect") {
        None => redirect(&play_uri, &[]),
        Some(to) => redirect(&to, &[set_cookie("playUri", &play_uri)]),
    }
}

async fn logout_callback(State(state): State<AppState>, headers: HeaderMap) -> Response {
    match cookie(&headers, "playUri") {
        None => redirect(&state.config.front_url, &[]),
        Some(play_uri) => redirect(&play_uri, &[clear_cookie("playUri")]),
    }
}

/// `/me` for a token that carries an OpenID access token: the provider must still accept it.
pub async fn check_access_token(state: &AppState, access_token: &str) -> Option<Value> {
    let p = provider(state).await.ok()?;
    userinfo(state, &p, access_token, None).await.ok()
}

/// `/profile-callback?token&playUri`: on to the admin's profile screen (OPID_PROFILE_SCREEN_PROVIDER), or to
/// `/profile` without an admin, once the provider still accepts the token. The values go unencoded, as the pusher
/// sends them.
async fn profile_callback(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let pairs = query_pairs(q.as_deref());
    let get = |k: &str| pairs.iter().find(|(n, _)| n == k).map(|(_, v)| v.clone());
    let (Some(token), Some(play_uri)) = (get("token"), get("playUri")) else {
        return (StatusCode::BAD_REQUEST, "token and playUri are required").into_response();
    };
    let failed =
        || (StatusCode::INTERNAL_SERVER_ERROR, "Token cannot be checked on OpenID connect provider").into_response();
    let Some(access_token) = jwt::verify(&state.config.secret_key, &token).ok().and_then(|c| c.access_token) else {
        return failed();
    };
    if check_access_token(&state, &access_token).await.is_none() {
        return failed();
    }
    let screen = match &state.admin {
        Some(_) => match state.config.raw.get("OPID_PROFILE_SCREEN_PROVIDER").filter(|p| !p.is_empty()) {
            Some(p) => p.clone(),
            None => return (StatusCode::INTERNAL_SERVER_ERROR, "No admin backoffice set!").into_response(),
        },
        None => "/profile".to_owned(),
    };
    redirect(&format!("{screen}?accessToken={access_token}&playUri={play_uri}"), &[])
}

/// `/profile?accessToken`: what the provider says of the user (OpenIdProfileController), escaped here.
async fn profile(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let pairs = query_pairs(q.as_deref());
    let Some(access_token) = pairs.iter().find(|(n, _)| n == "accessToken").map(|(_, v)| v.clone()) else {
        return (StatusCode::BAD_REQUEST, "accessToken is required").into_response();
    };
    let Some(info) = check_access_token(&state, &access_token).await else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Token cannot be checked on OpenID connect provider")
            .into_response();
    };
    let field = |label: &str, v: Option<String>| {
        v.map(|v| format!(r#"<p style="margin: 0;font-size: 12px;">{label}</p><p style="margin: 0 0 5px 0;font-weight: bold;">{}</p>"#, escape_html(&v)))
    };
    let tags = info["tags"].as_array().map(|t| t.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(", "));
    let lines: Vec<String> = [
        field("Your email or application id:", info["email"].as_str().map(str::to_owned)),
        field("Your name:", info["name"].as_str().map(str::to_owned)),
        field("Your access right:", tags),
    ]
    .into_iter()
    .flatten()
    .collect();
    let body = if lines.is_empty() {
        r#"<p style="margin: 0;">No information about your profile provided 😱</p>"#.to_owned()
    } else {
        lines.concat()
    };
    let picture = escape_html(info["profile"].as_str().unwrap_or("/static/images/logo-WA-min.png"));
    let domain = escape_html(state.oidc.as_ref().map_or("", |o| o.issuer.as_str()));
    let html = format!(
        r#"<!DOCTYPE html><html><head><style>*{{font-family: Roboto, monospace;}} body{{text-align: center;}} section{{margin: 20px;}}</style></head>
<body><div class="container"><section><img src="{picture}"></section>
<section>Profile validated by domain: <span style="font-weight: bold">{domain}</span></section><section>{body}</section></div></body></html>"#
    );
    ([(header::CONTENT_TYPE, "text/html")], html).into_response()
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/profile", get(profile))
        .route("/profile-callback", get(profile_callback))
        .route("/login-screen", get(login_screen))
        .route("/openid-callback", get(openid_callback))
        .route("/matrix-callback", get(matrix_callback))
        .route("/logout", get(logout))
        .route("/logout-callback", get(logout_callback))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cookies_round_trip_through_encoding() {
        let mut h = HeaderMap::new();
        let set = set_cookie("playUri", "http://play.x/_/g/m.json?a=1&b=2");
        let value = set.split(';').next().unwrap();
        h.insert(header::COOKIE, format!("other=1; {value}").parse().unwrap());
        assert_eq!(cookie(&h, "playUri").as_deref(), Some("http://play.x/_/g/m.json?a=1&b=2"));
        assert_eq!(cookie(&h, "missing"), None);
    }

    #[test]
    fn domains_compare_hosts_only() {
        assert_eq!(host_of("http://Play.X:8880/a"), Some("play.x".into()));
        assert_eq!(host_of("nope"), None);
    }
}
