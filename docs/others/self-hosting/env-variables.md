# Environment Variables

This document lists all environment variables used by WorkAdventure services. These variables are defined in the `.env` file.

> ⚠️ **Auto-generated file** - Do not edit manually. Run `npm run generate-env-docs` to update.

## Play Service

Environment variables for the Play service (frontend and pusher).

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | - |
| `API_URL` | Yes | - |
| `ADMIN_API_URL` | No | - |
| `ADMIN_URL` | No | - |
| `ADMIN_BO_URL` | No | - |
| `ADMIN_API_TOKEN` | No | - |
| `AUTOLOGIN_URL` | No | - |
| `ADMIN_SOCKETS_TOKEN` | No | - |
| `CPU_OVERHEAT_THRESHOLD` | No | - |
| `PUSHER_HTTP_PORT` | No | - |
| `PUSHER_WS_PORT` | No | - |
| `SOCKET_IDLE_TIMER` | No | maximum time (in second) without activity before a socket is closed. Should be greater than 60 seconds in order to cope for Chrome intensive throttling (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling) |
| `VITE_URL` | No | - |
| `ALLOWED_CORS_ORIGIN` | No | - |
| `PUSHER_URL` | No | - |
| `FRONT_URL` | No | - |
| `MAP_STORAGE_API_TOKEN` | Yes | - |
| `PUBLIC_MAP_STORAGE_URL` | No | The public URL to the map-storage server (for instance: "https://map-storage.example.com") |
| `INTERNAL_MAP_STORAGE_URL` | No | The internal URL to the map-storage server (for instance: "https://map-storage:3000") |
| `OPENID_CLIENT_ID` | No | - |
| `OPENID_CLIENT_SECRET` | No | - |
| `OPENID_CLIENT_ISSUER` | No | - |
| `OPENID_CLIENT_REDIRECT_URL` | No | - |
| `OPENID_CLIENT_REDIRECT_LOGOUT_URL` | No | - |
| `OPENID_PROFILE_SCREEN_PROVIDER` | No | - |
| `OPENID_SCOPE` | No | - |
| `OPENID_PROMPT` | No | - |
| `OPENID_USERNAME_CLAIM` | No | - |
| `OPENID_LOCALE_CLAIM` | No | - |
| `OPENID_WOKA_NAME_POLICY` | No | - |
| `OPENID_TAGS_CLAIM` | No | - |
| `USERNAME_POLICY` | No | - |
| `DISABLE_ANONYMOUS` | No | - |
| `PROMETHEUS_AUTHORIZATION_TOKEN` | No | - |
| `PROMETHEUS_PORT` | No | The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required. |
| `ENABLE_CHAT` | No | - |
| `ENABLE_CHAT_UPLOAD` | No | - |
| `ENABLE_CHAT_ONLINE_LIST` | No | - |
| `ENABLE_CHAT_DISCONNECTED_LIST` | No | - |
| `ENABLE_SAY` | No | Whether the users can communicate via comics-style bubbles. |
| `ENABLE_ISSUE_REPORT` | No | Whether the feature 'issue report' is enabled or not on this room. Defaults to true. |
| `ENABLE_OPENAPI_ENDPOINT` | No | - |
| `START_ROOM_URL` | No | - |
| `DEBUG_MODE` | No | - |
| `UPLOADER_URL` | Yes | - |
| `ICON_URL` | Yes | - |
| `STUN_SERVER` | No | - |
| `TURN_SERVER` | No | - |
| `SKIP_RENDER_OPTIMIZATIONS` | No | - |
| `DISABLE_NOTIFICATIONS` | No | - |
| `TURN_USER` | No | - |
| `TURN_PASSWORD` | No | - |
| `JITSI_URL` | No | - |
| `JITSI_PRIVATE_MODE` | No | - |
| `MAX_USERNAME_LENGTH` | No | - |
| `MAX_PER_GROUP` | No | - |
| `MAX_DISPLAYED_VIDEOS` | No | An approximation of the maximum number of videos displayed at once. If there are more videos to display, the user will have to scroll. The number of videos can sometimes be slightly greater (MAX_DISPLAYED_VIDEOS + number of videos to display % number of videos per row). This is useful to avoid overloading the Livekit server when a lot of people are in the same room. |
| `NODE_ENV` | No | - |
| `CONTACT_URL` | No | - |
| `POSTHOG_API_KEY` | No | - |
| `POSTHOG_URL` | Yes | - |
| `FALLBACK_LOCALE` | No | - |
| `ENABLE_REPORT_ISSUES_MENU` | No | - |
| `REPORT_ISSUES_URL` | Yes | - |
| `LOGROCKET_ID` | No | - |
| `SENTRY_DSN_FRONT` | No | - |
| `SENTRY_DSN_PUSHER` | No | - |
| `SENTRY_RELEASE` | No | - |
| `SENTRY_ENVIRONMENT` | No | - |
| `SENTRY_TRACES_SAMPLE_RATE` | No | The sampling rate for Sentry traces. Only used if SENTRY_DSN is configured. Defaults to 0.1 |
| `ROOM_API_PORT` | No | - |
| `ROOM_API_SECRET_KEY` | No | - |
| `ENABLE_MAP_EDITOR` | No | - |
| `MAP_EDITOR_ALLOWED_USERS` | No | - |
| `MAP_EDITOR_ALLOW_ALL_USERS` | No | If set to true, all users can edit the map. If set to false, only the users in MAP_EDITOR_ALLOWED_USERS or users with the "admin" or "editor" tag can edit the map. Note: this setting is ignored if an Admin API is configured. |
| `WOKA_SPEED` | No | - |
| `FEATURE_FLAG_BROADCAST_AREAS` | No | - |
| `KLAXOON_ENABLED` | No | - |
| `KLAXOON_CLIENT_ID` | No | - |
| `YOUTUBE_ENABLED` | No | - |
| `GOOGLE_DRIVE_ENABLED` | No | - |
| `GOOGLE_DOCS_ENABLED` | No | - |
| `GOOGLE_SHEETS_ENABLED` | No | - |
| `GOOGLE_SLIDES_ENABLED` | No | - |
| `ERASER_ENABLED` | No | - |
| `EXCALIDRAW_ENABLED` | No | - |
| `EXCALIDRAW_DOMAINS` | No | - |
| `EMBEDDED_DOMAINS_WHITELIST` | No | - |
| `CARDS_ENABLED` | No | - |
| `TLDRAW_ENABLED` | No | - |
| `PEER_VIDEO_LOW_BANDWIDTH` | No | - |
| `PEER_VIDEO_RECOMMENDED_BANDWIDTH` | No | - |
| `PEER_SCREEN_SHARE_LOW_BANDWIDTH` | No | - |
| `PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH` | No | - |
| `GOOGLE_DRIVE_PICKER_CLIENT_ID` | No | - |
| `GOOGLE_DRIVE_PICKER_API_KEY` | No | - |
| `GOOGLE_DRIVE_PICKER_APP_ID` | No | - |
| `MATRIX_API_URI` | No | - |
| `MATRIX_PUBLIC_URI` | No | - |
| `MATRIX_ADMIN_USER` | No | - |
| `MATRIX_ADMIN_PASSWORD` | No | - |
| `MATRIX_DOMAIN` | No | - |
| `EMBEDLY_KEY` | No | - |
| `GRPC_MAX_MESSAGE_SIZE` | Yes | The maximum size of a gRPC message. Defaults to 20 MB. |

