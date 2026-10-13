// Command server is the single WorkAdventure server: the pusher, the back, map-storage and the uploader in one
// process.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
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
	// Go follows the container's CPU limit (cgroup) for GOMAXPROCS since 1.25: log it so a deployment can check.
	slog.Info("starting", "version", version, "apiVersion", apiVersion, "GOMAXPROCS", runtime.GOMAXPROCS(0), "NumCPU", runtime.NumCPU())

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

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	front := httpapi.NewFrontAssets(cfg.AssetsInternalURL, cfg.AssetsURL, apiVersion)
	go front.Poll(ctx)
	handler := httpapi.New(cfg, tokens, adm, front, ws.NewServer(cfg, tokens, adm, rooms, apiVersion), version)

	servers := []*http.Server{{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: handler}}
	if cfg.WSPort != cfg.HTTPPort {
		servers = append(servers, &http.Server{Addr: ":" + strconv.Itoa(cfg.WSPort), Handler: handler})
	}
	if cfg.PrometheusPort != 0 {
		mux := http.NewServeMux()
		mux.Handle("GET /metrics", metrics.Handler(true, cfg.PrometheusToken))
		servers = append(servers, &http.Server{Addr: ":" + strconv.Itoa(cfg.PrometheusPort), Handler: mux})
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
