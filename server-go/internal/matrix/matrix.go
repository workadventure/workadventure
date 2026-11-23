// Package matrix is the pusher's Synapse admin (MatrixProvider.ts): the rooms of the chat areas, and who is in them.
// The users log in to Synapse themselves (SSO); this only holds the admin account.
package matrix

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// folderName is the space the area rooms are gathered in: slugify("current visited room").
const folderName = "current-visited-room"

type Client struct {
	api, user, password, domain string
	http                        *http.Client

	shared Shared // Redis: the pods share one admin token (nil: each keeps its own)

	mu        sync.Mutex
	token     string
	limited   bool   // the admin's rate limit is lifted
	folderID  string // the space of the area rooms
	loginLock sync.Mutex
}

// New returns the admin of the Synapse at api (MATRIX_API_URI).
func New(api, user, password, domain string) *Client {
	return &Client{api: strings.TrimRight(api, "/") + "/", user: user, password: password, domain: domain,
		http: &http.Client{Timeout: 30 * time.Second}}
}

// Shared is the Redis the admin token is shared through, as MatrixProvider keeps it.
type Shared interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
	SetNX(ctx context.Context, key, value string, ttl time.Duration) (bool, error)
	Del(ctx context.Context, key string) error
}

// ShareThrough makes the pods share one admin token, so that they do not each log in (a Synapse device each).
func (c *Client) ShareThrough(s Shared) *Client { c.shared = s; return c }

func (c *Client) tokenKey() string { return "matrix-admin-access-token:" + c.domain + ":" + c.user }
func (c *Client) lockKey() string  { return "matrix-admin-access-token-lock:" + c.domain + ":" + c.user }

// lockTTL, lockWait and lockTimeout are MatrixProvider's: a pod that died holding the lock frees it after 30 s.
var lockTTL, lockWait, lockTimeout = 30 * time.Second, 500 * time.Millisecond, 35 * time.Second

// ID is the admin's Matrix id.
func (c *Client) ID() string { return "@" + c.user + ":" + c.domain }

// Error is an answer of Synapse other than 200.
type Error struct {
	Status       int
	Code         string `json:"errcode"`
	RetryAfterMs *int   `json:"retry_after_ms"`
}

func (e *Error) Error() string { return fmt.Sprintf("matrix: HTTP %d %s", e.Status, e.Code) }

// accessToken is the admin's token: in memory, else the one the pods share, else a new login.
func (c *Client) accessToken(ctx context.Context) (string, error) {
	c.loginLock.Lock()
	defer c.loginLock.Unlock()
	c.mu.Lock()
	t := c.token
	c.mu.Unlock()
	if t != "" {
		return t, nil
	}
	login := c.login
	if c.shared != nil {
		login = c.sharedLogin
	}
	t, err := login(ctx)
	if err != nil {
		return "", err
	}
	c.mu.Lock()
	c.token = t
	c.mu.Unlock()
	return t, nil
}

// sharedLogin is loginAndCacheAccessToken: one pod logs in under a lock, the others wait for its token.
func (c *Client) sharedLogin(ctx context.Context) (string, error) {
	lock := fmt.Sprintf("%d-%d", time.Now().UnixNano(), randSuffix())
	for deadline := time.Now().Add(lockTimeout); time.Now().Before(deadline); {
		if t, ok, err := c.shared.Get(ctx, c.tokenKey()); err != nil {
			return "", err
		} else if ok && t != "" {
			return t, nil
		}
		got, err := c.shared.SetNX(ctx, c.lockKey(), lock, lockTTL)
		if err != nil {
			return "", err
		}
		if got {
			t, err := func() (string, error) {
				defer func() {
					if v, ok, _ := c.shared.Get(context.Background(), c.lockKey()); ok && v == lock {
						_ = c.shared.Del(context.Background(), c.lockKey())
					}
				}()
				if t, ok, err := c.shared.Get(ctx, c.tokenKey()); err == nil && ok && t != "" {
					return t, nil
				}
				t, err := c.login(ctx)
				if err != nil {
					return "", err
				}
				return t, c.shared.Set(ctx, c.tokenKey(), t, 0)
			}()
			return t, err
		}
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(lockWait):
		}
	}
	return "", errors.New("timed out while waiting for the Matrix admin access token lock")
}

