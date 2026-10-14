// Command server is the single WorkAdventure server: the pusher, the back, map-storage and the uploader in one
// process.
package main

import (
	"context"
	"errors"
	"fmt"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
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
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/httpapi"
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
	if cfg.AdminAPIURL != "" {
		return errors.New("ADMIN_API_URL is set, but this server only supports the OSS mode (LocalAdmin) so far")
	}
	// Go follows the container's CPU limit (cgroup) for GOMAXPROCS since 1.25 (with a floor of 2), but not its
	// memory limit: give that one to the garbage collector ourselves. Both are logged so a deployment can check.
	slog.Info("starting", "version", version, "apiVersion", apiVersion, "GOMAXPROCS", runtime.GOMAXPROCS(0),
		"NumCPU", runtime.NumCPU(), "GOMEMLIMIT", setMemoryLimit())

	adm, err := admin.NewLocal(cfg)
	if err != nil {
		return err
	}
	tokens := auth.New(cfg.SecretKey)
	proximity := core.Config{MinimumDistance: cfg.MinimumDistance, GroupRadius: cfg.GroupRadius, MaxPerGroup: cfg.MaxPerGroup}
	rooms := registry.NewRefs(
		func(url string) *core.Room { metrics.Rooms.Inc(); return core.NewRoom(url, proximity) },
		func(r *core.Room) { r.Stop(); metrics.Rooms.Dec() },
	)

	spaces := registry.NewRefs(
		func(k core.SpaceKey) *core.Space { metrics.Spaces.Inc(); return core.NewSpace(k) },
		func(s *core.Space) { s.Stop(); metrics.Spaces.Dec() },
	)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

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
	if cfg.PrometheusPort != 0 {
		// The dedicated metrics port is internal: it also serves the Go profiler.
		mux := http.NewServeMux()
		mux.Handle("GET /metrics", metrics.Handler(true, cfg.PrometheusToken))
		mux.HandleFunc("/debug/pprof/", pprof.Index)
		mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
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
