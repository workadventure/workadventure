package main

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"net/http/pprof"
	"strconv"
	"time"

	"google.golang.org/grpc"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/analytics"
	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/livekit"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/matrix"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
	"github.com/workadventure/workadventure/server-go/internal/registry"
	"github.com/workadventure/workadventure/server-go/internal/roomapi"
	"github.com/workadventure/workadventure/server-go/internal/s3"
	"github.com/workadventure/workadventure/server-go/internal/store"
	"github.com/workadventure/workadventure/server-go/internal/uploader"
	"github.com/workadventure/workadventure/server-go/internal/ws"
)

// buildMedia is how the spaces meet: the server's LiveKit (LIVEKIT_*), or each world's when the admin gives it
// (api/livekit/credentials). It also returns the recordings' bucket, nil when recording is not available.
func buildMedia(cfg *config.Config, adm admin.Admin, meetings *analytics.Queue) (core.Media, *s3.Client) {
	media := core.DefaultMedia(nil)
	media.MaxUsersForWebRTC, media.SwitchOnCPULimit = cfg.MaxUsersForWebRTC, cfg.LiveKitSwitchOnCPULimitation
	r := cfg.RecordingS3
	bucket := livekit.S3{Endpoint: r.Endpoint, AccessKey: r.AccessKey, Secret: r.Secret, Region: r.Region, Bucket: r.Bucket}
	var recordings *s3.Client
	if cfg.LiveKitHost != "" && cfg.LiveKitAPIKey != "" && cfg.LiveKitAPISecret != "" {
		lk := livekit.New(cfg.LiveKitHost, cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
		server := core.ServerLiveKit{LiveKit: lk}
		if cfg.RecordingConfigured {
			server.Egress, recordings = lk.Egress(bucket), s3.New(r.Endpoint, r.Region, r.Bucket, r.AccessKey, r.Secret)
		}
		media.Provider = server
	}
	h, saas := adm.(*admin.HTTP)
	if saas && h.Capabilities()["api/livekit/credentials"] == "v1" {
		worlds := livekit.Worlds{Credentials: h.LiveKitCredentials}
		if r.Complete() { // record on the world's LiveKit, into the same bucket
			worlds.Recordings, recordings = &bucket, s3.New(r.Endpoint, r.Region, r.Bucket, r.AccessKey, r.Secret)
		}
		media.Provider = worlds
	}
	if meetings != nil {
		media.Meetings = meetingReports{meetings}
	}
	if saas {
		media.Recordings = adminRecordings{h}
	}
	return media, recordings
}

// meetingReports opens a space's meeting report on the back's analytics queue (core.Meetings).
type meetingReports struct{ q *analytics.Queue }

func (m meetingReports) Open(id, world string, kind, transport func() string) core.MeetingReporter {
	return analytics.NewMeeting(id, world, kind, transport, m.q.Enqueue)
}

// adminRecordings tells the admin that a recording ended (A23), off the space's goroutine (core.RecordingReporter).
type adminRecordings struct{ h *admin.HTTP }

func (a adminRecordings) RecordingEnded(e core.RecordingEnded) {
	go func() {
		if err := a.h.RecordingEvent(context.Background(), recordingPayload(e)); err != nil {
			slog.Error("the admin was not told a recording ended", "egress", e.EgressID, "error", err)
		}
	}()
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

// variableStore keeps the room and player variables: in Redis, or in memory (lost at restart).
func variableStore(cfg *config.Config) store.Hash {
	if cfg.RedisHost == "" {
		slog.Warn("REDIS_HOST is not set: variables are kept in memory, a restart loses them")
		return store.NewMemory()
	}
	return store.NewRedis(net.JoinHostPort(cfg.RedisHost, strconv.Itoa(cfg.RedisPort)), cfg.RedisPassword)
}

// matrixClient is the Synapse admin of the chat, nil without Matrix. Its admin token is shared through Redis.
func matrixClient(cfg *config.Config, vars store.Hash) *matrix.Client {
	if !cfg.MatrixEnabled {
		return nil
	}
	m := matrix.New(cfg.Matrix.APIURI, cfg.Matrix.AdminUser, cfg.Matrix.AdminPassword, cfg.Matrix.Domain)
	if r, ok := vars.(*store.Redis); ok {
		m.ShareThrough(r)
	}
	return m
}

// buildUploader is the uploader (chat files, audio messages): in the bucket when AWS_* are set, in Redis otherwise.
func buildUploader(cfg *config.Config, vars store.Hash) http.Handler {
	up := cfg.Uploader
	if b := cfg.UploaderS3; b.Enabled() {
		endpoint := b.Endpoint
		if endpoint == "" {
			endpoint = "https://s3." + b.Region + ".amazonaws.com"
		}
		up.S3, up.S3URLTTL = s3.New(endpoint, b.Region, b.Bucket, b.AccessKey, b.Secret), b.URLTTL
		go func() { // like S3StorageProvider, once, without waiting: a bucket that refuses keeps its rules
			if err := up.S3.PutCORS(context.Background()); err != nil {
				slog.Warn("cannot set the CORS rules of the uploader's bucket", "error", err)
			}
		}()
	}
	if r, ok := vars.(*store.Redis); ok {
		up.Redis = r.WithDB(cfg.UploaderRedisDB)
	}
	return uploader.New(up).Handler()
}

// buildRoomAPI is the Room API (gRPC), nil when neither ROOM_API_SECRET_KEY nor an admin authorizes it.
func buildRoomAPI(cfg *config.Config, rooms *registry.Refs[string, *core.Room], w *ws.Server) *grpc.Server {
	if cfg.RoomAPISecretKey == "" && cfg.AdminAPIURL == "" {
		return nil
	}
	api := roomapi.New(cfg.RoomAPISecretKey, cfg.FrontURL, rooms, w.RoomVariables)
	if cfg.AdminAPIURL != "" {
		api.WithAdmin(roomapi.NewAdminAuthorizer(cfg.AdminAPIURL, cfg.NodeEnv == "production"))
	}
	return api.GRPC()
}

// servers are the listeners of the process: HTTP on its ports, and the Room API.
type servers struct {
	http        []*http.Server
	roomAPI     *grpc.Server
	roomAPIAddr string
}

// buildServers puts each handler on its port: the main one (pusher, front), map-storage's, the uploader's, the
// metrics', and the Room API's. A port shared with the main one is served by the main handler.
func buildServers(cfg *config.Config, main http.Handler, maps *mapstorage.Store, upload http.Handler, roomAPI *grpc.Server) *servers {
	// ReadHeaderTimeout: a client that never finishes its headers must not hold a connection forever.
	newServer := func(port int, h http.Handler) *http.Server {
		return &http.Server{Addr: ":" + strconv.Itoa(port), Handler: h, ReadHeaderTimeout: 10 * time.Second}
	}
	s := &servers{http: []*http.Server{newServer(cfg.HTTPPort, main)}, roomAPI: roomAPI,
		roomAPIAddr: net.JoinHostPort(cfg.RoomAPIBindHost, strconv.Itoa(cfg.RoomAPIPort))}
	if cfg.WSPort != cfg.HTTPPort {
		s.http = append(s.http, newServer(cfg.WSPort, main))
	}
	if cfg.MapStoragePort != 0 && cfg.MapStoragePort != cfg.HTTPPort && cfg.MapStoragePort != cfg.WSPort {
		s.http = append(s.http, newServer(cfg.MapStoragePort, maps.Handler(cfg.MapStorage)))
	}
	if cfg.UploaderPort != 0 && cfg.UploaderPort != cfg.HTTPPort && cfg.UploaderPort != cfg.WSPort && cfg.UploaderPort != cfg.MapStoragePort {
		s.http = append(s.http, newServer(cfg.UploaderPort, upload))
	}
	if cfg.PrometheusPort != 0 {
		// The dedicated metrics port also serves the Go profiler, behind the same token as the metrics.
		mux := http.NewServeMux()
		mux.Handle("GET /metrics", metrics.Handler(true, cfg.PrometheusToken))
		mux.HandleFunc("/debug/pprof/", metrics.Guard(cfg.PrometheusToken, pprof.Index))
		mux.HandleFunc("/debug/pprof/profile", metrics.Guard(cfg.PrometheusToken, pprof.Profile))
		s.http = append(s.http, newServer(cfg.PrometheusPort, mux))
	}
	return s
}

// serve listens on every port, then waits for ctx to end (nil) or a server to fail (its error).
func (s *servers) serve(ctx context.Context) error {
	errs := make(chan error, len(s.http)+1) // +1: the Room API
	for _, h := range s.http {
		ln, err := net.Listen("tcp", h.Addr)
		if err != nil {
			return err
		}
		slog.Info("listening", "addr", h.Addr)
		go func() { errs <- h.Serve(ln) }()
	}
	if s.roomAPI != nil {
		ln, err := net.Listen("tcp", s.roomAPIAddr)
		if err != nil {
			return err
		}
		slog.Info("listening", "addr", s.roomAPIAddr)
		go func() { errs <- s.roomAPI.Serve(ln) }()
	}
	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
		return nil
	}
}

// shutdown stops every server: HTTP gracefully until ctx's deadline, the Room API at the same deadline at the latest
// (its listeners' streams never end by themselves).
func (s *servers) shutdown(ctx context.Context) {
	stopped := make(chan struct{})
	go func() {
		if s.roomAPI != nil {
			s.roomAPI.GracefulStop()
		}
		close(stopped)
	}()
	for _, h := range s.http {
		metrics.Ignore("http.Shutdown", h.Shutdown(ctx))
	}
	select {
	case <-stopped:
	case <-ctx.Done():
		if s.roomAPI != nil {
			s.roomAPI.Stop()
		}
	}
}
