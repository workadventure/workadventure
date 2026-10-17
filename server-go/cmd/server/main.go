// Command server is the single WorkAdventure server: the pusher, the back, map-storage and the uploader in one
// process.
package main

import (
	"context"
	"errors"
	"fmt"
	"github.com/workadventure/workadventure/server-go/internal/livekit"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/matrix"
	"github.com/workadventure/workadventure/server-go/internal/s3"
	"github.com/workadventure/workadventure/server-go/internal/store"
	"log/slog"
	"net"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"runtime"
	"runtime/debug"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/analytics"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/httpapi"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
	"github.com/workadventure/workadventure/server-go/internal/registry"
	"github.com/workadventure/workadventure/server-go/internal/roomapi"
	"github.com/workadventure/workadventure/server-go/internal/uploader"
	"github.com/workadventure/workadventure/server-go/internal/ws"
)

// Set at build time (see Dockerfile): apiVersion like `npm run tag-version`, version from play/package.json.
var (
	apiVersion = "dev"
	version    = "dev"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck())
	}
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel()})))
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	// Go follows the container's CPU limit (cgroup) for GOMAXPROCS since 1.25 (with a floor of 2), but not its
	// memory limit: give that one to the garbage collector ourselves. Both are logged so a deployment can check.
	slog.Info("starting", "version", version, "apiVersion", apiVersion, "GOMAXPROCS", runtime.GOMAXPROCS(0),
		"NumCPU", runtime.NumCPU(), "GOMEMLIMIT", setMemoryLimit())

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	local, err := admin.NewLocal(cfg)
	if err != nil {
		return err
	}
	var adm admin.Admin = local
	if cfg.AdminAPIURL != "" {
		// SaaS: the server waits for the admin's capabilities before it serves, like the pusher.
		if adm, err = admin.NewHTTP(ctx, cfg, local); err != nil {
			return err
		}
	}
	tokens := auth.New(cfg.SecretKey)
	proximity := core.Config{MinimumDistance: cfg.MinimumDistance, GroupRadius: cfg.GroupRadius, MaxPerGroup: cfg.MaxPerGroup}
	rooms := registry.NewRefs(
		func(url string) *core.Room { metrics.Rooms.Inc(); return core.NewRoom(url, proximity) },
		func(r *core.Room) { r.Stop(); metrics.Rooms.Dec() },
	)

	media := core.DefaultMedia(nil)
	if cfg.LiveKitHost != "" && cfg.LiveKitAPIKey != "" && cfg.LiveKitAPISecret != "" {
		lk := livekit.New(cfg.LiveKitHost, cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
		media.LiveKit = lk
		if cfg.RecordingConfigured {
			r := cfg.RecordingS3
			media.Egress = lk.Egress(livekit.S3{Endpoint: r.Endpoint, AccessKey: r.AccessKey, Secret: r.Secret, Region: r.Region, Bucket: r.Bucket})
		}
	}
	media.MaxUsersForWebRTC, media.SwitchOnCPULimit = cfg.MaxUsersForWebRTC, cfg.LiveKitSwitchOnCPULimitation
	// Two queues, as two processes had: the pusher's waits for the capability, the back's sends the meetings once
	// configured, under its own instance id.
	events := analyticsQueue(cfg, adm, false)
	meetings := analyticsQueue(cfg, adm, true)
	if meetings != nil {
		media.Analytics = meetings.Enqueue
	}
	if h, ok := adm.(*admin.HTTP); ok && h.Capabilities()["api/livekit/credentials"] == "v1" {
		media.LiveKitFor = func(ctx context.Context, playURI string) (core.LiveKit, error) {
			if playURI == "" {
				return nil, errors.New("playUri is required when using AdminAPI for Livekit credentials")
			}
			host, key, secret, err := h.LiveKitCredentials(ctx, playURI)
			if err != nil {
				return nil, err
			}
			return livekit.New(host, key, secret), nil
		}
	}
	if h, ok := adm.(*admin.HTTP); ok {
		media.RecordingEnded = func(e core.RecordingEnded) {
			go func() {
				if err := h.RecordingEvent(context.Background(), recordingPayload(e)); err != nil {
					slog.Error("the admin was not told a recording ended", "egress", e.EgressID, "error", err)
				}
			}()
		}
	}
	go events.Run(ctx)
	go meetings.Run(ctx)
	spaces := registry.NewRefs(
		func(k core.SpaceKey) *core.Space { metrics.Spaces.Inc(); return core.NewSpaceWithMedia(k, media) },
		func(s *core.Space) { s.Stop(); metrics.Spaces.Dec() },
	)

	front := httpapi.NewFrontAssets(cfg.AssetsInternalURL, cfg.AssetsURL, apiVersion)
	go front.Poll(ctx)
	maps := mapstorage.New(cfg.StorageDirectory)
	var vars store.Hash = store.NewMemory()
	if cfg.RedisHost != "" {
		vars = store.NewRedis(net.JoinHostPort(cfg.RedisHost, strconv.Itoa(cfg.RedisPort)), cfg.RedisPassword)
	} else {
		slog.Warn("REDIS_HOST is not set: variables are kept in memory, a restart loses them")
	}
	wsServer := ws.NewServer(cfg, tokens, adm, rooms, spaces, maps, vars, apiVersion)
	maps.Changed = wsServer.MapChanged
	wsServer.SetAnalytics(events)
	if cfg.MatrixEnabled {
		wsServer.SetMatrix(matrix.New(cfg.Matrix.APIURI, cfg.Matrix.AdminUser, cfg.Matrix.AdminPassword, cfg.Matrix.Domain))
	}
	handler := httpapi.New(cfg, tokens, adm, front, wsServer, version)

	// ReadHeaderTimeout: a client that never finishes its headers must not hold a connection forever.
	newServer := func(port int, h http.Handler) *http.Server {
		return &http.Server{Addr: ":" + strconv.Itoa(port), Handler: h, ReadHeaderTimeout: 10 * time.Second}
	}
	servers := []*http.Server{newServer(cfg.HTTPPort, handler)}
	if cfg.WSPort != cfg.HTTPPort {
		servers = append(servers, newServer(cfg.WSPort, handler))
	}
	if cfg.MapStoragePort != 0 && cfg.MapStoragePort != cfg.HTTPPort && cfg.MapStoragePort != cfg.WSPort {
		servers = append(servers, newServer(cfg.MapStoragePort, maps.Handler(cfg.MapStorage)))
	}
	if cfg.UploaderPort != 0 && cfg.UploaderPort != cfg.HTTPPort && cfg.UploaderPort != cfg.WSPort && cfg.UploaderPort != cfg.MapStoragePort {
		up := cfg.Uploader
		if b := cfg.UploaderS3; b.Enabled() {
			endpoint := b.Endpoint
			if endpoint == "" {
				endpoint = "https://s3." + b.Region + ".amazonaws.com"
			}
			up.S3, up.S3URLTTL = s3.New(endpoint, b.Region, b.Bucket, b.AccessKey, b.Secret), b.URLTTL
		}
		if r, ok := vars.(*store.Redis); ok {
			up.Redis = r
		}
		servers = append(servers, newServer(cfg.UploaderPort, uploader.New(up).Handler()))
	}
	if cfg.RoomAPISecretKey != "" || cfg.AdminAPIURL != "" {
		api := roomapi.New(cfg.RoomAPISecretKey, cfg.FrontURL, rooms, wsServer.RoomVariables)
		if cfg.AdminAPIURL != "" {
			api.WithAdmin(roomapi.NewAdminAuthorizer(cfg.AdminAPIURL, cfg.NodeEnv == "production"))
		}
		roomAPI := newServer(cfg.RoomAPIPort, api)
		roomAPI.Addr = net.JoinHostPort(cfg.RoomAPIBindHost, strconv.Itoa(cfg.RoomAPIPort))
		roomAPI.Protocols = new(http.Protocols)
		roomAPI.Protocols.SetUnencryptedHTTP2(true) // gRPC without TLS (h2c with prior knowledge)
		servers = append(servers, roomAPI)
	}
	if cfg.PrometheusPort != 0 {
		// The dedicated metrics port also serves the Go profiler, behind the same token as the metrics.
		mux := http.NewServeMux()
		mux.Handle("GET /metrics", metrics.Handler(true, cfg.PrometheusToken))
		mux.HandleFunc("/debug/pprof/", metrics.Guard(cfg.PrometheusToken, pprof.Index))
		mux.HandleFunc("/debug/pprof/profile", metrics.Guard(cfg.PrometheusToken, pprof.Profile))
		servers = append(servers, newServer(cfg.PrometheusPort, mux))
	}
	errs := make(chan error, len(servers))
	for _, s := range servers {
		ln, err := net.Listen("tcp", s.Addr)
		if err != nil {
			return err
		}
		slog.Info("listening", "addr", s.Addr)
		go func() { errs <- s.Serve(ln) }()
	}

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}
	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for _, s := range servers {
		_ = s.Shutdown(shutdownCtx)
	}
	if err := wsServer.FlushVariables(shutdownCtx); err != nil {
		slog.Error("variables lost on shutdown", "error", err)
	}
	wsServer.CloseAnalytics()
	for _, k := range spaces.Keys() { // a meeting only exists once it ended
		sp := spaces.Acquire(k)
		sp.CloseMeeting(shutdownCtx)
		spaces.Release(k)
	}
	events.Drain(time.Until(deadline(shutdownCtx)))
	meetings.Drain(time.Until(deadline(shutdownCtx)))
	return nil
}

