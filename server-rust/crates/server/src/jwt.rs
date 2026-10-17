//! The authentication token (JWTTokenManager): HS256 signed with SECRET_KEY, header `{"alg":"HS256"}`,
//! valid 30 days. Written by hand rather than with a JWT library: the format must match byte for byte what
//! the pusher issued, and HS256 is only an HMAC.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use hmac::{Hmac, KeyInit, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

const VALIDITY_SECS: u64 = 30 * 24 * 3600;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Claims {
    pub identifier: String,
    #[serde(rename = "accessToken", skip_serializing_if = "Option::is_none")]
    pub access_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(default, deserialize_with = "tags", skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(rename = "matrixUserId", skip_serializing_if = "Option::is_none")]
    pub matrix_user_id: Option<String>,
}

/// Tags may come as a JSON-encoded string (AuthTokenData's preprocess).
fn tags<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Option<Vec<String>>, D::Error> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum T {
        List(Vec<String>),
        Text(String),
    }
    Ok(match Option::<T>::deserialize(d)? {
        None => None,
        Some(T::List(l)) => Some(l),
        Some(T::Text(s)) => Some(serde_json::from_str(&s).unwrap_or_else(|_| vec![s])),
    })
}

#[derive(Serialize, Deserialize)]
struct Payload {
    #[serde(flatten)]
    claims: Claims,
    exp: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub struct InvalidToken;

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
}

fn mac(secret: &str) -> Hmac<Sha256> {
    Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length")
}

pub fn create(secret: &str, claims: Claims) -> String {
    create_at(secret, claims, now())
}

fn create_at(secret: &str, claims: Claims, now: u64) -> String {
    // Serialized from the struct, not a Value: the field order is the pusher's, byte for byte.
    let payload = Payload {
        claims,
        exp: now + VALIDITY_SECS,
    };
    sign_raw(secret, &serde_json::to_vec(&payload).expect("claims serialize"))
}

/// Any payload, which carries its own `exp` (seconds).
pub fn sign(secret: &str, payload: &serde_json::Value) -> String {
    sign_raw(secret, payload.to_string().as_bytes())
}

