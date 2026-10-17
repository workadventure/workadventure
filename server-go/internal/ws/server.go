package ws

import (
	"context"
	"errors"
	"fmt"
	"github.com/workadventure/workadventure/server-go/internal/analytics"
	"github.com/workadventure/workadventure/server-go/internal/mapedit"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/matrix"
	"github.com/workadventure/workadventure/server-go/internal/store"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/registry"
)

// Server handles /ws/room (IoSocketController + PusherRoomSocketController).
type Server struct {
	cfg          *config.Config
	auth         *auth.Manager
	admin        admin.Admin
	rooms        *registry.Refs[string, *core.Room]
	spaces       *registry.Refs[core.SpaceKey, *core.Space]
	retained     *registry.Map[string, *Session] // by connectionId, for transport resumes
	maps         *mapstorage.Store
	edits        *mapedit.Queue // the map editor's commands, one map at a time, off the rooms
	roomMaps     sync.Map       // room URL -> roomMap
	sessions     sync.Map       // the open sessions (*Session), for what concerns a whole world
	pingInterval time.Duration  // transportPingInterval
	vars         store.Hash     // room and player variables
	varWriter    *store.Writer  // writes to vars, in order, off the rooms
	apiVersion   string
	analytics    *analytics.Queue // nil without an admin
	matrix       *matrix.Client   // nil without Matrix (matrix.go)
}

func NewServer(cfg *config.Config, a *auth.Manager, adm admin.Admin, rooms *registry.Refs[string, *core.Room], spaces *registry.Refs[core.SpaceKey, *core.Space], maps *mapstorage.Store, vars store.Hash, apiVersion string) *Server {
	return &Server{pingInterval: transportPingInterval, cfg: cfg, auth: a, admin: adm, rooms: rooms, spaces: spaces, retained: registry.New[string, *Session](), maps: maps, edits: mapedit.NewQueue(),
		vars: vars, varWriter: store.NewWriter(vars), apiVersion: apiVersion}
}

func acceptOptions(protocol string) *websocket.AcceptOptions {
	o := &websocket.AcceptOptions{
		// The token travels in Sec-WebSocket-Protocol, not in a cookie: a cross-site page cannot ride on it, so
		// there is no origin to check (uWebSockets.js did not check it either).
		InsecureSkipVerify: true,
		CompressionMode:    websocket.CompressionDisabled,
	}
	for _, p := range strings.Split(protocol, ",") {
		if p = strings.TrimSpace(p); p != "" {
			o.Subprotocols = append(o.Subprotocols, p)
		}
	}
	return o
}