func (c *Client) login(ctx context.Context) (string, error) {
	var out struct {
		AccessToken string `json:"access_token"`
	}
	if err := c.raw(ctx, "", http.MethodPost, "_matrix/client/r0/login",
		map[string]any{"type": "m.login.password", "user": c.user, "password": c.password}, &out); err != nil {
		return "", err
	}
	return out.AccessToken, nil
}

// do calls Synapse as the admin, logging in again once if the token was revoked.
func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	for retried := false; ; retried = true {
		t, err := c.accessToken(ctx)
		if err != nil {
			return err
		}
		err = c.raw(ctx, t, method, path, body, out)
		var me *Error
		if retried || !errors.As(err, &me) || (me.Status != http.StatusUnauthorized && me.Code != "M_UNKNOWN_TOKEN") {
			return err
		}
		c.mu.Lock()
		if c.token == t {
			c.token = ""
		}
		c.mu.Unlock()
		if c.shared != nil { // invalidateAccessToken: only if no pod stored a newer one meanwhile
			if v, ok, _ := c.shared.Get(ctx, c.tokenKey()); ok && v == t {
				_ = c.shared.Del(ctx, c.tokenKey())
			}
		}
	}
}

func (c *Client) raw(ctx context.Context, token, method, path string, body, out any) error {
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		r = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.api+path, r)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode != http.StatusOK {
		e := &Error{Status: resp.StatusCode}
		_ = json.Unmarshal(data, e)
		if e.RetryAfterMs == nil {
			if s, err := strconv.Atoi(resp.Header.Get("Retry-After")); err == nil {
				ms := s * 1000
				e.RetryAfterMs = &ms
			}
		}
		return e
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}

// liftRateLimit lifts the admin's rate limit once, trying 10 times while Synapse is not ready.
func (c *Client) liftRateLimit(ctx context.Context) error {
	c.mu.Lock()
	done := c.limited
	c.mu.Unlock()
	if done {
		return nil
	}
	var err error
	for attempt := 1; attempt <= 10; attempt++ {
		err = c.do(ctx, http.MethodPost, "_synapse/admin/v1/users/"+url.PathEscape(c.ID())+"/override_ratelimit",
			map[string]int{"message_per_second": 0, "burst_count": 0}, nil)
		var me *Error
		if err == nil {
			c.mu.Lock()
			c.limited = true
			c.mu.Unlock()
			return nil
		}
		if errors.As(err, &me) && me.Status != http.StatusTooManyRequests && me.Status < 500 {
			return err
		}
		wait := time.Duration(attempt) * time.Second
		if me != nil && me.RetryAfterMs != nil {
			wait = time.Duration(*me.RetryAfterMs) * time.Millisecond
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}
	}
	return err
}

func room(id string) string { return "_matrix/client/r0/rooms/" + url.PathEscape(id) }

// CreateAreaRoom creates the private room of a chat area, in the space of the area rooms.
func (c *Client) CreateAreaRoom(ctx context.Context) (string, error) {
	if err := c.liftRateLimit(ctx); err != nil {
		return "", err
	}
	initial := []map[string]any{{"type": "m.room.history_visibility", "content": map[string]string{"history_visibility": "joined"}}}
	var folder string
	if c.domain != "" {
		var err error
		if folder, err = c.folder(ctx); err != nil {
			return "", err
		}
		initial = append(initial, map[string]any{"type": "m.space.parent", "state_key": folder, "content": map[string]any{"via": []string{c.domain}}})
	}
	var out struct {
		RoomID string `json:"room_id"`
	}
	if err := c.do(ctx, http.MethodPost, "_matrix/client/r0/createRoom", map[string]any{
		"visibility": "private", "initial_state": initial,
		"power_level_content_override": map[string]int{"invite": 100, "ban": 50, "kick": 50},
	}, &out); err != nil {
		return "", err
	}
	if folder != "" {
		if err := c.do(ctx, http.MethodPut, room(folder)+"/state/m.space.child/"+url.PathEscape(out.RoomID),
			map[string]any{"via": []string{c.domain}}, nil); err != nil {
			return "", err
		}
	}
	return out.RoomID, nil
}

