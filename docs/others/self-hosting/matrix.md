# Matrix integration

WorkAdventure can be integrated with a Matrix server to provide a chat in the game.
In order to do so, you will first need to set up OpenID Connect authentication on both [WorkAdventure](openid.md) and your Matrix server.

We have tested this integration with [Synapse](https://matrix-org.github.io/synapse/latest/).

## Architecture

Both WorkAdventure and Synapse must be configured to use the same OpenID Connect provider.

```mermaid
graph LR
    A[WorkAdventure] --> B[OpenID Connect Provider]
    C[Synapse] --> B[OpenID Connect Provider]
    A --> C
```

> [!NOTE]  
> Matrix is migrating to OpenID native clients. To do this, Synapse supports a new service named
> [Matrix Authentication Service (MAS)](https://github.com/matrix-org/matrix-authentication-service). This service
> (and Synapse configured with the "experimental_features.msc3861" option) is not yet supported by WorkAdventure.
> Instead, you should configure Synapse with the classic "sso" option (see below).


## Synapse configuration

Follow the documentation at https://matrix-org.github.io/synapse/latest/openid.html to configure Synapse with your OpenID Connect provider.

Some important parts of the configuration are:

Depending on your OpenID Connect provider, you will need to use the `user_mapping_provider` option to map the OpenID Connect users to a Matrix user ID.
The hardest part is finding the right value for the _local part_ of the identifier. This is the part before the `:` in the Matrix user ID (e.g. `@localpart:matrix.org`).

For example, if your OpenID Connect provider returns the `email` claim, you can use the following configuration:

```
oidc_providers:
  - idp_id: <some-id>
    idp_name: <some-name>
    issuer: "https://<provider-url>"
    
    # Use skip_verification if your OpenID Connect provider is not using a valid certificate or is using HTTP instead of HTTPS.
    # skip_verification: true
    client_id: "<client-id>"
    client_secret: "<client-secret>"
    scopes: ["openid", "email", "profile"]

    # In case your OpenID Connect provider does not provide the claims in the ID token, but only provides them in the userinfo endpoint, use the option below:
    # user_profile_method: "userinfo_endpoint"

    user_mapping_provider:
      config:
        # Here, we are using the beginning of the email as the local part of the Matrix user ID.
        # For example, if the email is "john.doe@example", the local part will be "john.doe".
        # You can customize this to your needs.
        localpart_template: "{{ user.email.split('@')[0] }}"
        display_name_template: "{{ user.name }}"
        email_template: "{{ user.email }}"
```        

Use the `sso.client_whitelist` option to skip the Matrix "Continue to your account" page.
You should whitelist the URL of your WorkAdventure instance. Don't forget to end the URL with a `/`.

```
sso:
  client_whitelist:
    - http://play.workadventure.localhost/
```



## Developer notes

In this section, we will deep-dive into the Matrix / WorkAdventure integration implementation.

The login flow to Matrix happens just  after the login to WorkAdventure.

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
    Pusher->>+Pusher: Generates JWT token containing OIDC auth token and stores it in a cookie

    Pusher->>+Front: HTTP 302 to /_matrix/client/r0/login/sso/redirect
    Front->>+Matrix: Redirect to /_matrix/client/r0/login/sso/redirect
    Matrix->>+Front: HTTP 302 to Login provider
    Front->>+Login provider: Redirect to login provider with parameter "login_challenge"
    Login provider->>+Login provider: Login process. User is already authenticated. No UI is shown.
    Login provider->>+Matrix: Redirect to Synapse callback URL with auth token
    Matrix->>+Pusher: Redirect to /matrix-callback with Matrix login token
    Pusher->>+Pusher: Read auth token from cookie

    Pusher->>+Front: HTTP 302 to /?token=xxx&matrixLoginToken=xxx - Redirects to play, with JWT token AND Matrix login token in parameter
    Front->>+Front: Stores JWT token
    Front->>+Matrix: Call /_matrix/client/r0/login with the Matrix login token
    Matrix->>+Front: Returns Matrix access token and refresh token
    Front->>+Front: Stores Matrix access token and refresh token
    Front->>+Matrix: Establish a connection with the Matrix access token
```

