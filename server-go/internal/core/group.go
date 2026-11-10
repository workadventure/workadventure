package core

import (
	"fmt"
	"math"
	"sync/atomic"
	"time"
)

// nextGroupID is shared by all rooms, like the static Group.nextId of the back.
var nextGroupID atomic.Int32

// Every member of a bubble is asked to join the bubble's space with these properties synced.
var proximityPropertiesToSync = []string{"cameraState", "microphoneState", "screenSharingState"}

// group is a proximity bubble (Group in the back). ponytail: the bubble is not rebuilt around a leader and its
// followers (outOfBounds of the back): following is the front's business, the server keeps who follows whom.
type group struct {
	id        int32
	users     []*user
	x, y      float64 // barycenter of the members
	locked    bool
	zone      *zone
	spaceName string
	destroyed bool
}

func (g *group) userIDs() []int32 {
	ids := make([]int32, len(g.users))
	for i, u := range g.users {
		ids[i] = u.id
	}
	return ids
}

func (g *group) barycenter() (float64, float64) {
	var x, y float64
	for _, u := range g.users {
		x += float64(u.pos.X)
		y += float64(u.pos.Y)
	}
	n := float64(len(g.users))
	return x / n, y / n
}

func (g *group) updated() GroupUpdated {
	return GroupUpdated{
		GroupID: g.id, X: int32(math.Floor(g.x)), Y: int32(math.Floor(g.y)), Size: int32(len(g.users)), //nolint:gosec // a position on the map and a group of a few players fit in int32
		Locked: g.locked, UserIDs: g.userIDs(),
	}
}

func distance(p Position, x, y float64) float64 {
	return math.Hypot(x-float64(p.X), y-float64(p.Y))
}

func (s *state) full(g *group) bool { return len(g.users) >= s.cfg.MaxPerGroup }

// updateUserGroup is GameRoom.updateUserGroup: after a player moved (or became available), it joins the closest
// player or bubble, or leaves its bubble if it walked out of it.
func (s *state) updateUserGroup(u *user) {
	if u.status.Silent() {
		return
	}
	radius := float64(s.cfg.GroupRadius)
	if g := u.group; g == nil {
		// A walking player does not join: it joins when it stops.
		if u.pos.Moving {
			return
		}
		switch c := s.closestAvailable(u).(type) {
		case *group:
			s.groupJoin(c, u)
		case *user:
			s.newGroup(u, c)
		}
	} else {
		x, y := g.barycenter()
		kickedSomeoneOut := false
		for _, m := range g.users {
			if distance(m.pos, x, y) > radius {
				kickedSomeoneOut = true
				break
			}
		}
		// The player who moved away from the others is the one who leaves.
		if kickedSomeoneOut && distance(u.pos, x, y) > radius {
			s.leaveGroup(u)
		}
	}
	if g := u.group; g != nil {
		s.updateGroupPosition(g)
		s.absorbNearbyUsers(g)
	}
}

// closestAvailable returns the closest player out of any bubble (within MINIMUM_DISTANCE) or open bubble
// (within GROUP_RADIUS), or nil.
func (s *state) closestAvailable(u *user) any {
	minDistance, radius := float64(s.cfg.MinimumDistance), float64(s.cfg.GroupRadius)
	best := math.Max(minDistance, radius)
	var match any
	ux, uy := float64(u.pos.X), float64(u.pos.Y)
	for _, c := range s.userIndex.within(ux, uy, minDistance) {
		if c.group != nil || c == u || c.status.Silent() {
			continue
		}
		if d := distance(c.pos, ux, uy); d <= best && d <= minDistance {
			best, match = d, c
		}
	}
	for _, g := range s.groupIndex.within(ux, uy, radius) {
		if s.full(g) || g.locked {
			continue
		}
		if d := distance(u.pos, g.x, g.y); d <= best && d <= radius {
			best, match = d, g
		}
	}
	return match
}

func (s *state) newGroup(members ...*user) *group {
	id := nextGroupID.Add(1)
	g := &group{id: id, spaceName: fmt.Sprintf("%s#%d#%d", s.url, id, time.Now().UnixMilli())}
	for _, m := range members {
		s.groupJoin(g, m)
	}
	g.x, g.y = g.barycenter()
	s.groups[g.id] = g
	s.groupIndex.set(g, g.x, g.y)
	s.groupEnters(g, s.zone(groupZoneKey(g.x, g.y)), nil)
	return g
}

func (s *state) groupJoin(g *group, u *user) {
	g.users = append(g.users, u)
	u.group = g
	u.peer.Send(NewMsg(JoinSpaceRequest{SpaceName: g.spaceName, PropertiesToSync: proximityPropertiesToSync}, false))
	s.groupUsersChanged(g)
}

func (s *state) groupUsersChanged(g *group) {
	if g.zone == nil {
		return // not in a zone yet: the group is being created and will announce itself whole
	}
	var m *Msg
	for l := range g.zone.listeners {
		l.peer.Send(lazy(&m, func() Event { return GroupUsersUpdated{GroupID: g.id, UserIDs: g.userIDs()} }))
	}
}

// leaveGroup takes u out of its bubble, and bursts the bubble if u leaves a single player behind.
func (s *state) leaveGroup(u *user) {
	g := u.group
	for i, m := range g.users {
		if m == u {
			g.users = append(g.users[:i], g.users[i+1:]...)
			break
		}
	}
	u.group = nil
	u.peer.Send(NewMsg(LeaveSpaceRequest{SpaceName: g.spaceName}, false))

	if len(g.users) > 1 {
		s.groupUsersChanged(g)
		s.updateGroupPosition(g)
		return
	}
	// Burst: the group leaves its zone, then the last member leaves the group.
	g.destroyed = true
	if z := g.zone; z != nil {
		s.groupLeaves(g, z, nil)
		s.gcZone(z)
	}
	for _, last := range g.users {
		last.group = nil
		last.peer.Send(NewMsg(LeaveSpaceRequest{SpaceName: g.spaceName}, false))
	}
	g.users = nil
	delete(s.groups, g.id)
	s.groupIndex.remove(g)
}

func (s *state) updateGroupPosition(g *group) {
	g.x, g.y = g.barycenter()
	s.groupIndex.set(g, g.x, g.y)
	if g.zone == nil {
		return
	}
	if k := groupZoneKey(g.x, g.y); k != g.zone.key {
		old, nz := g.zone, s.zone(k)
		s.groupLeaves(g, old, nz)
		s.groupEnters(g, nz, old)
		s.gcZone(old)
	} else {
		s.groupChanged(g)
	}
}

// absorbNearbyUsers lets a bubble swallow the idle players it moved next to (Group.searchForNearbyUsers).
// The TS version looks around the wrong zone (it divides zone indices by the zone size a second time, so it
// always searches near the map origin); this one searches the 3x3 zones around the bubble, as intended.
func (s *state) absorbNearbyUsers(g *group) {
	if g.zone == nil || g.locked {
		return
	}
	radius := float64(s.cfg.GroupRadius)
	for n := 0; n < 9; n++ {
		i, j := g.zone.key.i+int32(n%3)-1, g.zone.key.j+int32(n/3)-1
		if i < 0 || j < 0 {
			continue
		}
		z := s.zones[zoneKey{i, j}]
		if z == nil {
			continue
		}
		for _, u := range sortedUsers(z.users) {
			if s.full(g) {
				return
			}
			if u.status.Silent() || u.group != nil || u.pos.Moving {
				continue
			}
			if distance(u.pos, g.x, g.y) < radius {
				s.groupJoin(g, u)
				s.updateGroupPosition(g)
			}
		}
	}
}
