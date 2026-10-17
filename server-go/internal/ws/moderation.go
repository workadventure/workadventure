package ws

import (
	"context"
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
	kind := "kicked"
	if !b.GetKick() && s.recordBan(b, reason) {
		kind = "banned"
	}
	// Not recorded (no admin, or it refused): the user is ejected all the same, as a kick.
	_ = s.room.Eject(s.ctx, b.GetBanUserUuid(), kind, reason)
}

// recordBan asks the admin to record the ban; it says whether it did.
func (s *Session) recordBan(b *pb.BanPlayerMessage, reason string) bool {
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
