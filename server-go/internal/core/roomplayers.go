package core

import "context"

// Events between players of a room: moderation, scripting events, follow mode.
type (
	// Ejected tells a player that a moderator kicked or banned it (BanUserMessage), before its connection closes.
	Ejected struct{ Type, Message string }

	FollowRequested struct {
		Leader int32
		Force  bool
	}
	FollowConfirmed struct{ Leader, Follower int32 }
	FollowAborted   struct{ Leader, Follower int32 }
)

// Eject removes every connection of a player from the room (SocketManager.banUser of the back).
func (r *Room) Eject(ctx context.Context, uuid, kind, message string) error {
	return r.a.Post(ctx, func() {
		var victims []*user
		for _, u := range r.s.users {
			if u.uuid == uuid {
				victims = append(victims, u)
			}
		}
		for _, u := range victims {
			r.s.leave(u)
			delete(r.s.listeners, u.peer)
			u.peer.Send(NewMsg(Ejected{Type: kind, Message: message}, false))
			u.peer.Kick("User was " + kind + ": " + message)
		}
	})
}

// SendEvent delivers a scripting event (WA.event.broadcast, player.sendEvent, a global event): to every connection,
// the sender included, or only to the given players.
func (r *Room) SendEvent(ctx context.Context, m *Msg, targets []int32) error {
	return r.a.Post(ctx, func() {
		if len(targets) == 0 {
			r.s.toListeners(m)
			r.s.toWatchers(m.Event)
			return
		}
		for _, id := range targets {
			if u := r.s.users[id]; u != nil {
				u.peer.Send(m)
			}
		}
	})
}

// Follow mode: a player asks the other members of its bubble to follow it; whoever accepts follows it until one of
// them stops. Where a follower walks is the front's business: the server only keeps who follows whom.

// FollowRequest relays a request to the other members of the sender's bubble.
func (r *Room) FollowRequest(ctx context.Context, p Peer, force bool) error {
	return r.a.Post(ctx, func() {
		u := r.s.byPeer[p]
		if u == nil || u.group == nil {
			return
		}
		m := NewMsg(FollowRequested{Leader: u.id, Force: force}, false)
		for _, o := range u.group.users {
			if o != u {
				o.peer.Send(m)
			}
		}
	})
}

// FollowConfirm makes the sender follow leaderID.
func (r *Room) FollowConfirm(ctx context.Context, p Peer, leaderID int32) error {
	return r.a.Post(ctx, func() {
		follower, leader := r.s.byPeer[p], r.s.users[leaderID]
		if follower == nil || leader == nil || leader == follower {
			return
		}
		if g := follower.group; g != nil {
			for _, o := range g.users {
				if o != leader && len(o.followers) > 0 {
					r.s.stopLeading(o) // a bubble has one leader
				}
			}
		}
		if leader.followers == nil {
			leader.followers = map[*user]struct{}{}
		}
		leader.followers[follower] = struct{}{}
		follower.following = leader
		leader.peer.Send(NewMsg(FollowConfirmed{Leader: leader.id, Follower: follower.id}, false))
	})
}

// FollowAbort is the leader stopping (followerID is then 0) or a follower leaving its leader.
func (r *Room) FollowAbort(ctx context.Context, p Peer, leaderID, followerID int32) error {
	return r.a.Post(ctx, func() {
		u := r.s.byPeer[p]
		if u == nil {
			return
		}
		if u.id != leaderID {
			if leader := r.s.users[leaderID]; leader != nil {
				r.s.unfollow(leader, u)
			}
			return
		}
		r.s.stopLeading(u)
		// Those who got the request but did not accept it yet are told too.
		if u.group != nil {
			m := NewMsg(FollowAborted{Leader: leaderID, Follower: followerID}, false)
			for _, o := range u.group.users {
				if o != u {
					o.peer.Send(m)
				}
			}
		}
	})
}

func (s *state) unfollow(leader, follower *user) {
	if _, ok := leader.followers[follower]; !ok {
		return
	}
	delete(leader.followers, follower)
	follower.following = nil
	m := NewMsg(FollowAborted{Leader: leader.id, Follower: follower.id}, false)
	leader.peer.Send(m)
	follower.peer.Send(m)
}

func (s *state) stopLeading(leader *user) {
	for f := range leader.followers {
		s.unfollow(leader, f)
	}
}

// stopFollowing ends the follow relations of a player who leaves.
func (s *state) stopFollowing(u *user) {
	s.stopLeading(u)
	if u.following != nil {
		s.unfollow(u.following, u)
	}
}
