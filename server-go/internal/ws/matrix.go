package ws

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/matrix"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// The Matrix side of the chat areas: /roomArea (MatrixRoomAreaController), the resourceUrl map-storage calls for a
// matrixRoomPropertyData; entering an area invites the player in its room, leaving it kicks it out
// (handleEnterChatRoomAreaQuery, handleLeaveChatRoomArea).

// SetMatrix gives the server the Synapse admin (nil: Matrix off).
func (srv *Server) SetMatrix(m *matrix.Client) { srv.matrix = m }

// mapStorageToken is the middleware of /roomArea.
func (srv *Server) mapStorageToken(w http.ResponseWriter, r *http.Request) bool {
	if srv.cfg.MapStorageAPIToken == "" {
		http.Error(w, "No token configured!", http.StatusUnauthorized)
		return false
	}
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte(srv.cfg.MapStorageAPIToken)) != 1 {
		http.Error(w, "Incorrect token", http.StatusUnauthorized)
		return false
	}
	return true
}

// RoomArea answers POST, PATCH and DELETE /roomArea: create, rename or empty the room of a chat area.
func (srv *Server) RoomArea(w http.ResponseWriter, r *http.Request) {
	if !srv.mapStorageToken(w, r) {
		return
	}
	var p map[string]any
	if json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&p) != nil || !isMatrixRoomProperty(p) {
		http.Error(w, map[bool]string{true: "Invalid Request Body", false: "Invalid request body"}[r.Method == http.MethodPost], http.StatusBadRequest)
		return
	}
	if srv.matrix == nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	serverData, _ := p["serverData"].(map[string]any)
	roomID, _ := serverData["matrixRoomId"].(string)
	var err error
	switch r.Method {
	case http.MethodPost:
		if roomID, err = srv.matrix.CreateAreaRoom(r.Context()); err == nil {
			p["serverData"] = map[string]any{"matrixRoomId": roomID}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(p)
			return
		}
	case http.MethodDelete:
		if roomID != "" {
			err = srv.matrix.DeleteRoom(r.Context(), roomID)
		}
		if err == nil {
			w.WriteHeader(http.StatusNoContent)
			return
		}
	case http.MethodPatch:
		if roomID != "" {
			err = srv.matrix.Rename(r.Context(), roomID, p["displayName"].(string))
		}
		if err == nil {
			_, _ = io.WriteString(w, "Room name updated successfully")
			return
		}
	default:
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	slog.Warn("roomArea failed", "method", r.Method, "error", err)
	http.Error(w, "Internal Server Error", http.StatusInternalServerError)
}

// isMatrixRoomProperty checks a body against MatrixRoomPropertyData.
func isMatrixRoomProperty(p map[string]any) bool {
	_, id := p["id"].(string)
	_, name := p["displayName"].(string)
	_, auto := p["shouldOpenAutomatically"].(bool)
	if sd, ok := p["serverData"]; ok && sd != nil {
		m, ok := sd.(map[string]any)
		if !ok {
			return false
		}
		if v, ok := m["matrixRoomId"]; ok {
			if _, ok := v.(string); !ok {
				return false
			}
		}
	}
	return id && name && auto && p["type"] == "matrixRoomPropertyData"
}

// resource is what map-storage does for a resourceUrl: only to PUSHER_URL and WHITELISTED_RESOURCE_URLS, which
// get MAP_STORAGE_API_TOKEN.
func (srv *Server) resource(method, target string, property map[string]any) (map[string]any, error) {
	u, err := url.Parse(target)
	if err != nil || u.Host == "" {
		return nil, fmt.Errorf("invalid resource URL %q", target)
	}
	if !slices.Contains(srv.resourceOrigins(), u.Scheme+"://"+u.Host) {
		return nil, fmt.Errorf("Unauthorized Resource URL: %s://%s", u.Scheme, u.Host)
	}
	body, _ := json.Marshal(property)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", srv.cfg.MapStorageAPIToken)
	// No redirect away from the allowed origins: the token would follow it.
	client := &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(r *http.Request, via []*http.Request) error {
		if len(via) >= 10 || !slices.Contains(srv.resourceOrigins(), r.URL.Scheme+"://"+r.URL.Host) {
			return fmt.Errorf("redirect to %s://%s refused", r.URL.Scheme, r.URL.Host)
		}
		return nil
	}}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	var out map[string]any
	_ = json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&out)
	return out, nil
}

func (srv *Server) resourceOrigins() []string {
	var out []string
	for _, o := range append(slices.Clone(srv.cfg.WhitelistedResourceURLs), srv.cfg.PusherURL) {
		if u, err := url.Parse(strings.TrimSpace(o)); err == nil && u.Host != "" {
			out = append(out, u.Scheme+"://"+u.Host)
		}
	}
	return out
}

// chat is the player's Matrix side: its chat id (it may arrive after the connection, updateChatId) and the rooms
// of the chat areas it is in.
type chat struct {
	mu    sync.Mutex
	id    string
	areas []string
}

func (c *chat) get() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.id
}

func (c *chat) set(id string) {
	c.mu.Lock()
	c.id = id
	c.mu.Unlock()
}

// enter records the area's room; without a chat id there is nothing to join.
func (c *chat) enter(roomID string) (chatID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.id != "" {
		c.areas = append(c.areas, roomID)
	}
	return c.id
}

// leave forgets roomID ("": all of them) and returns the rooms left.
func (c *chat) leave(roomID string) (left []string, chatID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.areas = slices.DeleteFunc(c.areas, func(r string) bool {
		if roomID == "" || r == roomID {
			left = append(left, r)
			return true
		}
		return false
	})
	return left, c.id
}

// enterChatArea is an enterChatRoomAreaQuery: the player joins the area's room, as a moderator if admin.
func (s *Session) enterChatArea(id int32, roomID string) {
	chatID := s.chat.enter(roomID)
	if chatID == "" {
		s.answerError(id, "Chat ID not found")
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_EnterChatRoomAreaAnswer{EnterChatRoomAreaAnswer: &pb.EnterChatRoomAreaAnswer{}}})
	if s.srv.matrix == nil {
		return
	}
	go func() {
		ctx := context.Background()
		if err := s.srv.matrix.Invite(ctx, chatID, roomID); err != nil {
			slog.Warn("matrix invite failed", "room", roomID, "error", err)
			return
		}
		if slices.Contains(s.info.member.Tags, "admin") {
			if err := s.srv.matrix.Promote(ctx, chatID, roomID); err != nil {
				slog.Warn("matrix promote failed", "room", roomID, "error", err)
			}
		}
	}()
}

// leaveChatArea is a leaveChatRoomAreaMessage; "" leaves them all (the socket closed).
func (s *Session) leaveChatArea(roomID string) {
	left, chatID := s.chat.leave(roomID)
	if s.srv.matrix == nil || chatID == "" {
		return
	}
	for _, r := range left {
		go func() {
			if err := s.srv.matrix.Kick(context.Background(), chatID, r); err != nil {
				slog.Warn("matrix kick failed", "room", r, "error", err)
			}
		}()
	}
}
