package ws

import (
	"log/slog"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// The member queries of the chat and the map editor (A12 to A16), answered off the reader: the admin may be slow.

func (s *Session) chatMembers(id int32, search string) {
	m, err := s.srv.admin.ChatMembers(s.ctx, s.info.roomID, search)
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	a := &pb.ChatMembersAnswer{Total: int64(m.Total)}
	for _, c := range m.Members {
		tags := c.Tags
		if tags == nil {
			tags = []string{}
		}
		a.Members = append(a.Members, &pb.ChatMember{Uuid: c.UUID, WokaName: c.WokaName, Email: c.Email, ChatId: c.ChatID, Tags: tags})
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_ChatMembersAnswer{ChatMembersAnswer: a}})
}

func (s *Session) searchMembers(id int32, search string) {
	list, err := s.srv.admin.SearchMembers(s.ctx, s.info.roomID, search)
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	a := &pb.SearchMemberAnswer{}
	for _, m := range list {
		a.Members = append(a.Members, &pb.Member{Id: m.ID, Name: m.Name, Email: m.Email})
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_SearchMemberAnswer{SearchMemberAnswer: a}})
}

func (s *Session) searchTags(id int32, search string) {
	tags, err := s.srv.admin.SearchTags(s.ctx, s.info.roomID, search)
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_SearchTagsAnswer{SearchTagsAnswer: &pb.SearchTagsAnswer{Tags: tags}}})
}

func (s *Session) getMember(id int32, uuid string) {
	m, err := s.srv.admin.GetMember(s.ctx, uuid)
	if err != nil {
		slog.Info("no member in the admin", "uuid", uuid, "error", err)
		s.answerError(id, "User not found, probably left")
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_GetMemberAnswer{GetMemberAnswer: &pb.GetMemberAnswer{
		Member: &pb.Member{Id: m.ID, Name: m.Name, Email: m.Email, VisitCardUrl: m.VisitCardURL, ChatID: m.ChatID}}}})
}

// updateChatID is an updateChatIdMessage: the front got its Matrix id.
func (s *Session) updateChatID(email, chatID string) {
	s.chat.set(chatID)
	go func() {
		if err := s.srv.admin.UpdateChatID(s.ctx, email, chatID, s.info.roomID); err != nil {
			slog.Warn("chat id not saved by the admin", "error", err)
			s.sendError(err.Error())
		}
	}()
}
