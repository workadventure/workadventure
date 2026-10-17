// Package config reads the environment variables of the four TypeScript services (pusher, back, map-storage,
// uploader) that the single Go server replaces. Parsing follows the zod helpers of
// libs/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils.ts: a boolean only accepts
// true|false|0|1|"", an integer only digits, and "" always means "use the default".
//
// Variables the server does not need yet are still accepted: an unknown variable is ignored, like zod's
// z.object() does, so a docker-compose file written for the TS services starts this server unchanged.
package config

import (
	"cmp"
	"errors"
	"fmt"
	"net/url"
	"os"
	"reflect"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"

	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/uploader"
)

type Config struct {
	// HTTP. The pusher listened on PUSHER_HTTP_PORT (express) and PUSHER_WS_PORT (uWebSockets.js); this server
	// serves everything on both ports, so the existing reverse-proxy rules keep working.
	HTTPPort int
	WSPort   int
	// MapStoragePort answers for the map-storage host (SERVER_MAP_STORAGE_PORT of the server variant; map-storage
	// itself always listened on 3000; the chart's server mode points the map-storage Service at 3002). 0: not served.
	MapStoragePort int
	// The Room API (gRPC): ROOM_API_PORT of the pusher (SERVER_ROOM_API_PORT when set), served when there is a
	// ROOM_API_SECRET_KEY, on ROOM_API_BIND_HOST (all addresses by default).
	// LiveKit (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET): spaces move to it past MaxUsersForWebRTC.
	LiveKitHost, LiveKitAPIKey, LiveKitAPISecret string
	MaxUsersForWebRTC                            int
	LiveKitSwitchOnCPULimitation                 bool

	// The uploader (SERVER_UPLOADER_PORT; the chart's server mode points the uploader Service at 3003).
	UploaderPort    int
	Uploader        uploader.Options
	UploaderS3      UploaderS3 // AWS_*: the uploader's bucket
	UploaderRedisDB int        // REDIS_DB_NUMBER: only the uploader read it (files in Redis); the variables stay on 0

	RoomAPIPort      int
	RoomAPISecretKey string
	RoomAPIBindHost  string

	// Map storage (map-storage's variables)
	StorageDirectory string
	MapStorage       mapstorage.Options

	EmbeddedDomainsWhitelist []string

	// Variables
	RedisHost, RedisPassword   string
	RedisPort                  int
	StoreVariablesForLocalMaps bool
	PlayerVariablesMaxTTL      int64 // seconds; -1: no maximum

	SecretKey             string
	AdminAPIURL           string
	EnableOpenAPIEndpoint bool          // ENABLE_OPENAPI_ENDPOINT: /openapi/* and /swagger-ui/
	AdminURL              string        // ADMIN_URL: the admin's public URL (ICE servers, chat ids, OAuth refresh)
	AdminAPIRetryDelay    time.Duration // ADMIN_API_RETRY_DELAY: between two tries of /api/capabilities at start
	AdminAPIToken         string        // ADMIN_API_TOKEN: the administration routes (POST /global/event)
	AdminSocketsToken     string        // ADMIN_SOCKETS_TOKEN: signs the JWTs of /ws/admin/rooms
	Analytics             Analytics
	DisableAnonymous      bool
	OpenID                OpenID

	SocketIdleTimer           time.Duration
	ClientDisconnectRetention time.Duration

	PusherURL         string
	FrontURL          string
	AssetsURL         string
	AssetsInternalURL string
	StartRoomURL      string

	PublicMapStorageURL    string
	EnableMapEditor        bool
	MapEditorAllowAllUsers bool
	MapEditorAllowedUsers  []string

	// Proximity (back)
	MinimumDistance int
	GroupRadius     int
	MaxPerGroup     int

	PrometheusPort  int
	PrometheusToken string

	// Map details and the front page
	DefaultWokaName                  string
	DefaultWokaTexture               string
	SkipCameraPage                   bool
	DefaultCameraPrivacySettings     bool
	DefaultMicrophonePrivacySettings bool
	BypassPWA                        bool
	ProvideDefaultWokaName           string
	ProvideDefaultWokaTexture        string
	OpidWokaNamePolicy               string
	EnableChat                       bool
	EnableChatUpload                 bool
	EnableChatOnlineList             bool
	EnableChatDisconnectedList       bool
	EnableSay                        bool
	EnableIssueReport                bool
	EnableTutorial                   bool
	MatrixEnabled                    bool
	GoogleDrivePickerClientID        string
	RecordingConfigured              bool
	RecordingS3                      RecordingS3
	AllowedCORSOrigin                string
	MatrixPublicURI                  string
	Matrix                           Matrix   // the Synapse admin, when MatrixEnabled
	Jitsi                            Jitsi    // JITSI_URL, JITSI_ISS, SECRET_JITSI_KEY: the server-wide Jitsi, unless the admin gives one
	BBB                              BBB      // BBB_URL, BBB_SECRET
	MapStorageAPIToken               string   // MAP_STORAGE_API_TOKEN: map-storage's calls to /roomArea and the resourceUrls
	WhitelistedResourceURLs          []string // WHITELISTED_RESOURCE_URLS: the origins a resourceUrl may point to, PUSHER_URL's besides
	ProfileScreenProvider            string   // OPENID_PROFILE_SCREEN_PROVIDER, else ADMIN_URL/profile: where /profile-callback sends the browser
	AutologinURL                     string   // AUTOLOGIN_URL, else ADMIN_URL/workadventure/login: where ?access_key= goes
	StunServer                       string
	TurnServer                       string
	TurnUser                         string
	TurnPassword                     string
	TurnStaticAuthSecret             string
	ServerName                       string
	ServerMotd                       string
	ServerIcon                       string
	NodeEnv                          string

	// FrontEnv is window.env in the HTML page: the FRONT_ENVIRONMENT_VARIABLES object of
	// play/src/pusher/enums/EnvironmentVariable.ts. Unset optional values are left out, like JSON.stringify
	// drops undefined.
	FrontEnv map[string]any
}

