//! A LiveKit token must not leave the process unable to check an RS256 id_token (CI e2e chromium 5/5: the
//! screen-sharing test made a LiveKit token before the first OpenID login, every login then failed with
//! InvalidAlgorithm). Own test binary: the jsonwebtoken backend is per process.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use jsonwebtoken::errors::ErrorKind;
use jsonwebtoken::{Algorithm, DecodingKey, Validation};

#[test]
fn rs256_still_checks_after_a_livekit_token() {
    wa_server::install_jwt_crypto();
    livekit_api::access_token::AccessToken::with_api_key("key", "secret-secret-secret-secret-secret").to_jwt().unwrap();
    // A public key from the CI's OIDC mock, and a token with a bogus signature: refused for its signature, not
    // for its algorithm.
    let key = DecodingKey::from_rsa_components(
        "v1Q-srMoyqlpXQaSD6RjCElTuC1j6LP4Aly-E4zDayoQRJMkb5LFYuDa5YCvxu-MyM1j1JldB6BkNKH6KrvzEvwngH1i18AA36G9vNDo2rvFxda-Uqe6Ul-1tp2o5Gr_Tu0EqSTPPSFIUm9UG49xcJGjhflLe644t-PfoeCe_Mep1QOCImA44fo3Xj4v_sf7bjRjyIJAWA57ndnXaeDjPZ2ppQ0__RDc1tm4jl-6usn79X9vFdABCn9R076xWCpe6tq9HXJLlnCH9BJ5G_x66ErKoEWH0Yb62IKttM8tmgLPP3orn6j3o3ktoUO7iImiVhiBnzOOmFJQDWDVzDyodQ",
        "AQAB",
    )
    .unwrap();
    let part = |s: &str| URL_SAFE_NO_PAD.encode(s);
    let token = format!("{}.{}.{}", part(r#"{"alg":"RS256","typ":"JWT"}"#), part(r#"{"exp":4102444800}"#), part("x"));
    let err = jsonwebtoken::decode::<serde_json::Value>(&token, &key, &Validation::new(Algorithm::RS256)).unwrap_err();
    assert_eq!(*err.kind(), ErrorKind::InvalidSignature);
}
