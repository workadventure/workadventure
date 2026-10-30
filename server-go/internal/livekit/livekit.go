// Package livekit speaks to a LiveKit server with its Go SDK (server-sdk-go): list, create and delete rooms,
// record them (egress), and sign the fronts' access tokens. Only what the back used (LivekitService.ts).
package livekit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
	"time"

	"github.com/livekit/protocol/auth"
	lkp "github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

// Client is a LiveKit server (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).
type Client struct {
	key, secret, url string
	rooms            *lksdk.RoomServiceClient
	egress           *lksdk.EgressClient
}

// timeout bounds every call to the LiveKit server.
const timeout = 10 * time.Second

// New is a client of host (http:// or https://); the fronts connect to the same host over ws:// or wss://.
func New(host, key, secret string) *Client {
	host = strings.TrimRight(host, "/")
	return &Client{key: key, secret: secret, url: strings.Replace(host, "http", "ws", 1),
		rooms: lksdk.NewRoomServiceClient(host, key, secret), egress: lksdk.NewEgressClient(host, key, secret)}
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

// Token lets a member of a space join its room for 6 h: everyone may publish, the application decides who is seen.
func (c *Client) Token(room string, u core.SpaceUser) (string, error) {
	metadata, _ := json.Marshal(map[string]string{"userId": u.ID, "uuid": u.UUID})
	yes := true
	return auth.NewAccessToken(c.key, c.secret).SetIdentity(u.ID).SetName(u.Name).SetMetadata(string(metadata)).
		SetValidFor(6 * time.Hour).SetVideoGrant(&auth.VideoGrant{Room: RoomName(room), RoomJoin: true, CanPublish: &yes,
		CanSubscribe: &yes, CanPublishSources: []string{"camera", "microphone", "screen_share", "screen_share_audio"}}).ToJWT()
}

// CreateRoom creates the room unless it exists.
func (c *Client) CreateRoom(ctx context.Context, room string) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	name := RoomName(room)
	list, err := c.rooms.ListRooms(ctx, &lkp.ListRoomsRequest{Names: []string{name}})
	if err != nil {
		return err
	}
	if len(list.GetRooms()) > 0 {
		return nil
	}
	_, err = c.rooms.CreateRoom(ctx, &lkp.CreateRoomRequest{Name: name})
	return err
}

func (c *Client) DeleteRoom(ctx context.Context, room string) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	_, err := c.rooms.DeleteRoom(ctx, &lkp.DeleteRoomRequest{Room: RoomName(room)})
	return err
}
