# Environment Variables

This document lists all environment variables used by WorkAdventure services. These variables are defined in the `.env` file.

> ⚠️ **Auto-generated file** - Do not edit manually. Run `npm run generate-env-docs` to update.

## Play Service

Environment variables for the Play service (frontend and pusher).

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | Secret key used to encode JWT tokens. Set this to a random unguessable string. |
| `API_URL` | Yes | URL of the back server API |
| `ADMIN_API_URL` | No | The URL to the admin API. If in the same network, you can use a local name here. |
| `ADMIN_URL` | No | The URL to the admin. This should be a publicly accessible URL. |
| `ADMIN_BO_URL` | No | The URL to the admin dashboard. Will be used to redirect the user to the admin dashboard. You can put it a URL that will automatically connect the user. |
| `ADMIN_API_TOKEN` | No | Authentication token for the admin API |
| `AUTOLOGIN_URL` | No | The URL to be used to automatically log someone given a token. |
| `ADMIN_SOCKETS_TOKEN` | No | Authentication token to connect to 'play' admin websocket endpoint. This endpoint is typically used to list users connected to a given room. |
| `CPU_OVERHEAT_THRESHOLD` | No | CPU usage threshold (in %) that triggers performance warnings. Defaults to 80 |
| `PUSHER_HTTP_PORT` | No | HTTP port for the pusher service. Defaults to 3000 |
| `PUSHER_WS_PORT` | No | WebSocket port for the pusher service. Defaults to 3001 |
| `SOCKET_IDLE_TIMER` | No | maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling) |
| `VITE_URL` | No | URL of the Vite development server (development only) |
| `ALLOWED_CORS_ORIGIN` | No | Allowed CORS origin for API requests. Use '*' to allow any domain |
| `PUSHER_URL` | No | Public URL of the pusher service |
| `FRONT_URL` | No | Public URL of the frontend application |
| `MAP_STORAGE_API_TOKEN` | Yes | API token for authenticating with the map-storage service |
| `PUBLIC_MAP_STORAGE_URL` | No | The public URL to the map-storage server (for instance: "https://map-storage.example.com") |
| `INTERNAL_MAP_STORAGE_URL` | No | The internal URL to the map-storage server (for instance: "https://map-storage:3000") |
| `OPENID_CLIENT_ID` | No | OAuth2 client ID for OpenID Connect authentication |
| `OPENID_CLIENT_SECRET` | No | OAuth2 client secret for OpenID Connect authentication |
| `OPENID_CLIENT_ISSUER` | No | OpenID Connect issuer URL (identity provider) |
| `OPENID_CLIENT_REDIRECT_URL` | No | OAuth2 redirect URL after successful authentication |
| `OPENID_CLIENT_REDIRECT_LOGOUT_URL` | No | Redirect URL after user logout |
| `OPENID_PROFILE_SCREEN_PROVIDER` | No | URL of the 'profile' page (typically part of the optionnal Admin component) |
| `OPENID_SCOPE` | No | OAuth2 scopes to request (space-separated). Defaults to 'openid email profile' |
| `OPENID_PROMPT` | No | OpenID Connect prompt parameter (e.g., 'login', 'consent') |
| `OPENID_USERNAME_CLAIM` | No | JWT claim to use as the username. Defaults to 'preferred_username' |
| `OPENID_LOCALE_CLAIM` | No | JWT claim to use for user locale. Defaults to 'locale' |
| `OPENID_WOKA_NAME_POLICY` | No | Policy for avatar naming: 'user_input' or 'openid_nickname' |
| `OPENID_TAGS_CLAIM` | No | JWT claim containing user tags/roles |
| `DISABLE_ANONYMOUS` | No | If true, anonymous users cannot access the platform. Defaults to false |
| `PROMETHEUS_AUTHORIZATION_TOKEN` | No | The token to access the Prometheus metrics. |
| `PROMETHEUS_PORT` | No | The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required. |
| `ENABLE_CHAT` | No | Enable/disable the chat feature. Defaults to true |
| `ENABLE_CHAT_UPLOAD` | No | Enable/disable file upload in chat. Defaults to true |
| `ENABLE_CHAT_ONLINE_LIST` | No | Enable/disable online users list in chat. Defaults to true |
| `ENABLE_CHAT_DISCONNECTED_LIST` | No | Enable/disable offline users list in chat. Defaults to true |
| `ENABLE_SAY` | No | Whether the users can communicate via comics-style bubbles. |
| `ENABLE_ISSUE_REPORT` | No | Whether the feature 'issue report' is enabled or not on this room. Defaults to true. |
| `ENABLE_OPENAPI_ENDPOINT` | No | Enable/disable the OpenAPI documentation endpoint. Defaults to false |
| `START_ROOM_URL` | No | Default room URL where users start when accessing the platform |
| `DEBUG_MODE` | No | Enable debug mode with additional console logging. Defaults to false |
| `UPLOADER_URL` | Yes | URL of the file uploader service |
| `ICON_URL` | Yes | Base URL for icon resources |
| `STUN_SERVER` | No | Comma separated list of STUN server URLs for WebRTC NAT traversal (format: 'stun:hostname:port') |
| `TURN_SERVER` | No | Comma separated list of TURN server URLs for WebRTC relay (format: 'turn:hostname:port') |
| `SKIP_RENDER_OPTIMIZATIONS` | No | Skip rendering optimizations (useful for debugging). Defaults to false |
| `DISABLE_NOTIFICATIONS` | No | Disable browser notifications. Defaults to false |
| `TURN_USER` | No | Username for TURN server authentication |
| `TURN_PASSWORD` | No | Password for TURN server authentication |
| `TURN_STATIC_AUTH_SECRET` | No | The auth secret to generate TURN credentials on the fly (enabled by the --use-auth-secret and --auth-secret in Coturn). |
| `TURN_CREDENTIALS_RENEWAL_TIME` | No | Time interval (in milliseconds) for renewing TURN server credentials. Defaults to 10800000 milliseconds (3 hours) |
| `JITSI_URL` | No | URL of the Jitsi Meet server for video conferencing |
| `JITSI_PRIVATE_MODE` | No | If true, Jitsi rooms are private and require authentication. Defaults to false |
| `MAX_USERNAME_LENGTH` | No | Maximum allowed length for usernames. Defaults to 10 |
| `MAX_PER_GROUP` | No | Maximum number of users in a bubble/group. Defaults to 4 |
| `MAX_DISPLAYED_VIDEOS` | No | An approximation of the maximum number of videos displayed at once. If there are more videos to display, the user will have to scroll. The number of videos can sometimes be slightly greater (MAX_DISPLAYED_VIDEOS + number of videos to display % number of videos per row). This is useful to avoid overloading the Livekit server when a lot of people are in the same room. |
| `NODE_ENV` | No | Node.js environment: 'development', 'production', or 'test' |
| `CONTACT_URL` | No | URL for users to contact support or administrators |
| `POSTHOG_API_KEY` | No | PostHog API key for analytics tracking |
| `POSTHOG_URL` | Yes | PostHog server URL for analytics. Defaults to PostHog cloud |
| `FALLBACK_LOCALE` | No | Default locale/language code when user's locale is not available (e.g., 'en', 'fr') |
| `ENABLE_REPORT_ISSUES_MENU` | No | Enable the 'Report Issues' menu option. Defaults to false |
| `REPORT_ISSUES_URL` | Yes | URL where users can report issues (e.g., GitHub issues, support portal) |
| `LOGROCKET_ID` | No | LogRocket application ID for session recording and monitoring |
| `SENTRY_DSN_FRONT` | No | Sentry DSN for frontend error tracking |
| `SENTRY_DSN_PUSHER` | No | Sentry DSN for pusher service error tracking |
| `SENTRY_RELEASE` | No | Sentry release version identifier for error tracking |
| `SENTRY_ENVIRONMENT` | No | Sentry environment name (e.g., 'production', 'staging', 'development') |
| `SENTRY_TRACES_SAMPLE_RATE` | No | The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1 |
| `ROOM_API_PORT` | No | Port for the Room API gRPC server. Defaults to 50051 |
| `ROOM_API_SECRET_KEY` | No | Secret key for Room API authentication |
| `ENABLE_MAP_EDITOR` | No | Enable the built-in map editor. Defaults to false |
| `MAP_EDITOR_ALLOWED_USERS` | No | Comma-separated list of user IDs allowed to edit maps |
| `MAP_EDITOR_ALLOW_ALL_USERS` | No | If set to true, all users can edit the map. If set to false, only the users in MAP_EDITOR_ALLOWED_USERS or users with the "admin" or "editor" tag can edit the map. Note: this setting is ignored if an Admin API is configured. |
| `WOKA_SPEED` | No | Avatar (WOKA) movement speed. Defaults to 9 |
| `FEATURE_FLAG_BROADCAST_AREAS` | No | Enable broadcast areas feature. Defaults to false |
| `KLAXOON_ENABLED` | No | Enable Klaxoon embedded application integration. Defaults to false |
| `KLAXOON_CLIENT_ID` | No | Klaxoon OAuth2 client ID |
| `YOUTUBE_ENABLED` | No | Enable YouTube map editor tool. Defaults to false |
| `GOOGLE_DRIVE_ENABLED` | No | Enable Google Drive map editor tool. Defaults to false |
| `GOOGLE_DOCS_ENABLED` | No | Enable Google Docs map editor tool. Defaults to false |
| `GOOGLE_SHEETS_ENABLED` | No | Enable Google Sheets map editor tool. Defaults to false |
| `GOOGLE_SLIDES_ENABLED` | No | Enable Google Slides map editor tool. Defaults to false |
| `ERASER_ENABLED` | No | Enable Eraser.io embedded whiteboard. Defaults to false |
| `EXCALIDRAW_ENABLED` | No | Enable Excalidraw embedded whiteboard. Defaults to false |
| `EXCALIDRAW_DOMAINS` | No | Comma-separated list of allowed Excalidraw domains |
| `EMBEDDED_DOMAINS_WHITELIST` | No | Comma-separated list of domains allowed for embedded iframes |
| `CARDS_ENABLED` | No | Enable Cards embedded application. Defaults to false |
| `TLDRAW_ENABLED` | No | Enable tldraw embedded whiteboard. Defaults to false |
| `PEER_VIDEO_LOW_BANDWIDTH` | No | Low bandwidth threshold for peer video (in kbps) |
| `PEER_VIDEO_RECOMMENDED_BANDWIDTH` | No | Recommended bandwidth for peer video (in kbps) |
| `PEER_SCREEN_SHARE_LOW_BANDWIDTH` | No | Low bandwidth threshold for screen sharing (in kbps) |
| `PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH` | No | Recommended bandwidth for screen sharing (in kbps) |
| `GOOGLE_DRIVE_PICKER_CLIENT_ID` | No | Google OAuth2 client ID for Drive Picker |
| `GOOGLE_DRIVE_PICKER_API_KEY` | No | Google API key for Drive Picker |
| `GOOGLE_DRIVE_PICKER_APP_ID` | No | Google application ID for Drive Picker |
| `MATRIX_API_URI` | No | Matrix homeserver API URI (internal) |
| `MATRIX_PUBLIC_URI` | No | Matrix homeserver public URI |
| `MATRIX_ADMIN_USER` | No | Matrix administrator username |
| `MATRIX_ADMIN_PASSWORD` | No | Matrix administrator password |
| `MATRIX_DOMAIN` | No | Matrix server domain |
| `EMBEDLY_KEY` | No | Embedly API key for rich link previews |
| `GRPC_MAX_MESSAGE_SIZE` | Yes | The maximum size of a gRPC message. Defaults to 20 MB. |
| `BACKGROUND_TRANSFORMER_ENGINE` | No | Virtual background transformer engine: 'tasks-vision' (GPU-accelerated, experimental) or 'selfie-segmentation' (CPU-based, stable). Currently defaults to 'selfie-segmentation'; 'tasks-vision' is intended as the future default once considered stable. |