func logLevel() slog.Level {
	if os.Getenv("DEBUG") != "" {
		return slog.LevelDebug
	}
	return slog.LevelInfo
}

// setMemoryLimit sets the soft memory limit of the garbage collector to 90% of the container's limit (cgroup v2),
// unless GOMEMLIMIT is set. Without it, the heap may outgrow the container before a collection runs and the
// kernel kills the process. It returns the limit in bytes (math.MaxInt64: none).
func setMemoryLimit() int64 {
	if os.Getenv("GOMEMLIMIT") == "" {
		if b, err := os.ReadFile("/sys/fs/cgroup/memory.max"); err == nil {
			if n, err := strconv.ParseInt(strings.TrimSpace(string(b)), 10, 64); err == nil { // "max": no limit
				debug.SetMemoryLimit(n / 10 * 9)
			}
		}
	}
	return debug.SetMemoryLimit(-1)
}

// healthcheck is `server healthcheck`, for a compose healthcheck (the image has neither curl nor a shell): 0 when
// GET /ping answers on PUSHER_HTTP_PORT, 1 otherwise.
func healthcheck() int {
	port := os.Getenv("PUSHER_HTTP_PORT")
	if port == "" {
		port = "3000"
	}
	resp, err := (&http.Client{Timeout: 3 * time.Second}).Get("http://127.0.0.1:" + port + "/ping")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Fprintln(os.Stderr, "GET /ping:", resp.Status)
		return 1
	}
	return 0
}