// OpenID is the OpenID Connect client (OPENID_* variables, or the deprecated OPID_* ones). Login is enabled when
// ClientID is set.
type OpenID struct {
	ClientID, ClientSecret, Issuer        string
	Scope, Prompt                         string
	UsernameClaim, LocaleClaim, TagsClaim string
}

// Load reads the configuration from the process environment.
func Load() (*Config, error) { return parse(env.ToMap(os.Environ())) }

// vars are the environment variables, as caarlos0/env reads them: "" means the default, like the zod helpers.
// parse turns them into Config (fallbacks between old and new names, units, the front's window.env).
type vars struct {
	BodyParserJSONSizeLimit          string  `env:"BODY_PARSER_JSON_SIZE_LIMIT" envDefault:"100mb"`
	AdminAPIRetryDelay               int     `env:"ADMIN_API_RETRY_DELAY" envDefault:"500"`
	AdminAPIToken                    string  `env:"ADMIN_API_TOKEN"`
	AdminAPIURL                      string  `env:"ADMIN_API_URL"`
	AdminSocketsToken                string  `env:"ADMIN_SOCKETS_TOKEN"`
	AdminURL                         string  `env:"ADMIN_URL"`
	AllowedCORSOrigin                string  `env:"ALLOWED_CORS_ORIGIN"`
	AnalyticsFlushIntervalMS         int     `env:"ANALYTICS_FLUSH_INTERVAL_MS" envDefault:"10000"`
	AnalyticsMaxBatchSize            int     `env:"ANALYTICS_MAX_BATCH_SIZE" envDefault:"1000"`
	AnalyticsMaxQueueSize            int     `env:"ANALYTICS_MAX_QUEUE_SIZE" envDefault:"10000"`
	AnalyticsTimeoutMS               int     `env:"ANALYTICS_TIMEOUT_MS" envDefault:"2000"`
	AssetsInternalURL                string  `env:"ASSETS_INTERNAL_URL"`
	AssetsURL                        string  `env:"ASSETS_URL"`
	AuthenticationPassword           string  `env:"AUTHENTICATION_PASSWORD"`
	AuthenticationToken              string  `env:"AUTHENTICATION_TOKEN"`
	AuthenticationUser               string  `env:"AUTHENTICATION_USER"`
	AuthenticationValidatorURL       string  `env:"AUTHENTICATION_VALIDATOR_URL"`
	AutologinURL                     string  `env:"AUTOLOGIN_URL"`
	AWSAccessKeyID                   string  `env:"AWS_ACCESS_KEY_ID"`
	AWSBucket                        string  `env:"AWS_BUCKET"`
	AWSDefaultRegion                 string  `env:"AWS_DEFAULT_REGION"`
	AWSEndpoint                      string  `env:"AWS_ENDPOINT"`
	AWSSecretAccessKey               string  `env:"AWS_SECRET_ACCESS_KEY"`
	BBBSecret                        string  `env:"BBB_SECRET"`
	BBBURL                           string  `env:"BBB_URL"`
	BypassPWA                        bool    `env:"BYPASS_PWA"`
	CacheControl                     string  `env:"CACHE_CONTROL" envDefault:"public, s-max-age=10"`
	CardsEnabled                     bool    `env:"CARDS_ENABLED"`
	ClientDisconnectionRetentionMS   int     `env:"CLIENT_DISCONNECTION_RETENTION_MS" envDefault:"30000"`
	ContactURL                       string  `env:"CONTACT_URL"`
	DebugMode                        bool    `env:"DEBUG_MODE"`
	DefaultCameraPrivacySettings     bool    `env:"DEFAULT_CAMERA_PRIVACY_SETTINGS"`
	DefaultMicrophonePrivacySettings bool    `env:"DEFAULT_MICROPHONE_PRIVACY_SETTINGS" envDefault:"true"`
	DefaultWokaName                  string  `env:"DEFAULT_WOKA_NAME"`
	DefaultWokaTexture               string  `env:"DEFAULT_WOKA_TEXTURE"`
	DirectUploadURL                  string  `env:"DIRECT_UPLOAD_URL"`
	DisableAnonymous                 bool    `env:"DISABLE_ANONYMOUS"`
	EmbeddedDomainsWhitelist         string  `env:"EMBEDDED_DOMAINS_WHITELIST"`
	EmbedlyKey                       string  `env:"EMBEDLY_KEY"`
	EnableBasicAuthentication        bool    `env:"ENABLE_BASIC_AUTHENTICATION"`
	EnableBearerAuthentication       bool    `env:"ENABLE_BEARER_AUTHENTICATION"`
	EnableChat                       bool    `env:"ENABLE_CHAT" envDefault:"true"`
	EnableChatDisconnectedList       bool    `env:"ENABLE_CHAT_DISCONNECTED_LIST" envDefault:"true"`
	EnableChatOnlineList             bool    `env:"ENABLE_CHAT_ONLINE_LIST" envDefault:"true"`
	EnableChatUpload                 bool    `env:"ENABLE_CHAT_UPLOAD" envDefault:"true"`
	EnableIssueReport                bool    `env:"ENABLE_ISSUE_REPORT" envDefault:"true"`
	EnableMapEditor                  bool    `env:"ENABLE_MAP_EDITOR"`
	EnableOpenapiEndpoint            bool    `env:"ENABLE_OPENAPI_ENDPOINT"`
	EnableReportIssuesMenu           bool    `env:"ENABLE_REPORT_ISSUES_MENU"`
	EnableSay                        bool    `env:"ENABLE_SAY" envDefault:"true"`
	EnableTutorial                   bool    `env:"ENABLE_TUTORIAL" envDefault:"true"`
	EnableWebHook                    bool    `env:"ENABLE_WEB_HOOK" envDefault:"true"`
	EntityCollectionURLs             string  `env:"ENTITY_COLLECTION_URLS"`
	EraserEnabled                    bool    `env:"ERASER_ENABLED"`
	ExcalidrawDomains                string  `env:"EXCALIDRAW_DOMAINS"`
	ExcalidrawEnabled                bool    `env:"EXCALIDRAW_ENABLED"`
	FallbackLocale                   string  `env:"FALLBACK_LOCALE"`
	FrontURL                         string  `env:"FRONT_URL"`
	GoogleDocsEnabled                bool    `env:"GOOGLE_DOCS_ENABLED"`
	GoogleDriveEnabled               bool    `env:"GOOGLE_DRIVE_ENABLED"`
	GoogleDrivePickerAppID           string  `env:"GOOGLE_DRIVE_PICKER_APP_ID"`
	GoogleDrivePickerClientID        string  `env:"GOOGLE_DRIVE_PICKER_CLIENT_ID"`
	GoogleSheetsEnabled              bool    `env:"GOOGLE_SHEETS_ENABLED"`
	GoogleSlidesEnabled              bool    `env:"GOOGLE_SLIDES_ENABLED"`
	GroupRadius                      int     `env:"GROUP_RADIUS" envDefault:"48"`
	GRPCMaxMessageSize               int     `env:"GRPC_MAX_MESSAGE_SIZE" envDefault:"20971520"`
	IconURL                          string  `env:"ICON_URL"`
	JitsiISS                         string  `env:"JITSI_ISS"`
	JitsiPrivateMode                 bool    `env:"JITSI_PRIVATE_MODE"`
	JitsiURL                         string  `env:"JITSI_URL"`
	KlaxoonClientID                  string  `env:"KLAXOON_CLIENT_ID"`
	KlaxoonEnabled                   bool    `env:"KLAXOON_ENABLED"`
	LivekitAPIKey                    string  `env:"LIVEKIT_API_KEY"`
	LivekitAPISecret                 string  `env:"LIVEKIT_API_SECRET"`
	LivekitHost                      string  `env:"LIVEKIT_HOST"`
	LivekitPixelDensity              float64 `env:"LIVEKIT_PIXEL_DENSITY" envDefault:"0.6666666666666666"`
	LivekitRecordingS3AccessKey      string  `env:"LIVEKIT_RECORDING_S3_ACCESS_KEY"`
	LivekitRecordingS3Bucket         string  `env:"LIVEKIT_RECORDING_S3_BUCKET"`
	LivekitRecordingS3CDNEndpoint    string  `env:"LIVEKIT_RECORDING_S3_CDN_ENDPOINT"`
	LivekitRecordingS3Endpoint       string  `env:"LIVEKIT_RECORDING_S3_ENDPOINT"`
	LivekitRecordingS3Region         string  `env:"LIVEKIT_RECORDING_S3_REGION"`
	LivekitRecordingS3SecretKey      string  `env:"LIVEKIT_RECORDING_S3_SECRET_KEY"`
	LivekitSwitchOnCPULimitation     bool    `env:"LIVEKIT_SWITCH_ON_CPU_LIMITATION" envDefault:"true"`
	MapEditorAllowedUsers            string  `env:"MAP_EDITOR_ALLOWED_USERS"`
	MapEditorAllowAllUsers           bool    `env:"MAP_EDITOR_ALLOW_ALL_USERS" envDefault:"true"`
	MapStorageAPIToken               string  `env:"MAP_STORAGE_API_TOKEN"`
	MatrixAdminPassword              string  `env:"MATRIX_ADMIN_PASSWORD"`
	MatrixAdminUser                  string  `env:"MATRIX_ADMIN_USER"`
	MatrixAPIURI                     string  `env:"MATRIX_API_URI"`
	MatrixDomain                     string  `env:"MATRIX_DOMAIN"`
	MatrixPublicURI                  string  `env:"MATRIX_PUBLIC_URI"`
	MaxDisplayedVideos               int     `env:"MAX_DISPLAYED_VIDEOS" envDefault:"16"`
	MaxPerGroup                      int     `env:"MAX_PER_GROUP" envDefault:"4"`
	MaxUncompressedSize              int     `env:"MAX_UNCOMPRESSED_SIZE" envDefault:"1073741824"`
	MaxUsernameLength                int     `env:"MAX_USERNAME_LENGTH" envDefault:"10"`
	MaxUsersForWebRTC                int     `env:"MAX_USERS_FOR_WEBRTC" envDefault:"4"`
	MinimumDistance                  int     `env:"MINIMUM_DISTANCE" envDefault:"64"`
	NodeEnv                          string  `env:"NODE_ENV"`
	OpenidClientID                   string  `env:"OPENID_CLIENT_ID"`
	OpenidClientIssuer               string  `env:"OPENID_CLIENT_ISSUER"`
	OpenidClientSecret               string  `env:"OPENID_CLIENT_SECRET"`
	OpenidLocaleClaim                string  `env:"OPENID_LOCALE_CLAIM"`
	OpenidProfileScreenProvider      string  `env:"OPENID_PROFILE_SCREEN_PROVIDER"`
	OpenidPrompt                     string  `env:"OPENID_PROMPT"`
	OpenidScope                      string  `env:"OPENID_SCOPE"`
	OpenidTagsClaim                  string  `env:"OPENID_TAGS_CLAIM"`
	OpenidUsernameClaim              string  `env:"OPENID_USERNAME_CLAIM"`
	OpenidWokaNamePolicy             string  `env:"OPENID_WOKA_NAME_POLICY"`
	OPIDClientID                     string  `env:"OPID_CLIENT_ID"`
	OPIDClientIssuer                 string  `env:"OPID_CLIENT_ISSUER"`
	OPIDClientSecret                 string  `env:"OPID_CLIENT_SECRET"`
	OPIDLocaleClaim                  string  `env:"OPID_LOCALE_CLAIM"`
	OPIDProfileScreenProvider        string  `env:"OPID_PROFILE_SCREEN_PROVIDER"`
	OPIDPrompt                       string  `env:"OPID_PROMPT"`
	OPIDScope                        string  `env:"OPID_SCOPE"`
	OPIDTagsClaim                    string  `env:"OPID_TAGS_CLAIM"`
	OPIDUsernameClaim                string  `env:"OPID_USERNAME_CLAIM"`
	OPIDWokaNamePolicy               string  `env:"OPID_WOKA_NAME_POLICY"`
	PathPrefix                       string  `env:"PATH_PREFIX"`
	PlayerVariablesMaxTTL            string  `env:"PLAYER_VARIABLES_MAX_TTL"`
	PlayURL                          string  `env:"PLAY_URL"`
	PosthogAPIKey                    string  `env:"POSTHOG_API_KEY"`
	PosthogURL                       string  `env:"POSTHOG_URL"`
	PrometheusAuthorizationToken     string  `env:"PROMETHEUS_AUTHORIZATION_TOKEN"`
	PrometheusPort                   int     `env:"PROMETHEUS_PORT"`
	ProvideDefaultWokaName           string  `env:"PROVIDE_DEFAULT_WOKA_NAME"`
	ProvideDefaultWokaTexture        string  `env:"PROVIDE_DEFAULT_WOKA_TEXTURE"`
	ProximityFileTransferMaxUsers    int     `env:"PROXIMITY_FILE_TRANSFER_MAX_USERS" envDefault:"10"`
	PublicMapStorageURL              string  `env:"PUBLIC_MAP_STORAGE_URL"`
	PusherHTTPPort                   int     `env:"PUSHER_HTTP_PORT" envDefault:"3000"`
	PusherURL                        string  `env:"PUSHER_URL"`
	PusherWSPort                     int     `env:"PUSHER_WS_PORT" envDefault:"3001"`
	RedisDbNumber                    int     `env:"REDIS_DB_NUMBER"`
	RedisHost                        string  `env:"REDIS_HOST"`
	RedisPassword                    string  `env:"REDIS_PASSWORD"`
	RedisPort                        int     `env:"REDIS_PORT" envDefault:"6379"`
	ReportIssuesURL                  string  `env:"REPORT_ISSUES_URL"`
	RoomAPIBindHost                  string  `env:"ROOM_API_BIND_HOST"`
	RoomAPISecretKey                 string  `env:"ROOM_API_SECRET_KEY"`
	SecretJitsiKey                   string  `env:"SECRET_JITSI_KEY"`
	SecretKey                        string  `env:"SECRET_KEY"`
	SentryDSNFront                   string  `env:"SENTRY_DSN_FRONT"`
	SentryDSNPusher                  string  `env:"SENTRY_DSN_PUSHER"`
	SentryEnvironment                string  `env:"SENTRY_ENVIRONMENT"`
	SentryRelease                    string  `env:"SENTRY_RELEASE"`
	SentryTracesSampleRate           float64 `env:"SENTRY_TRACES_SAMPLE_RATE" envDefault:"0.1"`
	ServerIcon                       string  `env:"SERVER_ICON"`
	ServerMapStoragePort             int     `env:"SERVER_MAP_STORAGE_PORT" envDefault:"3002"`
	ServerMotd                       string  `env:"SERVER_MOTD" envDefault:"A WorkAdventure Server"`
	ServerName                       string  `env:"SERVER_NAME" envDefault:"WorkAdventure Server"`
	ServerRoomAPIPort                int     `env:"SERVER_ROOM_API_PORT"`
	RoomAPIPort                      int     `env:"ROOM_API_PORT" envDefault:"50051"`
	ServerUploaderPort               int     `env:"SERVER_UPLOADER_PORT" envDefault:"3003"`
	SkipCameraPage                   bool    `env:"SKIP_CAMERA_PAGE"`
	SkipRenderOptimizations          bool    `env:"SKIP_RENDER_OPTIMIZATIONS"`
	SocketIdleTimer                  int     `env:"SOCKET_IDLE_TIMER" envDefault:"120"`
	StartRoomURL                     string  `env:"START_ROOM_URL" envDefault:"/_/global/maps.workadventu.re/starter/map.json"`
	StorageDirectory                 string  `env:"STORAGE_DIRECTORY" envDefault:"./public"`
	StoreVariablesForLocalMaps       bool    `env:"STORE_VARIABLES_FOR_LOCAL_MAPS"`
	StunServer                       string  `env:"STUN_SERVER"`
	TldrawEnabled                    bool    `env:"TLDRAW_ENABLED"`
	TurnCredentialsRenewalTime       int     `env:"TURN_CREDENTIALS_RENEWAL_TIME" envDefault:"3600000"`
	TurnPassword                     string  `env:"TURN_PASSWORD"`
	TurnServer                       string  `env:"TURN_SERVER"`
	TurnStaticAuthSecret             string  `env:"TURN_STATIC_AUTH_SECRET"`
	TurnUser                         string  `env:"TURN_USER"`
	UploaderAWSSignedURLExpiration   int     `env:"UPLOADER_AWS_SIGNED_URL_EXPIRATION" envDefault:"60"`
	UploaderURL                      string  `env:"UPLOADER_URL"`
	UploadMaxFilesize                int     `env:"UPLOAD_MAX_FILESIZE"`
	UseDomainNameInPath              bool    `env:"USE_DOMAIN_NAME_IN_PATH"`
	WAMTemplateURL                   string  `env:"WAM_TEMPLATE_URL"`
	WebHookAPIToken                  string  `env:"WEB_HOOK_API_TOKEN"`
	WebHookURL                       string  `env:"WEB_HOOK_URL"`
	WokaSpeed                        int     `env:"WOKA_SPEED" envDefault:"9"`
	YoutubeEnabled                   bool    `env:"YOUTUBE_ENABLED"`
}