## Back Service

Environment variables for the Back service (backend API).

| Variable | Required | Description |
|----------|----------|-------------|
| `PLAY_URL` | Yes | - |
| `MINIMUM_DISTANCE` | No | - |
| `GROUP_RADIUS` | No | - |
| `ADMIN_API_URL` | No | - |
| `ADMIN_API_TOKEN` | No | - |
| `CPU_OVERHEAT_THRESHOLD` | No | - |
| `JITSI_URL` | No | - |
| `JITSI_ISS` | No | - |
| `SECRET_JITSI_KEY` | No | - |
| `BBB_URL` | No | - |
| `BBB_SECRET` | No | - |
| `ENABLE_MAP_EDITOR` | No | - |
| `HTTP_PORT` | No | - |
| `GRPC_PORT` | No | - |
| `TURN_STATIC_AUTH_SECRET` | No | - |
| `MAX_PER_GROUP` | Yes | - |
| `REDIS_HOST` | No | - |
| `REDIS_PORT` | No | - |
| `REDIS_PASSWORD` | No | - |
| `STORE_VARIABLES_FOR_LOCAL_MAPS` | No | - |
| `PROMETHEUS_AUTHORIZATION_TOKEN` | No | - |
| `PROMETHEUS_PORT` | No | The port to access the Prometheus metrics. If not set, the default port is used AND an authorization token is required. |
| `MAP_STORAGE_URL` | No | The URL to the gRPC endpoint of the map-storage server (for instance: "map-storage.example.com:50053") |
| `PUBLIC_MAP_STORAGE_URL` | No | The public URL to the map-storage server (for instance: "https://map-storage.example.com") |
| `INTERNAL_MAP_STORAGE_URL` | No | The internal URL to the map-storage server (for instance: "https://map-storage:3000") |
| `PLAYER_VARIABLES_MAX_TTL` | No | The maximum time to live of player variables for logged players, expressed in seconds (no limit by default). Use "-1" for infinity. Note that anonymous players don't have any TTL limit because their data is stored in local storage, not in Redis database.  |
| `ENABLE_CHAT` | No | - |
| `ENABLE_CHAT_UPLOAD` | No | - |
| `ENABLE_TELEMETRY` | No | By default, WorkAdventure will send telemetry usage once a day. This data contains the version of WorkAdventure used and very rough usage (max number of users...). The statistics collected through telemetry can provide developers valuable insights into WorkAdventure versions that are actually used. No personal user data is sent. Please keep this setting to true unless your WorkAdventure installation is 'secret'. |
| `SECURITY_EMAIL` | No | - |
| `TELEMETRY_URL` | No | - |
| `SENTRY_DSN` | No | - |
| `SENTRY_RELEASE` | No | - |
| `SENTRY_TRACES_SAMPLE_RATE` | No | The Sentry traces sample rate. Only used if SENTRY_DSN is configured. Defaults to 0.1 |
| `SENTRY_ENVIRONMENT` | No | - |
| `GRPC_MAX_MESSAGE_SIZE` | Yes | The maximum size of a gRPC message. Defaults to 20 MB. |
| `LIVEKIT_HOST` | No | - |
| `LIVEKIT_API_KEY` | No | - |
| `LIVEKIT_API_SECRET` | No | - |
| `MAX_USERS_FOR_WEBRTC` | Yes | The maximum number of users for WebRTC. |