fn sign_raw(secret: &str, payload: &[u8]) -> String {
    let header = URL_SAFE_NO_PAD.encode(br#"{"alg":"HS256"}"#);
    let signing_input = format!("{header}.{}", URL_SAFE_NO_PAD.encode(payload));
    let mut m = mac(secret);
    m.update(signing_input.as_bytes());
    format!("{signing_input}.{}", URL_SAFE_NO_PAD.encode(m.finalize().into_bytes()))
}

/// The payload of a token signed with `secret` and not expired.
pub fn open(secret: &str, token: &str) -> Result<serde_json::Value, InvalidToken> {
    open_at(secret, token, now())
}

pub fn now_secs() -> u64 {
    now()
}

/// Any failure (signature, expiry, shape) is the same error, like the pusher's "Token is invalid".
pub fn verify(secret: &str, token: &str) -> Result<Claims, InvalidToken> {
    verify_at(secret, token, now())
}

/// The payload of a token signed with `secret`, which may carry no `exp` (the admin socket's).
pub fn open_unexpiring(secret: &str, token: &str) -> Result<serde_json::Value, InvalidToken> {
    let (signing_input, signature) = token.rsplit_once('.').ok_or(InvalidToken)?;
    let (header, payload) = signing_input.split_once('.').ok_or(InvalidToken)?;
    let decode = |part: &str| URL_SAFE_NO_PAD.decode(part).map_err(|_| InvalidToken);
    let header: serde_json::Value = serde_json::from_slice(&decode(header)?).map_err(|_| InvalidToken)?;
    if header["alg"] != "HS256" {
        return Err(InvalidToken);
    }
    let mut m = mac(secret);
    m.update(signing_input.as_bytes());
    m.verify_slice(&decode(signature)?).map_err(|_| InvalidToken)?;
    let payload: serde_json::Value = serde_json::from_slice(&decode(payload)?).map_err(|_| InvalidToken)?;
    if payload["exp"].as_u64().is_some_and(|exp| exp <= now()) {
        return Err(InvalidToken);
    }
    Ok(payload)
}

/// The claims of a token signed with `secret`, expired or not (GET /map reads the user from it either way).
pub fn verify_ignoring_expiry(secret: &str, token: &str) -> Result<Claims, InvalidToken> {
    verify_at(secret, token, 0)
}

fn verify_at(secret: &str, token: &str, now: u64) -> Result<Claims, InvalidToken> {
    serde_json::from_value::<Payload>(open_at(secret, token, now)?)
        .map(|p| p.claims)
        .map_err(|_| InvalidToken)
}

fn open_at(secret: &str, token: &str, now: u64) -> Result<serde_json::Value, InvalidToken> {
    let (signing_input, signature) = token.rsplit_once('.').ok_or(InvalidToken)?;
    let (header, payload) = signing_input.split_once('.').ok_or(InvalidToken)?;
    let decode = |part: &str| URL_SAFE_NO_PAD.decode(part).map_err(|_| InvalidToken);
    let header: serde_json::Value = serde_json::from_slice(&decode(header)?).map_err(|_| InvalidToken)?;
    if header["alg"] != "HS256" {
        return Err(InvalidToken);
    }
    let mut m = mac(secret);
    m.update(signing_input.as_bytes());
    m.verify_slice(&decode(signature)?).map_err(|_| InvalidToken)?;
    let payload: serde_json::Value = serde_json::from_slice(&decode(payload)?).map_err(|_| InvalidToken)?;
    if payload["exp"].as_u64().is_none_or(|exp| exp <= now) {
        return Err(InvalidToken);
    }
    Ok(payload)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn anonymous() -> Claims {
        Claims {
            identifier: "9b1d".into(),
            ..Claims::default()
        }
    }

    #[test]
    fn round_trip() {
        let t = create("secret", anonymous());
        assert_eq!(verify("secret", &t), Ok(anonymous()));
        assert!(t.starts_with("eyJhbGciOiJIUzI1NiJ9."), "header is exactly {{\"alg\":\"HS256\"}}");
    }

    #[test]
    fn rejects_a_wrong_secret_a_tampered_payload_and_an_expired_token() {
        let t = create("secret", anonymous());
        assert_eq!(verify("other", &t), Err(InvalidToken));
        let mut parts: Vec<&str> = t.split('.').collect();
        let forged = URL_SAFE_NO_PAD.encode(br#"{"identifier":"admin","exp":99999999999}"#);
        parts[1] = &forged;
        assert_eq!(verify("secret", &parts.join(".")), Err(InvalidToken));
        let old = create_at("secret", anonymous(), 0);
        assert_eq!(verify_at("secret", &old, VALIDITY_SECS), Err(InvalidToken));
        assert_eq!(verify("secret", "garbage"), Err(InvalidToken));
    }

    #[test]
    fn same_bytes_as_the_typescript_pusher() {
        // jose: new SignJWT({identifier: "abc", tags: ["admin"]}).setExpirationTime(4102444800)
        //   .setProtectedHeader({alg: "HS256"}).sign("s3cr3t")
        let from_jose = "eyJhbGciOiJIUzI1NiJ9.eyJpZGVudGlmaWVyIjoiYWJjIiwidGFncyI6WyJhZG1pbiJdLCJleHAiOjQxMDI0NDQ4MDB9.tX8v_cx2RIL1GtfwonC0K5PYC0e5wtnVoRygZ5M5kB0";
        let claims = Claims {
            identifier: "abc".into(),
            tags: Some(vec!["admin".into()]),
            ..Claims::default()
        };
        assert_eq!(create_at("s3cr3t", claims.clone(), 4102444800 - VALIDITY_SECS), from_jose);
        assert_eq!(verify_at("s3cr3t", from_jose, 0), Ok(claims));
    }

    #[test]
    fn a_tag_list_sent_as_a_string_is_accepted() {
        let payload = URL_SAFE_NO_PAD.encode(br#"{"identifier":"x","tags":"[\"a\"]","exp":4102444800}"#);
        let input = format!("eyJhbGciOiJIUzI1NiJ9.{payload}");
        let mut m = mac("k");
        m.update(input.as_bytes());
        let t = format!("{input}.{}", URL_SAFE_NO_PAD.encode(m.finalize().into_bytes()));
        assert_eq!(verify_at("k", &t, 0).unwrap().tags, Some(vec!["a".to_owned()]));
    }
}