var digits = regexp.MustCompile(`^\d*$`)

// parsers are the zod helpers' rules: a boolean only accepts true|false|0|1, an integer only digits.
var parsers = map[reflect.Type]env.ParserFunc{
	reflect.TypeFor[bool](): func(s string) (any, error) {
		switch s {
		case "true", "1":
			return true, nil
		case "false", "0":
			return false, nil
		}
		return nil, fmt.Errorf("expected true|false|0|1, got %q", s)
	},
	reflect.TypeFor[int](): func(s string) (any, error) {
		if !digits.MatchString(s) {
			return nil, fmt.Errorf("must be a positive integer number, got %q", s)
		}
		return strconv.Atoi(s)
	},
}

// readVars reads environ into vars; each error names its variable.
func readVars(environ map[string]string) (*vars, []string) {
	v := &vars{}
	err := env.ParseWithOptions(v, env.Options{Environment: environ, FuncMap: parsers})
	var agg env.AggregateError
	if !errors.As(err, &agg) {
		return v, nil
	}
	var errs []string
	t := reflect.TypeFor[vars]()
	for _, e := range agg.Errors {
		var pe env.ParseError
		if errors.As(e, &pe) {
			f, _ := t.FieldByName(pe.Name)
			errs = append(errs, f.Tag.Get("env")+": "+pe.Err.Error())
		} else {
			errs = append(errs, e.Error())
		}
	}
	return v, errs
}

