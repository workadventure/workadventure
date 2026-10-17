// Command server is the single WorkAdventure server: the pusher, the back, map-storage and the uploader in one
// process.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
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
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
	"github.com/workadventure/workadventure/server-go/internal/registry"
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
	// Two queues, as two processes had: the pusher's waits for the capability, the back's sends the meetings once
	// configured, under its own instance id.
	events := analyticsQueue(cfg, adm, false)
	meetings := analyticsQueue(cfg, adm, true)
	go events.Run(ctx)
	go meetings.Run(ctx)
	media, recordings := buildMedia(cfg, adm, meetings)
	spaces := registry.NewRefs(
		func(k core.SpaceKey) *core.Space { metrics.Spaces.Inc(); return core.NewSpaceWithMedia(k, media) },
		func(s *core.Space) { s.Stop(); metrics.Spaces.Dec() },
	)

	front := httpapi.NewFrontAssets(cfg.AssetsInternalURL, cfg.AssetsURL, apiVersion)
	go front.Poll(ctx)
	maps := mapstorage.New(cfg.StorageDirectory)
	vars := variableStore(cfg)
	wsServer := ws.NewServer(cfg, ws.Deps{Auth: tokens, Admin: adm, Rooms: rooms, Spaces: spaces, Maps: maps, Vars: vars,
		APIVersion: apiVersion, Analytics: events, Matrix: matrixClient(cfg, vars), Recordings: recordings})
	srv := buildServers(cfg, httpapi.New(cfg, tokens, adm, front, wsServer, version), maps, buildUploader(cfg, vars),
		buildRoomAPI(cfg, rooms, wsServer))
	if err := srv.serve(ctx); err != nil {
		return err
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.shutdown(shutdownCtx) // no client may change anything after this
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
	_ = resp.Body.Close()
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
