package ws

import (
	"context"
	"slices"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// What concerns a whole world: its users (getWorldUsers of the pusher, which asked every back) and its rooms. One
// process holds every session, so it asks them.

type worldUser struct{ uuid, name, ip string }

func (srv *Server) worldUsers(world string) []worldUser {
	var out []worldUser
	srv.sessions.Range(func(k, _ any) bool {
		s := k.(*Session)
		if s.info.member.World == world {
			s.mu.Lock()
			name := s.name
			s.mu.Unlock()
			out = append(out, worldUser{uuid: s.info.userUUID, name: name, ip: s.info.ipAddress})
		}
		return true
	})
	return out
}

func (srv *Server) worldIP(world, uuid string) string {
	for _, u := range srv.worldUsers(world) {
		if u.uuid == uuid && u.ip != "" {
			return u.ip
		}
	}
	return ""
}

// banIPPreview tells a moderator who else a ban of that user's IP would lock out.
func (s *Session) banIPPreview(id int32, banUUID string) {
	if !s.isAdmin() {
		s.answerError(id, "Only an admin of the world can preview a ban")
		return
	}
	users := s.srv.worldUsers(s.info.member.World)
	ip := s.srv.worldIP(s.info.member.World, banUUID)
	answer := &pb.BanIpPreviewAnswer{}
	if ip != "" {
		answer.IpKnown, answer.IncludesModerator = true, ip == s.info.ipAddress
		for _, u := range users {
			if u.ip == ip && u.uuid != banUUID && u.uuid != s.info.userUUID {
				answer.Users = append(answer.Users, &pb.BanIpPreviewUser{Name: u.name})
			}
		}
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_BanIpPreviewAnswer{BanIpPreviewAnswer: answer}})
}

// playGlobalMessage is an admin's message to its room, or to every room of its world.
func (s *Session) playGlobalMessage(m *pb.PlayGlobalMessage) {
	rooms := []string{s.info.roomID}
	if m.GetBroadcastToWorld() {
		if list, ok, err := s.srv.admin.SameWorld(context.Background(), s.info.roomID, nil, true); ok && err == nil {
			rooms = rooms[:0]
			for _, r := range list {
				rooms = append(rooms, r.RoomURL)
			}
		} else if !ok { // no admin: the rooms of the world that have players
			s.srv.sessions.Range(func(k, _ any) bool {
				if o := k.(*Session); o.info.member.World == s.info.member.World && !slices.Contains(rooms, o.info.roomID) {
					rooms = append(rooms, o.info.roomID)
				}
				return true
			})
		}
	}
	for _, url := range rooms {
		if !slices.Contains(s.srv.rooms.Keys(), url) {
			continue // nobody there
		}
		room := s.srv.rooms.Acquire(url)
		_ = room.SendUserMessage(context.Background(), core.UserMessage{Type: m.GetType(), Message: m.GetContent()})
		s.srv.rooms.Release(url)
	}
}