## Map Storage Service

Environment variables for the Map Storage service.

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | The URI(s) of the back server |
| `AWS_ACCESS_KEY_ID` | No | - |
| `AWS_SECRET_ACCESS_KEY` | No | - |
| `AWS_DEFAULT_REGION` | No | - |
| `AWS_BUCKET` | No | - |
| `AWS_URL` | No | URL of the S3 endpoint. |
| `S3_MAX_PARALLEL_REQUESTS` | No | The maximum parallel number of requests done to the S3 bucket. Defaults to 50. |
| `S3_CONNECTION_TIMEOUT` | No | The timeout in milliseconds for the S3 connection in milliseconds. Defaults to 5000 (5 seconds). |
| `S3_REQUEST_TIMEOUT` | No | The timeout in milliseconds for the S3 requests in milliseconds. Defaults to 60000 (60 seconds). |
| `S3_UPLOAD_CONCURRENCY_LIMIT` | No | - |
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
| `AUTHENTICATION_USER` | No | - |
| `AUTHENTICATION_PASSWORD` | No | - |
| `WAM_TEMPLATE_URL` | No | The URL to fetch an empty WAM template |
| `ENTITY_COLLECTION_URLS` | No | A comma separated list of entity collection URLs to be used when a new TMJ map is uploaded. Note: ignored if WAM_TEMPLATE_URL is set. |
| `MAP_STORAGE_API_TOKEN` | Yes | - |
| `PUSHER_URL` | Yes | - |
| `WHITELISTED_RESOURCE_URLS` | No | - |
| `SECRET_KEY` | No | - |
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
