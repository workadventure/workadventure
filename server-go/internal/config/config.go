// Package config reads the environment variables of the four TypeScript services (pusher, back, map-storage,
// uploader) that the single Go server replaces. Parsing follows the zod helpers of
// libs/shared-utils/src/EnvironmentVariables/EnvironmentVariableUtils.ts: a boolean only accepts
// true|false|0|1|"", an integer only digits, and "" always means "use the default".
//
// Variables the server does not need yet are still accepted: an unknown variable is ignored, like zod's
// z.object() does, so a docker-compose file written for the TS services starts this server unchanged.
package config

import (
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"

	"fmt"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	// HTTP. The pusher listened on PUSHER_HTTP_PORT (express) and PUSHER_WS_PORT (uWebSockets.js); this server
	// serves everything on both ports, so the existing reverse-proxy rules keep working.
	HTTPPort int
	WSPort   int
	// MapStoragePort answers for the map-storage host (SERVER_MAP_STORAGE_PORT of the server variant; map-storage
	// itself always listened on 3000). 0: not served.
	MapStoragePort int

	// Map storage (map-storage's variables)
	StorageDirectory string
	MapStorage       mapstorage.Options

	EmbeddedDomainsWhitelist []string

	// Variables
	RedisHost, RedisPassword   string
	RedisPort                  int
	StoreVariablesForLocalMaps bool
	PlayerVariablesMaxTTL      int64 // seconds; -1: no maximum

	SecretKey        string
	AdminAPIURL      string
	AdminAPIToken    string // ADMIN_API_TOKEN: the administration routes (POST /global/event)
	DisableAnonymous bool
	OpenID           OpenID

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
	AllowedCORSOrigin                string
	MatrixPublicURI                  string
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
func Load() (*Config, error) { return parse(os.Getenv) }

var digits = regexp.MustCompile(`^\d*$`)

type reader struct {
	get  func(string) string
	errs []string
}

func (r *reader) str(name string) string { return r.get(name) }

// opt returns nil for an empty variable, so that FrontEnv leaves it out.
func (r *reader) opt(name string) any {
	if v := r.get(name); v != "" {
		return v
	}
	return nil
}

func (r *reader) boolean(name string, def bool) bool {
	switch v := r.get(name); v {
	case "":
		return def
	case "true", "1":
		return true
	case "false", "0":
		return false
	default:
		r.errs = append(r.errs, fmt.Sprintf("%s: expected true|false|0|1, got %q", name, v))
		return def
	}
}

func (r *reader) integer(name string, def int) int {
	v := r.get(name)
	if v == "" {
		return def
	}
	if !digits.MatchString(v) {
		r.errs = append(r.errs, fmt.Sprintf("%s: must be a positive integer number, got %q", name, v))
		return def
	}
	n, _ := strconv.Atoi(v)
	return n
}

func (r *reader) float(name string, def float64) float64 {
	v := r.get(name)
	if v == "" {
		return def
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		r.errs = append(r.errs, fmt.Sprintf("%s: must be a number, got %q", name, v))
		return def
	}
	return f
}

func (r *reader) oneOf(name string, allowed ...string) string {
	v := r.get(name)
	if v == "" {
		return ""
	}
	for _, a := range allowed {
		if v == a {
			return v
		}
	}
	r.errs = append(r.errs, fmt.Sprintf("%s: must be one of %v, got %q", name, allowed, v))
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

func parse(get func(string) string) (*Config, error) {
	r := &reader{get: get}
	c := &Config{
		HTTPPort:                   r.integer("PUSHER_HTTP_PORT", 3000),
		WSPort:                     r.integer("PUSHER_WS_PORT", 3001),
		MapStoragePort:             r.integer("SERVER_MAP_STORAGE_PORT", 0),
		StorageDirectory:           firstNonEmpty(r.str("STORAGE_DIRECTORY"), "./public"),
		EmbeddedDomainsWhitelist:   list(r.str("EMBEDDED_DOMAINS_WHITELIST")),
		RedisHost:                  r.str("REDIS_HOST"),
		RedisPassword:              r.str("REDIS_PASSWORD"),
		RedisPort:                  r.integer("REDIS_PORT", 6379),
		StoreVariablesForLocalMaps: r.boolean("STORE_VARIABLES_FOR_LOCAL_MAPS", false),
		MapStorage: mapstorage.Options{
			Auth: mapstorage.Auth{
				Basic: r.boolean("ENABLE_BASIC_AUTHENTICATION", false), User: r.str("AUTHENTICATION_USER"), Password: r.str("AUTHENTICATION_PASSWORD"),
				Bearer: r.boolean("ENABLE_BEARER_AUTHENTICATION", false), Token: r.str("AUTHENTICATION_TOKEN"),
			},
			CacheControl:      firstNonEmpty(r.str("CACHE_CONTROL"), "public, s-max-age=10"),
			MaxUncompressed:   int64(r.integer("MAX_UNCOMPRESSED_SIZE", 1<<30)),
			DirectUploadURL:   r.str("DIRECT_UPLOAD_URL"),
			EntityCollections: list(r.str("ENTITY_COLLECTION_URLS")),
			SecretKey:         r.str("SECRET_KEY"),
		},
		SecretKey:                 r.str("SECRET_KEY"),
		AdminAPIURL:               r.str("ADMIN_API_URL"),
		AdminAPIToken:             r.str("ADMIN_API_TOKEN"),
		DisableAnonymous:          r.boolean("DISABLE_ANONYMOUS", false),
		SocketIdleTimer:           time.Duration(r.integer("SOCKET_IDLE_TIMER", 120)) * time.Second,
		ClientDisconnectRetention: time.Duration(r.integer("CLIENT_DISCONNECTION_RETENTION_MS", 30_000)) * time.Millisecond,
		PusherURL:                 r.str("PUSHER_URL"),
		FrontURL:                  r.str("FRONT_URL"),
		AssetsURL:                 strings.TrimSuffix(r.str("ASSETS_URL"), "/"),
		AssetsInternalURL:         strings.TrimSuffix(firstNonEmpty(r.str("ASSETS_INTERNAL_URL"), r.str("ASSETS_URL")), "/"),
		StartRoomURL:              firstNonEmpty(r.str("START_ROOM_URL"), "/_/global/maps.workadventu.re/starter/map.json"),
		PublicMapStorageURL:       r.str("PUBLIC_MAP_STORAGE_URL"),
		EnableMapEditor:           r.boolean("ENABLE_MAP_EDITOR", false),
		MapEditorAllowAllUsers:    r.boolean("MAP_EDITOR_ALLOW_ALL_USERS", true),
		MapEditorAllowedUsers:     list(r.str("MAP_EDITOR_ALLOWED_USERS")),
		MinimumDistance:           r.integer("MINIMUM_DISTANCE", 64),
		GroupRadius:               r.integer("GROUP_RADIUS", 48),
		MaxPerGroup:               r.integer("MAX_PER_GROUP", 4),
		PrometheusToken:           r.str("PROMETHEUS_AUTHORIZATION_TOKEN"),

		DefaultWokaName:                  r.str("DEFAULT_WOKA_NAME"),
		DefaultWokaTexture:               r.str("DEFAULT_WOKA_TEXTURE"),
		SkipCameraPage:                   r.boolean("SKIP_CAMERA_PAGE", false),
		DefaultCameraPrivacySettings:     r.boolean("DEFAULT_CAMERA_PRIVACY_SETTINGS", false),
		DefaultMicrophonePrivacySettings: r.boolean("DEFAULT_MICROPHONE_PRIVACY_SETTINGS", true),
		BypassPWA:                        r.boolean("BYPASS_PWA", false),
		ProvideDefaultWokaName:           r.oneOf("PROVIDE_DEFAULT_WOKA_NAME", "no", "random", "fix", "fix-plus-random-numbers"),
		ProvideDefaultWokaTexture:        r.oneOf("PROVIDE_DEFAULT_WOKA_TEXTURE", "no", "random", "fix"),
		EnableChat:                       r.boolean("ENABLE_CHAT", true),
		EnableChatUpload:                 r.boolean("ENABLE_CHAT_UPLOAD", true),
		EnableChatOnlineList:             r.boolean("ENABLE_CHAT_ONLINE_LIST", true),
		EnableChatDisconnectedList:       r.boolean("ENABLE_CHAT_DISCONNECTED_LIST", true),
		EnableSay:                        r.boolean("ENABLE_SAY", true),
		EnableIssueReport:                r.boolean("ENABLE_ISSUE_REPORT", true),
		EnableTutorial:                   r.boolean("ENABLE_TUTORIAL", true),
		GoogleDrivePickerClientID:        r.str("GOOGLE_DRIVE_PICKER_CLIENT_ID"),
		ServerName:                       firstNonEmpty(r.str("SERVER_NAME"), "WorkAdventure Server"),
		ServerMotd:                       firstNonEmpty(r.str("SERVER_MOTD"), "A WorkAdventure Server"),
		NodeEnv:                          r.str("NODE_ENV"),
		AllowedCORSOrigin:                r.str("ALLOWED_CORS_ORIGIN"),
		MatrixPublicURI:                  r.str("MATRIX_PUBLIC_URI"),
		StunServer:                       r.str("STUN_SERVER"),
		TurnServer:                       r.str("TURN_SERVER"),
		TurnUser:                         r.str("TURN_USER"),
		TurnPassword:                     r.str("TURN_PASSWORD"),
		TurnStaticAuthSecret:             r.str("TURN_STATIC_AUTH_SECRET"),
	}
	opid := func(name, def string) string { return firstNonEmpty(r.str("OPENID_"+name), r.str("OPID_"+name), def) }
	c.OpenID = OpenID{
		ClientID: opid("CLIENT_ID", ""), ClientSecret: opid("CLIENT_SECRET", ""), Issuer: opid("CLIENT_ISSUER", ""),
		Scope: opid("SCOPE", "openid email profile "), UsernameClaim: opid("USERNAME_CLAIM", "username"),
		LocaleClaim: opid("LOCALE_CLAIM", "locale"), TagsClaim: opid("TAGS_CLAIM", "tags"),
	}
	deprecated := false
	for _, name := range []string{"CLIENT_ID", "CLIENT_SECRET", "CLIENT_ISSUER", "PROFILE_SCREEN_PROVIDER", "SCOPE", "PROMPT",
		"USERNAME_CLAIM", "LOCALE_CLAIM", "WOKA_NAME_POLICY", "TAGS_CLAIM"} {
		deprecated = deprecated || r.str("OPID_"+name) != ""
	}
	c.OpenID.Prompt = opid("PROMPT", "")
	if c.OpenID.Prompt == "" && deprecated {
		c.OpenID.Prompt = "login"
	}
	if c.OpenID.ClientID != "" && c.PusherURL == "" {
		r.errs = append(r.errs, "PUSHER_URL: required with OPENID_CLIENT_ID")
	}
	c.PlayerVariablesMaxTTL = -1
	if v := r.str("PLAYER_VARIABLES_MAX_TTL"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			r.errs = append(r.errs, "PLAYER_VARIABLES_MAX_TTL: expected an integer")
		}
		c.PlayerVariablesMaxTTL = n
	}
	c.ServerIcon = firstNonEmpty(r.str("SERVER_ICON"), c.PusherURL+"/static/images/favicons/icon-512x512.png")
	policies := []string{"user_input", "allow_override_opid", "force_opid"}
	c.OpidWokaNamePolicy = firstNonEmpty(
		r.oneOf("OPENID_WOKA_NAME_POLICY", policies...),
		r.oneOf("OPID_WOKA_NAME_POLICY", policies...),
		"user_input",
	)
	c.RecordingConfigured = r.str("LIVEKIT_RECORDING_S3_ENDPOINT") != "" && r.str("LIVEKIT_RECORDING_S3_BUCKET") != "" &&
		r.str("LIVEKIT_RECORDING_S3_ACCESS_KEY") != "" && r.str("LIVEKIT_RECORDING_S3_SECRET_KEY") != "" &&
		r.str("LIVEKIT_RECORDING_S3_REGION") != ""
	c.MatrixEnabled = r.str("MATRIX_PUBLIC_URI") != "" && r.str("MATRIX_API_URI") != "" &&
		r.str("MATRIX_ADMIN_USER") != "" && r.str("MATRIX_ADMIN_PASSWORD") != "" && r.str("MATRIX_DOMAIN") != ""

	if c.SecretKey == "" {
		r.errs = append(r.errs, "SECRET_KEY: required")
	}
	// PROMETHEUS_PORT equal to the HTTP port means "serve on the main port", like the pusher.
	if p := r.integer("PROMETHEUS_PORT", 0); p != c.HTTPPort {
		c.PrometheusPort = p
	}

	c.FrontEnv = frontEnv(r, c)

	if len(r.errs) > 0 {
		return nil, fmt.Errorf("invalid environment variables:\n  %s", strings.Join(r.errs, "\n  "))
	}
	return c, nil
}

func frontEnv(r *reader, c *Config) map[string]any {
	var publicMapStoragePrefix any
	if c.PublicMapStorageURL != "" {
		if u, err := url.Parse(c.PublicMapStorageURL); err == nil {
			publicMapStoragePrefix = u.Path
		}
	}
	profileProvider := firstNonEmpty(r.str("OPENID_PROFILE_SCREEN_PROVIDER"), r.str("OPID_PROFILE_SCREEN_PROVIDER"))
	if adminURL := r.str("ADMIN_URL"); profileProvider == "" && adminURL != "" {
		profileProvider = adminURL + "/profile"
	}

	env := map[string]any{
		"DEBUG_MODE":                        r.boolean("DEBUG_MODE", false),
		"PUSHER_URL":                        c.PusherURL,
		"FRONT_URL":                         c.FrontURL,
		"ADMIN_URL":                         r.opt("ADMIN_URL"),
		"UPLOADER_URL":                      r.str("UPLOADER_URL"),
		"ICON_URL":                          r.str("ICON_URL"),
		"SKIP_RENDER_OPTIMIZATIONS":         r.boolean("SKIP_RENDER_OPTIMIZATIONS", false),
		"JITSI_URL":                         r.opt("JITSI_URL"),
		"JITSI_PRIVATE_MODE":                r.boolean("JITSI_PRIVATE_MODE", false),
		"ENABLE_MAP_EDITOR":                 c.EnableMapEditor,
		"PUBLIC_MAP_STORAGE_PREFIX":         publicMapStoragePrefix,
		"MAX_USERNAME_LENGTH":               r.integer("MAX_USERNAME_LENGTH", 10),
		"MAX_PER_GROUP":                     c.MaxPerGroup,
		"MAX_DISPLAYED_VIDEOS":              r.integer("MAX_DISPLAYED_VIDEOS", 16),
		"LIVEKIT_PIXEL_DENSITY":             r.float("LIVEKIT_PIXEL_DENSITY", 2.0/3.0),
		"NODE_ENV":                          firstNonEmpty(c.NodeEnv, "development"),
		"CONTACT_URL":                       r.opt("CONTACT_URL"),
		"POSTHOG_API_KEY":                   r.opt("POSTHOG_API_KEY"),
		"POSTHOG_URL":                       r.opt("POSTHOG_URL"),
		"DISABLE_ANONYMOUS":                 c.DisableAnonymous,
		"ENABLE_OPENID":                     r.str("OPENID_CLIENT_ID") != "" || r.str("OPID_CLIENT_ID") != "",
		"OPID_PROFILE_SCREEN_PROVIDER":      nilIfEmpty(profileProvider),
		"OPID_WOKA_NAME_POLICY":             c.OpidWokaNamePolicy,
		"ENABLE_CHAT_UPLOAD":                c.EnableChatUpload,
		"FALLBACK_LOCALE":                   r.opt("FALLBACK_LOCALE"),
		"ENABLE_REPORT_ISSUES_MENU":         r.boolean("ENABLE_REPORT_ISSUES_MENU", false),
		"REPORT_ISSUES_URL":                 r.opt("REPORT_ISSUES_URL"),
		"CLIENT_DISCONNECTION_RETENTION_MS": int(c.ClientDisconnectRetention / time.Millisecond),
		"SENTRY_DSN_FRONT":                  sentryDSN(r),
		"SENTRY_DSN_PUSHER":                 r.opt("SENTRY_DSN_PUSHER"),
		"SENTRY_ENVIRONMENT":                r.opt("SENTRY_ENVIRONMENT"),
		"SENTRY_RELEASE":                    r.opt("SENTRY_RELEASE"),
		"SENTRY_TRACES_SAMPLE_RATE":         r.float("SENTRY_TRACES_SAMPLE_RATE", 0.1),
		"WOKA_SPEED":                        r.integer("WOKA_SPEED", 9),
		"KLAXOON_ENABLED":                   r.boolean("KLAXOON_ENABLED", false),
		"KLAXOON_CLIENT_ID":                 r.opt("KLAXOON_CLIENT_ID"),
		"YOUTUBE_ENABLED":                   r.boolean("YOUTUBE_ENABLED", false),
		"GOOGLE_DRIVE_ENABLED":              r.boolean("GOOGLE_DRIVE_ENABLED", false),
		"GOOGLE_DOCS_ENABLED":               r.boolean("GOOGLE_DOCS_ENABLED", false),
		"GOOGLE_SHEETS_ENABLED":             r.boolean("GOOGLE_SHEETS_ENABLED", false),
		"GOOGLE_SLIDES_ENABLED":             r.boolean("GOOGLE_SLIDES_ENABLED", false),
		"ERASER_ENABLED":                    r.boolean("ERASER_ENABLED", false),
		"EXCALIDRAW_ENABLED":                r.boolean("EXCALIDRAW_ENABLED", false),
		"EXCALIDRAW_DOMAINS":                list(r.str("EXCALIDRAW_DOMAINS")),
		"CARDS_ENABLED":                     r.boolean("CARDS_ENABLED", false),
		"TLDRAW_ENABLED":                    r.boolean("TLDRAW_ENABLED", false),
		"MINIMUM_DISTANCE":                  c.MinimumDistance,
		"GOOGLE_DRIVE_PICKER_CLIENT_ID":     r.opt("GOOGLE_DRIVE_PICKER_CLIENT_ID"),
		"GOOGLE_DRIVE_PICKER_APP_ID":        r.opt("GOOGLE_DRIVE_PICKER_APP_ID"),
		"EMBEDLY_KEY":                       r.opt("EMBEDLY_KEY"),
		"MATRIX_PUBLIC_URI":                 r.opt("MATRIX_PUBLIC_URI"),
		"ENABLE_CHAT":                       c.EnableChat,
		"ENABLE_CHAT_ONLINE_LIST":           c.EnableChatOnlineList,
		"ENABLE_CHAT_DISCONNECTED_LIST":     c.EnableChatDisconnectedList,
		"MATRIX_ADMIN_USER":                 r.opt("MATRIX_ADMIN_USER"),
		"MATRIX_DOMAIN":                     r.opt("MATRIX_DOMAIN"),
		"ENABLE_SAY":                        c.EnableSay,
		"ENABLE_ISSUE_REPORT":               c.EnableIssueReport,
		"GRPC_MAX_MESSAGE_SIZE":             r.integer("GRPC_MAX_MESSAGE_SIZE", 20*1024*1024),
		"TURN_CREDENTIALS_RENEWAL_TIME":     r.integer("TURN_CREDENTIALS_RENEWAL_TIME", 60*60*1000),
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
func sentryDSN(r *reader) any {
	if v, set := os.LookupEnv("SENTRY_DSN_FRONT"); set {
		return v
	}
	return r.opt("SENTRY_DSN_FRONT")
}