func (srv *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	token := r.Header.Get("Sec-WebSocket-Protocol")
	if problems := validateQuery(q); problems != "" {
		srv.reject(w, r, token, errorScreen(errorScreenData{Type: "error", Code: "WS_BAD_REQUEST", Title: "400 Bad Request",
			Subtitle: "Something wrong happened while connecting!", Details: problems}))
		return
	}
	if raw := q.Get("lastReceivedNonce"); raw != "" {
		last, err := strconv.ParseUint(raw, 10, 32)
		if err != nil {
			srv.reject(w, r, token, internalError(fmt.Sprintf("Parameter lastReceivedNonce: Expected nonnegative integer, received %s", raw)))
			return
		}
		srv.resume(w, r, token, q, uint32(last))
		return
	}

	if q.Get("version") != srv.apiVersion {
		srv.reject(w, r, token, errorScreen(errorScreenData{Type: "retry", Code: "NEW_VERSION", Title: "Please refresh",
			Subtitle: "New version available", Image: "/resources/icons/new_version.png", ImageLogo: "/static/images/logo.png",
			Details:     "A new version of WorkAdventure is available. Please refresh your window",
			ButtonTitle: "Refresh", CanRetryManual: true, TimeToRetry: 999999}))
		return
	}

	var tok auth.Token
	if token != "" {
		var err error
		if tok, err = srv.auth.Verify(token); err != nil {
			srv.reject(w, r, token, &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_TokenExpiredMessage{TokenExpiredMessage: &pb.TokenExpiredMessage{}}})
			return
		}
	} else if srv.cfg.DisableAnonymous {
		srv.reject(w, r, token, internalError("Expecting token"))
		return
	}

	member, err := srv.admin.MemberData(r.Context(), admin.MemberQuery{
		Identifier: tok.Identifier, AccessToken: tok.AccessToken, PlayURI: q.Get("roomId"),
		IPAddress: clientIP(r), CharacterTextureIDs: q["characterTextureIds"], CompanionTextureID: q.Get("companionTextureId"),
		Locale: r.Header.Get("Accept-Language"), Tags: tok.Tags, ChatID: q.Get("chatID"),
	})
	var refused *admin.Refusal
	if errors.As(err, &refused) {
		srv.reject(w, r, token, errorScreenOf(refused.Data))
		return
	}
	if err != nil {
		slog.Info("access not granted", "user", tok.Identifier, "room", q.Get("roomId"), "error", err)
		srv.reject(w, r, token, internalError("User cannot access this world"))
		return
	}
	if !member.IsCharacterTexturesValid {
		srv.reject(w, r, token, &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_InvalidCharacterTextureMessage{
			InvalidCharacterTextureMessage: &pb.InvalidCharacterTextureMessage{Message: "Invalid character textures"}}})
		return
	}
	if !member.IsCompanionTextureValid {
		srv.reject(w, r, token, &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_InvalidCompanionTextureMessage{
			InvalidCompanionTextureMessage: &pb.InvalidCompanionTextureMessage{Message: "Invalid companion texture"}}})
		return
	}

	conn, err := websocket.Accept(w, r, acceptOptions(token))
	if err != nil {
		return
	}
	s := newSession(srv, sessionInfo{
		token: token, roomID: q.Get("roomId"), connectionID: q.Get("connectionId"), tabID: q.Get("tabId"),
		userUUID: member.UserUUID, ipAddress: clientIP(r), isLogged: tok.AccessToken != "", member: member, chatID: q.Get("chatID"), roomName: q.Get("roomName"),
		lastCommandID: q.Get("lastCommandId"),
	})
	if id := s.info.connectionID; id != "" {
		srv.retained.Compute(id, func(*Session, bool) (*Session, bool) { return s, true })
	}
	s.start(conn)
}

func (srv *Server) resume(w http.ResponseWriter, r *http.Request, token string, q url.Values, last uint32) {
	s, ok := srv.retained.Get(q.Get("connectionId"))
	conn, err := websocket.Accept(w, r, acceptOptions(token))
	if err != nil {
		return
	}
	if !ok || s.info.token != token || s.info.roomID != q.Get("roomId") {
		_ = conn.Close(websocket.StatusPolicyViolation, "Cannot replace socket: previous connection not retained")
		return
	}
	s.resume(conn, last)
}

// reject upgrades the connection only to send why it is refused, then closes it (rejectedOpen).
func (srv *Server) reject(w http.ResponseWriter, r *http.Request, token string, msg *pb.ServerToClientMessage) {
	conn, err := websocket.Accept(w, r, acceptOptions(token))
	if err != nil {
		return
	}
	b, err := proto.Marshal(msg)
	if err != nil {
		panic(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), writeTimeout)
	defer cancel()
	_ = conn.Write(ctx, websocket.MessageBinary, directFrame(1, b))
	_ = conn.Close(websocket.StatusNormalClosure, "Error message sent")
}

func internalError(details string) *pb.ServerToClientMessage {
	return errorScreen(errorScreenData{Type: "error", Code: "internal_error", Title: "500 Internal Server Error",
		Subtitle: "Something wrong happened while connecting!", Details: details})
}

// clientIP is the first X-Forwarded-For entry, like getClientIpFromXForwardedFor.
func clientIP(r *http.Request) string {
	first, _, _ := strings.Cut(r.Header.Get("X-Forwarded-For"), ",")
	return strings.TrimSpace(first)
}

// validateQuery checks the query of /ws/room like the zod schema of IoSocketController.
func validateQuery(q url.Values) string {
	var problems []string
	for _, name := range []string{"roomId", "version", "chatID", "roomName", "cameraState", "microphoneState", "tabId"} {
		if !q.Has(name) {
			problems = append(problems, "Parameter "+name+": Required")
		}
	}
	if q.Has("tabId") && q.Get("tabId") == "" {
		problems = append(problems, "Parameter tabId: String must contain at least 1 character(s)")
	}
	return strings.Join(problems, "\n")
}

// RetainedSessions counts the sessions a client can resume, for tests.
func (srv *Server) RetainedSessions() int { return srv.retained.Len() }

// FlushVariables waits until the variable writes are stored, for a shutdown.
func (srv *Server) FlushVariables(ctx context.Context) error { return srv.varWriter.Flush(ctx) }
