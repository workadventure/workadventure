// Command server is the single WorkAdventure server: the pusher, the back, map-storage and the uploader in one
// process.
package main

import (
	"context"
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

	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
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
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	// Go follows the container's CPU limit (cgroup) for GOMAXPROCS since 1.25: log it so a deployment can check.
	slog.Info("starting", "version", version, "apiVersion", apiVersion, "GOMAXPROCS", runtime.GOMAXPROCS(0), "NumCPU", runtime.NumCPU())

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /ping", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("pong")) })
	if cfg.PrometheusPort == 0 {
		mux.Handle("GET /metrics", metrics.Handler(false, cfg.PrometheusToken))
	}
	servers := []*http.Server{{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: mux}}
	if cfg.PrometheusPort != 0 {
		pm := http.NewServeMux()
		pm.Handle("GET /metrics", metrics.Handler(true, cfg.PrometheusToken))
		servers = append(servers, &http.Server{Addr: ":" + strconv.Itoa(cfg.PrometheusPort), Handler: pm})
	}
	errs := make(chan error, len(servers))
	for _, s := range servers {
		ln, err := net.Listen("tcp", s.Addr)
		if err != nil {
			return err
		}
		go func() { errs <- s.Serve(ln) }()
	}
	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for _, s := range servers {
		_ = s.Shutdown(shutdownCtx)
	}
	return nil
}
