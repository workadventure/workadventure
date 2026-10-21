package ws

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// onBan is an admin ejecting a player: a kick, or a ban the admin records (by account, or by the IP the player has
// in the world). A player who is not an admin is ignored, silently, like the pusher does.
func (s *Session) onBan(b *pb.BanPlayerMessage) {
	if !s.isAdmin() {
		return
	}
	reason := strings.TrimSpace(b.GetReason())
	if b.GetKick() {
		_ = s.room.Eject(s.ctx, b.GetBanUserUuid(), "kicked", reason)
		return
	}
	switch err := s.recordBan(b, reason); {
	case err == nil:
		_ = s.room.Eject(s.ctx, b.GetBanUserUuid(), "banned", reason)
	case errors.Is(err, admin.ErrBanRefused):
		// The admin decided against it (in its eyes, the moderator may not ban in this world): the pusher ejects the
		// user as a kick all the same, which overrides that decision. Here the user stays and the moderator, whose
		// front already shows the ban as done, is told it did not happen.
		s.push(userMessage("The ban was refused by the administration: " + b.GetBanUserName() + " was not banned."))
	default:
		// Not recorded (no admin, or it could not be reached): the user is ejected all the same, as a kick, like the
		// pusher does; the moderator learns that nothing stops them from coming back.
		_ = s.room.Eject(s.ctx, b.GetBanUserUuid(), "kicked", reason)
		s.push(userMessage("The ban could not be recorded: " + b.GetBanUserName() + " was only kicked and can come back."))
	}
}

// userMessage is a text the front shows in its message popup (SendUserMessage of type "message").
func userMessage(text string) *pb.ServerToClientMessage {
	return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_SendUserMessage{SendUserMessage: &pb.SendUserMessage{Type: "message", Message: text}}}
}

// recordBan asks the admin to record the ban.
func (s *Session) recordBan(b *pb.BanPlayerMessage, reason string) error {
	message := reason
	if message == "" {
		message = "User banned by admin " + s.info.userUUID
	}
	ban := admin.Ban{UUID: b.GetBanUserUuid(), PlayURI: s.info.roomID, Name: b.GetBanUserName(), Message: message, ByUUID: s.info.userUUID}
	if b.GetByIp() { // the IP of the user in the world, unless it is the moderator's own
		if ip := s.srv.worldIP(s.info.member.World, b.GetBanUserUuid()); ip != "" && ip != s.info.ipAddress {
			ban.IPAddress = ip
		}
	}
	return s.srv.admin.Ban(s.ctx, ban)
}

// onReport sends a player's report to the admin; the answer is ignored, an error swallowed (handleReportMessage).
func (s *Session) onReport(rep *pb.ReportPlayerMessage) {
	go func() {
		if err := s.srv.admin.Report(context.Background(), admin.Report{ReportedUUID: rep.GetReportedUserUuid(), Comment: rep.GetReportComment(),
			ReporterUUID: s.info.userUUID, RoomURL: s.info.roomID}); err != nil {
			slog.Info("report not sent", "error", err)
		}
	}()
}