## Back Service

Environment variables for the Back service (backend API).

| Variable | Required | Description |
|----------|----------|-------------|
| `PLAY_URL` | Yes | Public URL of the play/frontend service |
| `MINIMUM_DISTANCE` | No | Minimum distance (in pixels) before users are considered to be in proximity. Defaults to 64 |
| `GROUP_RADIUS` | No | Radius (in pixels) of a group/bubble. Defaults to 48 |
| `ADMIN_API_URL` | No | URL of the admin API for centralized configuration |
| `ADMIN_API_TOKEN` | No | Authentication token for the admin API |
| `CPU_OVERHEAT_THRESHOLD` | No | CPU usage threshold (in %) that triggers dropping intermediate movement packets to ease to CPU load. Defaults to 80 |
| `JITSI_URL` | No | URL of the Jitsi Meet server for video conferencing |
| `JITSI_ISS` | No | Jitsi JWT issuer for authentication |
| `SECRET_JITSI_KEY` | No | Secret key for Jitsi JWT token generation |
| `BBB_URL` | No | BigBlueButton server URL for video conferencing |
| `BBB_SECRET` | No | BigBlueButton shared secret for API authentication |
| `ENABLE_MAP_EDITOR` | No | Enable the built-in map editor. Defaults to false |
| `HTTP_PORT` | No | HTTP port for the back service. Defaults to 8080 |
| `GRPC_PORT` | No | gRPC port for the back service. Defaults to 50051 |
| `MAX_PER_GROUP` | Yes | Maximum number of users in a bubble/group. Defaults to 4 |
| `REDIS_HOST` | No | Redis server hostname or IP address |
| `REDIS_PORT` | No | Redis server port. Defaults to 6379 |
| `REDIS_PASSWORD` | No | Redis authentication password |
| `STORE_VARIABLES_FOR_LOCAL_MAPS` | No | If true, store player variables even for local maps (not recommended for production). Defaults to false |
| `PROMETHEUS_AUTHORIZATION_TOKEN` | No | The token to access the Prometheus metrics. |
| `PROMETHEUS_PORT` | No | The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required. |
| `MAP_STORAGE_URL` | No | The URL to the gRPC endpoint of the map-storage server (for instance: "map-storage.example.com:50053") |
| `PUBLIC_MAP_STORAGE_URL` | No | The public URL to the map-storage server (for instance: "https://map-storage.example.com") |
| `INTERNAL_MAP_STORAGE_URL` | No | The internal URL to the map-storage server (for instance: "https://map-storage:3000") |
| `PLAYER_VARIABLES_MAX_TTL` | No | The maximum time to live of player variables for logged players, expressed in seconds (no limit by default). Use "-1" for infinity. Note that anonymous players don't have any TTL limit because their data is stored in local storage, not in Redis database.  |
| `ENABLE_CHAT` | No | Enable/disable the chat feature. Defaults to true |
| `ENABLE_CHAT_UPLOAD` | No | Enable/disable file upload in chat. Defaults to true |
| `ENABLE_TELEMETRY` | No | By default, WorkAdventure will send telemetry usage once a day. This data contains the version of WorkAdventure used and very rough usage (max number of users...). The statistics collected through telemetry can provide developers valuable insights into WorkAdventure versions that are actually used. No personal user data is sent. Please keep this setting to true unless your WorkAdventure installation is 'secret'. |
| `SECURITY_EMAIL` | No | This email address will be notified if your WorkAdventure version contains a known security flaw. ENABLE_TELEMETRY must be set to "true" for this. |
| `TELEMETRY_URL` | No | URL where telemetry data is sent. |
| `SENTRY_DSN` | No | If set, WorkAdventure will send errors to Sentry |
| `SENTRY_RELEASE` | No | The Sentry release we target. Only used if SENTRY_DSN is configured. |
| `SENTRY_TRACES_SAMPLE_RATE` | No | The Sentry traces sample rate. Only used if SENTRY_DSN is configured. Defaults to 0.1 |
| `SENTRY_ENVIRONMENT` | No | The Sentry environnement we target. Only used if SENTRY_DSN is configured. |
| `GRPC_MAX_MESSAGE_SIZE` | Yes | The maximum size of a gRPC message. Defaults to 20 MB. |
| `LIVEKIT_HOST` | No | The Livekit host. |
| `LIVEKIT_API_KEY` | No | The Livekit API key. |
| `LIVEKIT_API_SECRET` | No | The Livekit API secret. |
| `MAX_USERS_FOR_WEBRTC` | Yes | The maximum number of users for WebRTC. |