// folder is the space of the area rooms: found by its alias, or created.
func (c *Client) folder(ctx context.Context) (string, error) {
	c.mu.Lock()
	id := c.folderID
	c.mu.Unlock()
	if id != "" {
		return id, nil
	}
	var out struct {
		RoomID string `json:"room_id"`
	}
	err := c.do(ctx, http.MethodGet, "_matrix/client/r0/directory/room/"+url.PathEscape("#"+folderName+":"+c.domain), nil, &out)
	if err != nil || out.RoomID == "" {
		if err = c.do(ctx, http.MethodPost, "_matrix/client/r0/createRoom", map[string]any{"visibility": "public",
			"room_alias_name": folderName, "name": folderName, "creation_content": map[string]string{"type": "m.space"}}, &out); err != nil {
			return "", err
		}
	}
	c.mu.Lock()
	c.folderID = out.RoomID
	c.mu.Unlock()
	return out.RoomID, nil
}

func (c *Client) Invite(ctx context.Context, user, roomID string) error {
	if roomID == "" {
		return nil
	}
	if err := c.liftRateLimit(ctx); err != nil {
		return err
	}
	return c.do(ctx, http.MethodPost, room(roomID)+"/invite", map[string]string{"user_id": user}, nil)
}

func (c *Client) Kick(ctx context.Context, user, roomID string) error {
	if err := c.liftRateLimit(ctx); err != nil {
		return err
	}
	return c.do(ctx, http.MethodPost, room(roomID)+"/kick", map[string]string{"user_id": user, "reason": "kick"}, nil)
}

// Promote makes user a moderator (power level 50) of the room.
func (c *Client) Promote(ctx context.Context, user, roomID string) error {
	if err := c.liftRateLimit(ctx); err != nil {
		return err
	}
	levels := map[string]any{}
	if err := c.do(ctx, http.MethodGet, room(roomID)+"/state/m.room.power_levels", nil, &levels); err != nil {
		return err
	}
	users, _ := levels["users"].(map[string]any)
	if users == nil {
		users = map[string]any{}
	}
	users[user] = 50
	levels["users"] = users
	return c.do(ctx, http.MethodPut, room(roomID)+"/state/m.room.power_levels", levels, nil)
}

func (c *Client) Rename(ctx context.Context, roomID, name string) error {
	if err := c.liftRateLimit(ctx); err != nil {
		return err
	}
	return c.do(ctx, http.MethodPut, room(roomID)+"/state/m.room.name", map[string]string{"name": name}, nil)
}

// DeleteRoom empties the room, then the admin leaves it (Synapse keeps it).
func (c *Client) DeleteRoom(ctx context.Context, roomID string) error {
	if err := c.liftRateLimit(ctx); err != nil {
		return err
	}
	var members struct {
		Chunk []struct {
			StateKey string `json:"state_key"`
			Content  struct {
				Membership string `json:"membership"`
			} `json:"content"`
		} `json:"chunk"`
	}
	if err := c.do(ctx, http.MethodGet, room(roomID)+"/members", nil, &members); err != nil {
		return err
	}
	for _, m := range members.Chunk {
		// As kickAllUsersFromRoom: those not joined (invited) are kicked; the joined ones go with the admin's
		// departure only in the sense that nobody can be invited any more.
		if m.StateKey != c.ID() && m.Content.Membership != "join" {
			_ = c.Kick(ctx, m.StateKey, roomID) // errors swallowed, like the TS
		}
	}
	return c.Kick(ctx, c.ID(), roomID)
}

func randSuffix() int64 {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return int64(binary.BigEndian.Uint64(b[:]) >> 1)
}