// analyticsQueue is an analytics queue (A22). The pusher's is on when the admin offers api/analytics/events-batch
// v1; the back's always.
func analyticsQueue(cfg *config.Config, adm admin.Admin, back bool) *analytics.Queue {
	if cfg.AdminAPIURL == "" || cfg.AdminAPIToken == "" {
		return nil
	}
	id := firstSet(os.Getenv("HOSTNAME"), os.Getenv("SERVER_NAME"), "pusher")
	if back {
		id = "back:" + firstSet(os.Getenv("HOSTNAME"), os.Getenv("SERVER_NAME"), "back")
	}
	q := analytics.New(analytics.Config{AdminURL: cfg.AdminAPIURL, Token: cfg.AdminAPIToken, InstanceID: id,
		FlushInterval: cfg.Analytics.FlushInterval, Timeout: cfg.Analytics.Timeout, MaxQueue: cfg.Analytics.MaxQueue, MaxBatch: cfg.Analytics.MaxBatch})
	q.SetEnabled(back || adm.Capabilities()["api/analytics/events-batch"] == "v1")
	return q
}

func firstSet(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func deadline(ctx context.Context) time.Time {
	d, _ := ctx.Deadline()
	return d
}

// recordingPayload is the back's RecordingEventPayload.
func recordingPayload(e core.RecordingEnded) map[string]any {
	iso := func(t time.Time) any {
		if t.IsZero() {
			return nil
		}
		return t.UTC().Format("2006-01-02T15:04:05.000Z")
	}
	var errMessage any
	if e.Info.Error != "" {
		errMessage = e.Info.Error
	}
	files := make([]map[string]any, 0, len(e.Info.Files))
	for _, f := range e.Info.Files {
		files = append(files, map[string]any{"filename": f.Filename, "sizeBytes": f.SizeBytes, "durationSeconds": int64(f.Duration.Round(time.Second) / time.Second)})
	}
	return map[string]any{"phase": "ended", "status": e.Info.Status, "egressId": e.EgressID, "recordingSessionId": e.SessionID,
		"playUri": e.Recorder.PlayURI, "recorder": map[string]string{"uuid": e.Recorder.UUID, "spaceUserId": e.Recorder.ID},
		"startedAt": iso(e.Info.StartedAt), "endedAt": iso(e.Info.EndedAt), "error": errMessage, "files": files}
}