## Map Storage Service

Environment variables for the Map Storage service.

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | The URI(s) of the back server |
| `AWS_ACCESS_KEY_ID` | No | AWS access key ID for S3 storage. If empty, local storage is used instead. |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret access key for S3 storage. If empty, local storage is used instead. |
| `AWS_DEFAULT_REGION` | No | AWS region for S3 storage (e.g., 'us-east-1', 'eu-west-1') |
| `AWS_BUCKET` | No | S3 bucket name for map storage. If empty, local storage is used instead. |
| `AWS_URL` | No | URL of the S3 endpoint. |
| `S3_MAX_PARALLEL_REQUESTS` | No | The maximum parallel number of requests done to the S3 bucket. Defaults to 50. |
| `S3_CONNECTION_TIMEOUT` | No | The timeout in milliseconds for the S3 connection in milliseconds. Defaults to 5000 (5 seconds). |
| `S3_REQUEST_TIMEOUT` | No | The timeout in milliseconds for the S3 requests in milliseconds. Defaults to 60000 (60 seconds). |
| `S3_UPLOAD_CONCURRENCY_LIMIT` | No | Maximum number of concurrent S3 upload operations. Defaults to 100 |
| `MAX_UNCOMPRESSED_SIZE` | No | The maximum size of an uploaded file. This the total size of the uncompressed file (not the ZIP file). Defaults to 1GB |
| `USE_DOMAIN_NAME_IN_PATH` | No | If true, the domain name will be used as a top level directory when fetching/storing files |
| `PATH_PREFIX` | No | The prefix to strip if a reverse proxy is proxying calls to the map-storage from a path, e.g. /map-storage |
| `STORAGE_DIRECTORY` | No | Storage directory for the maps on physical disk. Used if S3 storage is not configured. |
| `CACHE_CONTROL` | No | The cache-control HTTP header to be used for "normal" resources. Note: resources containing a hash in the name will be set to "immutable", whatever this setting is. |
| `ENABLE_WEB_HOOK` | No | If true, the webhook will be called when a WAM file is created |
| `WEB_HOOK_URL` | No | The URL of the webhook to call when a WAM file is created / updated / deleted. The URL will be called using POST. |
| `WEB_HOOK_API_TOKEN` | No | The (optional) API token to use when calling the webhook. The token will be sent in the Authorization header of the POST request. |
| `MAX_SIMULTANEOUS_FS_READS` | No | The maximum number of simultaneous file system (local or S3) reads when regenerating the cache file. Defaults to 100. |
| `SENTRY_DSN` | No | If set, WorkAdventure will send errors to Sentry |
| `SENTRY_RELEASE` | No | The Sentry release we target. Only used if SENTRY_DSN is configured. |
| `SENTRY_ENVIRONMENT` | No | The Sentry environment we target. Only used if SENTRY_DSN is configured. |
| `SENTRY_TRACES_SAMPLE_RATE` | No | The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1 |
| `AUTHENTICATION_STRATEGY` | No | Deprecated. Use ENABLE_BEARER_AUTHENTICATION, ENABLE_BASIC_AUTHENTICATION or ENABLE_DIGEST_AUTHENTICATION instead |
| `ENABLE_BEARER_AUTHENTICATION` | No | Enables bearer authentication. When true, you need to set either AUTHENTICATION_TOKEN or AUTHENTICATION_VALIDATOR_URL |
| `AUTHENTICATION_TOKEN` | No | The hard-coded bearer token to use for authentication |
| `AUTHENTICATION_VALIDATOR_URL` | No | The URL that will be used to remotely validate a bearer token |
| `ENABLE_BASIC_AUTHENTICATION` | No | Enables basic authentication. When true, you need to set both AUTHENTICATION_USER and AUTHENTICATION_PASSWORD |
| `ENABLE_DIGEST_AUTHENTICATION` | No | Enables basic authentication. When true, you need to set both AUTHENTICATION_USER and AUTHENTICATION_PASSWORD |
| `AUTHENTICATION_USER` | No | Username for Basic or Digest authentication |
| `AUTHENTICATION_PASSWORD` | No | Password for Basic or Digest authentication |
| `WAM_TEMPLATE_URL` | No | The URL to fetch an empty WAM template |
| `ENTITY_COLLECTION_URLS` | No | A comma separated list of entity collection URLs to be used when a new TMJ map is uploaded. Note: ignored if WAM_TEMPLATE_URL is set. |
| `MAP_STORAGE_API_TOKEN` | Yes | API token to access the map-storage REST API |
| `PUSHER_URL` | Yes | URL of the pusher service |
| `WHITELISTED_RESOURCE_URLS` | No | Comma-separated list of allowed URLs for loading external resources |
| `SECRET_KEY` | No | The JWT token to use when the map-storage is used as a file server. This token will be used to authenticate the user when accessing files. |
| `GRPC_MAX_MESSAGE_SIZE` | Yes | The maximum size of a gRPC message. Defaults to 20 MB. |
| `BODY_PARSER_JSON_SIZE_LIMIT` | No | The maximum size of JSON request bodies accepted by the body parser (used in PUT / PATCH HTTP requests). Defaults to 100mb. Examples: '50mb', '200mb', '1gb' |

## Deprecated Variables

The following variables are deprecated and will be removed in a future version. Please use the `OPENID_*` equivalents instead.

| Variable | Required | Description |
|----------|----------|-------------|
| `OPID_CLIENT_ID` | No | - |
| `OPID_CLIENT_SECRET` | No | - |
| `OPID_CLIENT_ISSUER` | No | - |
| `OPID_CLIENT_REDIRECT_URL` | No | - |
| `OPID_CLIENT_REDIRECT_LOGOUT_URL` | No | - |
| `OPID_PROFILE_SCREEN_PROVIDER` | No | - |
| `OPID_SCOPE` | No | - |
| `OPID_PROMPT` | No | - |
| `OPID_USERNAME_CLAIM` | No | - |
| `OPID_LOCALE_CLAIM` | No | - |
| `OPID_WOKA_NAME_POLICY` | No | - |
| `OPID_TAGS_CLAIM` | No | - |
