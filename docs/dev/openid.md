# OpenID connect

WorkAdventure can be connected to any OpenID Connect compliant provider.

It uses the Authorization Code flow and supports PKCE.

To configure WorkAdventure with your OpenID Connect provider, you first need to declare
WorkAdventure as an application in your OpenID Connect provider.

The way you do this depends on the provider.

As part of this configuration, you will need to configure the "redirect URL".

For WorkAdventure, the redirect URL is: `https://pusher.[your-domain]/openid-callback`.

Then, you need to configure these environment variables:

- `ENABLE_OPENID` (*front container*): set this to 1 to enable login
- `OPID_CLIENT_ISSUER` (*pusher container*): the full URL to your OpenID Connect provider
- `OPID_CLIENT_ID` (*pusher container*): the ID of the OpenID client that you created in the OpenID Connect provider
- `OPID_CLIENT_SECRET` (*pusher container*): the secret of the OpenID client that you created in the OpenID Connect provider
- `OPID_PROMPT` (*pusher container*): whether the Authorization Server prompts the End-User for reauthentication and consent. Used as the [`prompt` parameter of the authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) (Default: login)


## Complete flow

For developers, here is the complete flow:

**Login diagram**
```mermaid
sequenceDiagram
    Front->>+Pusher: /login-screen - Call this URL to connect users
    Pusher->>+Pusher: Define your map connection
    Pusher->>+OpenID Provider: Query authorization URL
    OpenID Provider->>+Pusher: Returns login URL
    Pusher->>+Front: HTTP 302 to Login provider + set 3 cookies (playUri, code_verifier, oidc_state)
    Front->>+Login provider: Redirect to login provider with parameter "login_challenge"
    Login provider->>+Login provider: Login process with your login / consent page
    Login provider->>+Pusher: Redirect to /openid-callback with auth token
    Pusher->>+Pusher: Validates code_verifier and state
    Pusher->>+Login provider: Fetch auth token
    Login provider->>+Pusher: Returns auth token
    Pusher->>+Pusher: Generates JWT token containing OIDC auth token
    Pusher->>+Front: HTTP 302 to /?token=xxx - Redirects to play, with JWT token in parameter
    Front->>+Front: Stores JWT token
```

**Page loading diagram**
```mermaid
sequenceDiagram
    Front->>+Pusher: /me?token=x&playUri=y - Fetch data about current user
    Pusher->>+Pusher: Check JWT token validity
    Pusher->>+Admin: (optional - fetch additional user data)
    Admin->>+Pusher: Returns user data
    Pusher->>+OpenID Provider: Get user info (used to validate auth token)
    OpenID Provider->>+Pusher: Returns user info
    Pusher->>+Front: Returns user data
```