var byteSizes = regexp.MustCompile(`(?i)^\+?(\d+(?:\.\d+)?) *(b|kb|mb|gb|tb|pb)?$`)

// byteSize reads a size as the npm "bytes" package does for body-parser's limit: "100mb", "1.5gb", "2048"
// (powers of 1024).
func byteSize(errs *[]string, name, v string) int64 {
	m := byteSizes.FindStringSubmatch(v)
	if m == nil {
		*errs = append(*errs, fmt.Sprintf("%s: expected a size such as 100mb, got %q", name, v))
		return 0
	}
	n, _ := strconv.ParseFloat(m[1], 64)
	shift := map[string]uint{"": 0, "b": 0, "kb": 10, "mb": 20, "gb": 30, "tb": 40, "pb": 50}[strings.ToLower(m[2])]
	return int64(n * float64(uint64(1)<<shift))
}

func oneOf(errs *[]string, name, v string, allowed ...string) string {
	if v == "" || slices.Contains(allowed, v) {
		return v
	}
	*errs = append(*errs, fmt.Sprintf("%s: must be one of %v, got %q", name, allowed, v))
	return ""
}

func list(v string) []string {
	if v == "" {
		return []string{}
	}
	return strings.Split(v, ",")
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func parse(environ map[string]string) (*Config, error) {
	v, errs := readVars(environ)
	c := &Config{
		HTTPPort:                     v.PusherHTTPPort,
		WSPort:                       v.PusherWSPort,
		MapStoragePort:               v.ServerMapStoragePort,
		RoomAPIPort:                  cmp.Or(v.ServerRoomAPIPort, v.RoomAPIPort),
		RoomAPISecretKey:             v.RoomAPISecretKey,
		UploaderPort:                 v.ServerUploaderPort,
		LiveKitHost:                  v.LivekitHost,
		LiveKitAPIKey:                v.LivekitAPIKey,
		LiveKitAPISecret:             v.LivekitAPISecret,
		MaxUsersForWebRTC:            v.MaxUsersForWebRTC,
		LiveKitSwitchOnCPULimitation: v.LivekitSwitchOnCPULimitation,
		RoomAPIBindHost:              strings.Trim(v.RoomAPIBindHost, "[]"),
		StorageDirectory:             v.StorageDirectory,
		EmbeddedDomainsWhitelist:     list(v.EmbeddedDomainsWhitelist),
		RedisHost:                    v.RedisHost,
		RedisPassword:                v.RedisPassword,
		RedisPort:                    v.RedisPort,
		UploaderRedisDB:              v.RedisDbNumber,
		StoreVariablesForLocalMaps:   v.StoreVariablesForLocalMaps,
		MapStorage: mapstorage.Options{
			Auth: mapstorage.Auth{
				Basic: v.EnableBasicAuthentication, User: v.AuthenticationUser, Password: v.AuthenticationPassword,
				Bearer: v.EnableBearerAuthentication, Token: v.AuthenticationToken,
				Validator: &mapstorage.Validator{URL: v.AuthenticationValidatorURL, Production: v.NodeEnv == "production"},
			},
			CacheControl:        v.CacheControl,
			MaxUncompressed:     int64(v.MaxUncompressedSize),
			JSONLimit:           byteSize(&errs, "BODY_PARSER_JSON_SIZE_LIMIT", v.BodyParserJSONSizeLimit),
			DirectUploadURL:     v.DirectUploadURL,
			WebHook:             webHook(v),
			EntityCollections:   list(v.EntityCollectionURLs),
			WAMTemplateURL:      v.WAMTemplateURL,
			PathPrefix:          v.PathPrefix,
			UseDomainNameInPath: v.UseDomainNameInPath,
			SecretKey:           v.SecretKey,
		},
		SecretKey:             v.SecretKey,
		AdminAPIURL:           v.AdminAPIURL,
		EnableOpenAPIEndpoint: v.EnableOpenapiEndpoint,
		AdminURL:              v.AdminURL,
		AdminAPIRetryDelay:    time.Duration(v.AdminAPIRetryDelay) * time.Millisecond,
		AdminAPIToken:         v.AdminAPIToken,
		AdminSocketsToken:     v.AdminSocketsToken,
		Analytics: Analytics{
			FlushInterval: time.Duration(v.AnalyticsFlushIntervalMS) * time.Millisecond,
			Timeout:       time.Duration(v.AnalyticsTimeoutMS) * time.Millisecond,
			MaxQueue:      v.AnalyticsMaxQueueSize,
			MaxBatch:      v.AnalyticsMaxBatchSize,
		},
		DisableAnonymous:          v.DisableAnonymous,
		SocketIdleTimer:           time.Duration(v.SocketIdleTimer) * time.Second,
		ClientDisconnectRetention: time.Duration(v.ClientDisconnectionRetentionMS) * time.Millisecond,
		PusherURL:                 v.PusherURL,
		FrontURL:                  v.FrontURL,
		AssetsURL:                 strings.TrimSuffix(v.AssetsURL, "/"),
		AssetsInternalURL:         strings.TrimSuffix(firstNonEmpty(v.AssetsInternalURL, v.AssetsURL), "/"),
		StartRoomURL:              v.StartRoomURL,
		PublicMapStorageURL:       v.PublicMapStorageURL,
		EnableMapEditor:           v.EnableMapEditor,
		MapEditorAllowAllUsers:    v.MapEditorAllowAllUsers,
		MapEditorAllowedUsers:     list(v.MapEditorAllowedUsers),
		MinimumDistance:           v.MinimumDistance,
		GroupRadius:               v.GroupRadius,
		MaxPerGroup:               v.MaxPerGroup,
		PrometheusToken:           v.PrometheusAuthorizationToken,

		DefaultWokaName:                  v.DefaultWokaName,
		DefaultWokaTexture:               v.DefaultWokaTexture,
		SkipCameraPage:                   v.SkipCameraPage,
		DefaultCameraPrivacySettings:     v.DefaultCameraPrivacySettings,
		DefaultMicrophonePrivacySettings: v.DefaultMicrophonePrivacySettings,
		BypassPWA:                        v.BypassPWA,
		ProvideDefaultWokaName:           oneOf(&errs, "PROVIDE_DEFAULT_WOKA_NAME", v.ProvideDefaultWokaName, "no", "random", "fix", "fix-plus-random-numbers"),
		ProvideDefaultWokaTexture:        oneOf(&errs, "PROVIDE_DEFAULT_WOKA_TEXTURE", v.ProvideDefaultWokaTexture, "no", "random", "fix"),
		EnableChat:                       v.EnableChat,
		EnableChatUpload:                 v.EnableChatUpload,
		EnableChatOnlineList:             v.EnableChatOnlineList,
		EnableChatDisconnectedList:       v.EnableChatDisconnectedList,
		EnableSay:                        v.EnableSay,
		EnableIssueReport:                v.EnableIssueReport,
		EnableTutorial:                   v.EnableTutorial,
		GoogleDrivePickerClientID:        v.GoogleDrivePickerClientID,
		ServerName:                       v.ServerName,
		ServerMotd:                       v.ServerMotd,
		NodeEnv:                          v.NodeEnv,
		AllowedCORSOrigin:                v.AllowedCORSOrigin,
		MatrixPublicURI:                  v.MatrixPublicURI,
		Matrix: Matrix{APIURI: v.MatrixAPIURI, AdminUser: v.MatrixAdminUser, AdminPassword: v.MatrixAdminPassword,
			Domain: v.MatrixDomain},
		MapStorageAPIToken:   v.MapStorageAPIToken,
		Jitsi:                Jitsi{URL: v.JitsiURL, ISS: v.JitsiISS, Secret: v.SecretJitsiKey},
		BBB:                  BBB{URL: v.BBBURL, Secret: v.BBBSecret},
		StunServer:           v.StunServer,
		TurnServer:           v.TurnServer,
		TurnUser:             v.TurnUser,
		TurnPassword:         v.TurnPassword,
		TurnStaticAuthSecret: v.TurnStaticAuthSecret,
	}
	// OPENID_* replaced OPID_*, which are still read.
	c.OpenID = OpenID{
		ClientID: firstNonEmpty(v.OpenidClientID, v.OPIDClientID), ClientSecret: firstNonEmpty(v.OpenidClientSecret, v.OPIDClientSecret),
		Issuer: firstNonEmpty(v.OpenidClientIssuer, v.OPIDClientIssuer), Scope: firstNonEmpty(v.OpenidScope, v.OPIDScope, "openid email profile "),
		UsernameClaim: firstNonEmpty(v.OpenidUsernameClaim, v.OPIDUsernameClaim, "username"),
		LocaleClaim:   firstNonEmpty(v.OpenidLocaleClaim, v.OPIDLocaleClaim, "locale"),
		TagsClaim:     firstNonEmpty(v.OpenidTagsClaim, v.OPIDTagsClaim, "tags"),
		Prompt:        firstNonEmpty(v.OpenidPrompt, v.OPIDPrompt),
	}
	deprecated := firstNonEmpty(v.OPIDClientID, v.OPIDClientSecret, v.OPIDClientIssuer, v.OPIDProfileScreenProvider, v.OPIDScope,
		v.OPIDPrompt, v.OPIDUsernameClaim, v.OPIDLocaleClaim, v.OPIDWokaNamePolicy, v.OPIDTagsClaim) != ""
	if c.OpenID.Prompt == "" && deprecated {
		c.OpenID.Prompt = "login"
	}
	if c.OpenID.ClientID != "" && c.PusherURL == "" {
		errs = append(errs, "PUSHER_URL: required with OPENID_CLIENT_ID")
	}
	c.PlayerVariablesMaxTTL = -1
	if ttl := v.PlayerVariablesMaxTTL; ttl != "" {
		n, err := strconv.ParseInt(ttl, 10, 64)
		if err != nil {
			errs = append(errs, "PLAYER_VARIABLES_MAX_TTL: expected an integer")
		}
		c.PlayerVariablesMaxTTL = n
	}
	c.ServerIcon = firstNonEmpty(v.ServerIcon, c.PusherURL+"/static/images/favicons/icon-512x512.png")
	policies := []string{"user_input", "allow_override_opid", "force_opid"}
	c.OpidWokaNamePolicy = firstNonEmpty(
		oneOf(&errs, "OPENID_WOKA_NAME_POLICY", v.OpenidWokaNamePolicy, policies...),
		oneOf(&errs, "OPID_WOKA_NAME_POLICY", v.OPIDWokaNamePolicy, policies...),
		"user_input",
	)
	c.Uploader = uploader.Options{AdminAPIURL: c.AdminAPIURL, PublicURL: v.UploaderURL, AllowedOrigin: firstNonEmpty(v.AllowedCORSOrigin, v.PlayURL, "*"),
		EnableUpload: c.EnableChatUpload, MaxFileSize: int64(v.UploadMaxFilesize)}
	c.UploaderS3 = UploaderS3{Endpoint: v.AWSEndpoint, Region: v.AWSDefaultRegion, Bucket: v.AWSBucket,
		AccessKey: v.AWSAccessKeyID, Secret: v.AWSSecretAccessKey,
		URLTTL: time.Duration(v.UploaderAWSSignedURLExpiration) * time.Second}
	c.RecordingConfigured = v.LivekitRecordingS3Endpoint != "" && v.LivekitRecordingS3Bucket != "" &&
		v.LivekitRecordingS3AccessKey != "" && v.LivekitRecordingS3SecretKey != "" &&
		v.LivekitRecordingS3Region != ""
	c.RecordingS3 = RecordingS3{Endpoint: v.LivekitRecordingS3Endpoint, CDNEndpoint: v.LivekitRecordingS3CDNEndpoint,
		AccessKey: v.LivekitRecordingS3AccessKey, Secret: v.LivekitRecordingS3SecretKey,
		Region: v.LivekitRecordingS3Region, Bucket: v.LivekitRecordingS3Bucket}
	// Recording needs the egress of a LiveKit server, besides the bucket.
	c.RecordingConfigured = c.RecordingConfigured && c.LiveKitHost != "" && c.LiveKitAPIKey != "" && c.LiveKitAPISecret != ""
	c.MatrixEnabled = v.MatrixPublicURI != "" && v.MatrixAPIURI != "" &&
		v.MatrixAdminUser != "" && v.MatrixAdminPassword != "" && v.MatrixDomain != ""

	if c.SecretKey == "" {
		errs = append(errs, "SECRET_KEY: required")
	}
	// PROMETHEUS_PORT equal to the HTTP port means "serve on the main port", like the pusher.
	if p := v.PrometheusPort; p != c.HTTPPort {
		c.PrometheusPort = p
	}

	c.FrontEnv = frontEnv(v, c, environ)

	if len(errs) > 0 {
		return nil, fmt.Errorf("invalid environment variables:\n  %s", strings.Join(errs, "\n  "))
	}
	return c, nil
}

func frontEnv(v *vars, c *Config, environ map[string]string) map[string]any {
	var publicMapStoragePrefix any
	if c.PublicMapStorageURL != "" {
		if u, err := url.Parse(c.PublicMapStorageURL); err == nil {
			publicMapStoragePrefix = u.Path
		}
	}
	profileProvider := firstNonEmpty(v.OpenidProfileScreenProvider, v.OPIDProfileScreenProvider)
	if adminURL := v.AdminURL; profileProvider == "" && adminURL != "" {
		profileProvider = adminURL + "/profile"
	}
	c.ProfileScreenProvider = profileProvider
	c.AutologinURL = v.AutologinURL
	if c.AutologinURL == "" && c.AdminURL != "" {
		c.AutologinURL = c.AdminURL + "/workadventure/login"
	}

	env := map[string]any{
		"DEBUG_MODE":                        v.DebugMode,
		"PUSHER_URL":                        c.PusherURL,
		"FRONT_URL":                         c.FrontURL,
		"ADMIN_URL":                         nilIfEmpty(v.AdminURL),
		"UPLOADER_URL":                      v.UploaderURL,
		"ICON_URL":                          v.IconURL,
		"SKIP_RENDER_OPTIMIZATIONS":         v.SkipRenderOptimizations,
		"JITSI_URL":                         nilIfEmpty(v.JitsiURL),
		"JITSI_PRIVATE_MODE":                v.JitsiPrivateMode,
		"ENABLE_MAP_EDITOR":                 c.EnableMapEditor,
		"PUBLIC_MAP_STORAGE_PREFIX":         publicMapStoragePrefix,
		"MAX_USERNAME_LENGTH":               v.MaxUsernameLength,
		"MAX_PER_GROUP":                     c.MaxPerGroup,
		"PROXIMITY_FILE_TRANSFER_MAX_USERS": v.ProximityFileTransferMaxUsers,
		"MAX_DISPLAYED_VIDEOS":              v.MaxDisplayedVideos,
		"LIVEKIT_PIXEL_DENSITY":             v.LivekitPixelDensity,
		"NODE_ENV":                          firstNonEmpty(c.NodeEnv, "development"),
		"CONTACT_URL":                       nilIfEmpty(v.ContactURL),
		"POSTHOG_API_KEY":                   nilIfEmpty(v.PosthogAPIKey),
		"POSTHOG_URL":                       nilIfEmpty(v.PosthogURL),
		"DISABLE_ANONYMOUS":                 c.DisableAnonymous,
		"ENABLE_OPENID":                     v.OpenidClientID != "" || v.OPIDClientID != "",
		"OPID_PROFILE_SCREEN_PROVIDER":      nilIfEmpty(profileProvider),
		"OPID_WOKA_NAME_POLICY":             c.OpidWokaNamePolicy,
		"ENABLE_CHAT_UPLOAD":                c.EnableChatUpload,
		"FALLBACK_LOCALE":                   nilIfEmpty(v.FallbackLocale),
		"ENABLE_REPORT_ISSUES_MENU":         v.EnableReportIssuesMenu,
		"REPORT_ISSUES_URL":                 nilIfEmpty(v.ReportIssuesURL),
		"CLIENT_DISCONNECTION_RETENTION_MS": int(c.ClientDisconnectRetention / time.Millisecond),
		"SENTRY_DSN_FRONT":                  sentryDSN(v, environ),
		"SENTRY_DSN_PUSHER":                 nilIfEmpty(v.SentryDSNPusher),
		"SENTRY_ENVIRONMENT":                nilIfEmpty(v.SentryEnvironment),
		"SENTRY_RELEASE":                    nilIfEmpty(v.SentryRelease),
		"SENTRY_TRACES_SAMPLE_RATE":         v.SentryTracesSampleRate,
		"WOKA_SPEED":                        v.WokaSpeed,
		"KLAXOON_ENABLED":                   v.KlaxoonEnabled,
		"KLAXOON_CLIENT_ID":                 nilIfEmpty(v.KlaxoonClientID),
		"YOUTUBE_ENABLED":                   v.YoutubeEnabled,
		"GOOGLE_DRIVE_ENABLED":              v.GoogleDriveEnabled,
		"GOOGLE_DOCS_ENABLED":               v.GoogleDocsEnabled,
		"GOOGLE_SHEETS_ENABLED":             v.GoogleSheetsEnabled,
		"GOOGLE_SLIDES_ENABLED":             v.GoogleSlidesEnabled,
		"ERASER_ENABLED":                    v.EraserEnabled,
		"EXCALIDRAW_ENABLED":                v.ExcalidrawEnabled,
		"EXCALIDRAW_DOMAINS":                list(v.ExcalidrawDomains),
		"CARDS_ENABLED":                     v.CardsEnabled,
		"TLDRAW_ENABLED":                    v.TldrawEnabled,
		"MINIMUM_DISTANCE":                  c.MinimumDistance,
		"GOOGLE_DRIVE_PICKER_CLIENT_ID":     nilIfEmpty(v.GoogleDrivePickerClientID),
		"GOOGLE_DRIVE_PICKER_APP_ID":        nilIfEmpty(v.GoogleDrivePickerAppID),
		"EMBEDLY_KEY":                       nilIfEmpty(v.EmbedlyKey),
		"MATRIX_PUBLIC_URI":                 nilIfEmpty(v.MatrixPublicURI),
		"ENABLE_CHAT":                       c.EnableChat,
		"ENABLE_CHAT_ONLINE_LIST":           c.EnableChatOnlineList,
		"ENABLE_CHAT_DISCONNECTED_LIST":     c.EnableChatDisconnectedList,
		"MATRIX_ADMIN_USER":                 nilIfEmpty(v.MatrixAdminUser),
		"MATRIX_DOMAIN":                     nilIfEmpty(v.MatrixDomain),
		"ENABLE_SAY":                        c.EnableSay,
		"ENABLE_ISSUE_REPORT":               c.EnableIssueReport,
		"GRPC_MAX_MESSAGE_SIZE":             v.GRPCMaxMessageSize,
		"TURN_CREDENTIALS_RENEWAL_TIME":     v.TurnCredentialsRenewalTime,
		"DEFAULT_WOKA_NAME":                 c.DefaultWokaName,
		"DEFAULT_WOKA_TEXTURE":              c.DefaultWokaTexture,
		"SKIP_CAMERA_PAGE":                  c.SkipCameraPage,
		"BYPASS_PWA":                        c.BypassPWA,
		"PROVIDE_DEFAULT_WOKA_NAME":         nilIfEmpty(c.ProvideDefaultWokaName),
		"PROVIDE_DEFAULT_WOKA_TEXTURE":      nilIfEmpty(c.ProvideDefaultWokaTexture),
		"ENABLE_TUTORIAL":                   c.EnableTutorial,
	}
	for k, v := range env {
		if v == nil {
			delete(env, k)
		}
	}
	return env
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// sentryDSN is SENTRY_DSN_FRONT as the pusher gives it: set but empty is "", which the front tells apart from unset
// (the issue report button).
func sentryDSN(v *vars, environ map[string]string) any {
	if dsn, set := environ["SENTRY_DSN_FRONT"]; set {
		return dsn
	}
	return nilIfEmpty(v.SentryDSNFront)
}

// RecordingS3 is where the recordings go (LIVEKIT_RECORDING_S3_*).
type RecordingS3 struct{ Endpoint, CDNEndpoint, AccessKey, Secret, Region, Bucket string }

// Analytics is the batching of the events sent to the admin (A22).
type Analytics struct {
	FlushInterval, Timeout time.Duration
	MaxQueue, MaxBatch     int
}

// Matrix is the Synapse admin of the pusher (MATRIX_API_URI, MATRIX_ADMIN_USER, MATRIX_ADMIN_PASSWORD, MATRIX_DOMAIN).
type Matrix struct{ APIURI, AdminUser, AdminPassword, Domain string }

type Jitsi struct{ URL, ISS, Secret string }
type BBB struct{ URL, Secret string }

// webHook is map-storage's WEB_HOOK_URL, unless ENABLE_WEB_HOOK is false.
func webHook(v *vars) mapstorage.WebHook {
	if !v.EnableWebHook {
		return mapstorage.WebHook{}
	}
	return mapstorage.WebHook{URL: v.WebHookURL, Token: v.WebHookAPIToken}
}

// UploaderS3 is the bucket of the uploader (S3StorageProvider), used when bucket, keys and region are all set.
type UploaderS3 struct {
	Endpoint, Region, Bucket, AccessKey, Secret string
	URLTTL                                      time.Duration
}

func (u UploaderS3) Enabled() bool {
	return u.Bucket != "" && u.AccessKey != "" && u.Secret != "" && u.Region != ""
}

// Complete says whether the recording bucket is set (LIVEKIT_RECORDING_S3_*).
func (r RecordingS3) Complete() bool {
	return r.Endpoint != "" && r.Bucket != "" && r.AccessKey != "" && r.Secret != "" && r.Region != ""
}
