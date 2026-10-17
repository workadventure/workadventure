// Package livekit speaks to a LiveKit server: Twirp (JSON over HTTP) for its rooms, JWT access tokens for the
// fronts. Only what the back used: list, create and delete rooms, sign tokens (LivekitService.ts).
package livekit

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

// Client is a LiveKit server (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).
type Client struct {
	host, key, secret, url string
	http                   *http.Client
}

// New is a client of host (http:// or https://); the fronts connect to the same host over ws:// or wss://.
func New(host, key, secret string) *Client {
	return &Client{host: strings.TrimRight(host, "/"), key: key, secret: secret, url: strings.Replace(host, "http", "ws", 1),
		http: &http.Client{Timeout: 10 * time.Second}}
}

func (c *Client) URL() string { return c.url }

// RoomName is the LiveKit room of a space: its name, or a hash of it past LiveKit's 250 characters.
func RoomName(space string) string {
	if len(space) <= 250 {
		return space
	}
	h := sha256.Sum256([]byte(space))
	return hex.EncodeToString(h[:])
}

type video map[string]any

// sign makes an access token: 6 h, like the SDK's default.
func (c *Client) sign(identity, name, metadata string, grant video) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{"iss": c.key, "nbf": now.Unix(), "exp": now.Add(6 * time.Hour).Unix(), "video": grant}
	if identity != "" {
		claims["sub"] = identity
	}
	if name != "" {
		claims["name"] = name
	}
	if metadata != "" {
		claims["metadata"] = metadata
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(c.secret))
}

// Token lets a member of a space join its room: everyone may publish, the application decides who is seen.
func (c *Client) Token(room string, u core.SpaceUser) (string, error) {
	metadata, _ := json.Marshal(map[string]string{"userId": u.ID, "uuid": u.UUID})
	return c.sign(u.ID, u.Name, string(metadata), video{"room": RoomName(room), "roomJoin": true, "canPublish": true, "canSubscribe": true,
		"canPublishSources": []string{"camera", "microphone", "screen_share", "screen_share_audio"}})
}

// twirp calls a method of the RoomService.
func (c *Client) twirp(ctx context.Context, method string, grant video, body, out any) error {
	return c.call(ctx, "livekit.RoomService/"+method, grant, body, out)
}

// call calls a Twirp method ("service/method") with a token of the given grant.
func (c *Client) call(ctx context.Context, method string, grant video, body, out any) error {
	token, err := c.sign("", "", "", grant)
	if err != nil {
		return err
	}
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.host+"/twirp/"+method, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("LiveKit %s: %s %s", method, resp.Status, data)
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}

// CreateRoom creates the room unless it exists.
func (c *Client) CreateRoom(ctx context.Context, room string) error {
	name := RoomName(room)
	var list struct {
		Rooms []struct {
			Name string `json:"name"`
		} `json:"rooms"`
	}
	if err := c.twirp(ctx, "ListRooms", video{"roomList": true}, map[string]any{"names": []string{name}}, &list); err != nil {
		return err
	}
	if len(list.Rooms) > 0 {
		return nil
	}
	return c.twirp(ctx, "CreateRoom", video{"roomCreate": true}, map[string]any{"name": name}, nil)
}

func (c *Client) DeleteRoom(ctx context.Context, room string) error {
	return c.twirp(ctx, "DeleteRoom", video{"roomCreate": true}, map[string]any{"room": RoomName(room)}, nil)
}
