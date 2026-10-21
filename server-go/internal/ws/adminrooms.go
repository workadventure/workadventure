package ws

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strings"

	"github.com/coder/websocket"
	"github.com/golang-jwt/jwt/v5"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/netguard"
)

// /ws/admin/rooms of the pusher (IoSocketController.adminRoomSocket): the admin watches who enters and leaves its
// rooms, and bans a user from every room of a world. Each JSON message carries a JWT signed with ADMIN_SOCKETS_TOKEN
// that lists the rooms the client may read.

const adminSocketQueue = 1000 // messages waiting for a slow admin (maxQueuedMessages)

type adminSocketMessage struct {
	Event   string    `json:"event"`
	JWT     *string   `json:"jwt"`
	RoomIDs *[]string `json:"roomIds"`
	World   *string   `json:"world"`
	Message *struct {
		Message  *string `json:"message"`
		UserUUID *string `json:"userUuid"`
	} `json:"message"`
}

// valid is isAdminMessageInterface.
func (m *adminSocketMessage) valid() bool {
	switch {
	case m.JWT == nil:
		return false
	case m.Event == "listen":
		return m.RoomIDs != nil
	case m.Event == "banned":
		return m.World != nil && m.Message != nil && m.Message.Message != nil && m.Message.UserUUID != nil
	}
	return false
}

func (srv *Server) authorizedRooms(raw string) ([]string, bool) {
	if srv.cfg.AdminSocketsToken == "" {
		return nil, false // Missing environment variable ADMIN_SOCKETS_TOKEN
	}
	var c struct {
		AuthorizedRoomIDs *[]string `json:"authorizedRoomIds"`
		jwt.RegisteredClaims
	}
	_, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return []byte(srv.cfg.AdminSocketsToken), nil },
		jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || c.AuthorizedRoomIDs == nil {
		return nil, false
	}
	return *c.AuthorizedRoomIDs, true
}

func (srv *Server) AdminRooms(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, acceptOptions(""))
	if err != nil {
		return
	}
	conn.SetReadLimit(16 << 20)
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	out := make(chan []byte, adminSocketQueue)
	send := func(kind string, data any) {
		b, _ := json.Marshal(map[string]any{"type": kind, "data": data})
		select {
		case out <- b:
		default: // ponytail: a full queue drops the message, like the pusher's writer; close instead if admins need every one
		}
	}
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case b := <-out:
				if conn.Write(ctx, websocket.MessageText, b) != nil {
					cancel()
					return
				}
			}
		}
	}()
	refuse := func(code websocket.StatusCode, reason, message string) {
		b, _ := json.Marshal(map[string]any{"type": "Error", "data": map[string]string{"message": message}})
		_ = conn.Write(ctx, websocket.MessageText, b)
		_ = conn.Close(code, reason)
	}

	watching := map[string]func(){} // room id → stop watching it
	defer func() {
		for _, stop := range watching {
			stop()
		}
	}()
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		var m adminSocketMessage
		if json.Unmarshal(data, &m) != nil || !m.valid() {
			refuse(websocket.StatusInvalidFramePayloadData, "Invalid message received!", "Invalid message received! The connection has been closed.")
			return
		}
		authorized, ok := srv.authorizedRooms(*m.JWT)
		if !ok {
			refuse(websocket.StatusPolicyViolation, "Access refused", "Admin socket access refused! The connection has been closed.")
			return
		}
		switch m.Event {
		case "listen":
			var refused []string
			for _, id := range *m.RoomIDs {
				if !slices.Contains(authorized, id) {
					refused = append(refused, id)
				}
			}
			if len(refused) > 0 {
				list, _ := json.Marshal(refused)
				refuse(websocket.StatusPolicyViolation, "Access refused",
					"Admin socket refused for client on "+netguard.ClientIP(r, srv.cfg.TrustedProxies)+" listening of : \n"+string(list))
				return
			}
			for _, id := range *m.RoomIDs {
				if stop := watching[id]; stop != nil {
					stop()
				}
				watching[id] = srv.watchMembers(ctx, id, send)
			}
		case "banned":
			for _, id := range authorized {
				if parts := strings.Split(id, "/"); len(parts) > 5 && parts[5] == *m.World {
					_ = srv.liveRoom(id, func(room *core.Room) error {
						return room.Eject(context.Background(), *m.Message.UserUUID, "banned", *m.Message.Message)
					})
				}
			}
		}
	}
}

// watchMembers forwards the members of a room to an admin socket, holding the room meanwhile.
func (srv *Server) watchMembers(ctx context.Context, id string, send func(kind string, data any)) (stop func()) {
	room := srv.rooms.Acquire(id)
	unwatch, err := room.Watch(ctx, func(e core.Event) {
		switch e := e.(type) {
		case core.MemberJoined:
			send("MemberJoin", map[string]string{"uuid": e.UUID, "name": e.Name, "ipAddress": e.IPAddress, "roomId": id})
		case core.MemberLeft:
			send("MemberLeave", map[string]string{"uuid": e.UUID})
		}
	})
	return func() {
		if err == nil {
			unwatch()
		}
		srv.rooms.Release(id)
	}
}
