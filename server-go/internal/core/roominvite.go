package core

import (
	"context"
	"time"
)

// Meeting invitations: a player invites another one (all its tabs) to come and talk; the invited one accepts or
// declines. Non-admins are limited, per receiver and in total, over 10 minutes (GameRoom of the back).
type (
	InvitationReceived struct {
		SenderUUID, PlayURI, SenderName string
		SenderID                        int32
	}
	InvitationAnswered struct {
		Accepted      bool
		ResponderName string
	}
	InvitationTooHigh struct{}
	InvitationClosed  struct{}
)

const (
	invitationWindow      = 10 * time.Minute
	maxInvitationsPerUser = 3
	maxInvitations        = 50
)

type invitation struct {
	at       time.Time
	receiver string
}

// InviteToMeeting is MeetingInvitationRequestMessage.
func (r *Room) InviteToMeeting(ctx context.Context, p Peer, receiverUUID string, admin bool) error {
	return r.a.Post(ctx, func() {
		s := r.s
		u := s.byPeer[p]
		if u == nil {
			return
		}
		if !admin {
			var kept []invitation
			sameReceiver := 0
			for _, i := range s.invitations[u.uuid] {
				if time.Since(i.at) < invitationWindow {
					kept = append(kept, i)
					if i.receiver == receiverUUID {
						sameReceiver++
					}
				}
			}
			if sameReceiver > maxInvitationsPerUser || len(kept) > maxInvitations {
				s.invitations[u.uuid] = kept
				p.Send(NewMsg(InvitationTooHigh{}, false))
				return
			}
			s.invitations[u.uuid] = append(kept, invitation{at: time.Now(), receiver: receiverUUID})
		}
		m := NewMsg(InvitationReceived{SenderUUID: u.uuid, PlayURI: s.url, SenderName: u.name, SenderID: u.id}, false)
		for _, o := range s.users {
			if o.uuid == receiverUUID && o != u {
				o.peer.Send(m)
			}
		}
	})
}

// AnswerMeetingInvitation is MeetingInvitationResponseMessage: the inviter's tabs get the answer, the invited
// one's other tabs close their invitation.
func (r *Room) AnswerMeetingInvitation(ctx context.Context, p Peer, accept bool, senderUUID string) error {
	return r.a.Post(ctx, func() {
		s := r.s
		u := s.byPeer[p]
		if u == nil {
			return
		}
		answer := NewMsg(InvitationAnswered{Accepted: accept, ResponderName: u.name}, false)
		closed := NewMsg(InvitationClosed{}, false)
		for _, o := range s.users {
			switch {
			case o == u:
			case o.uuid == senderUUID:
				o.peer.Send(answer)
			case o.uuid == u.uuid:
				o.peer.Send(closed)
			}
		}
		if accept {
			delete(s.invitations, senderUUID)
		}
	})
}
