package core

import (
	"math"
	"slices"
)

// zoneSize is the side of a zone in pixels (10 tiles). A player only hears about what happens in the zones its
// viewport covers: that is what keeps the traffic of a large room bounded.
const zoneSize = 320

// MaxZonesPerViewport bounds the zones one client listens to, whatever viewport it announces (a 40x40 grid of
// zones, about 25 times a 1080p screen). A larger viewport is cropped around its center.
const MaxZonesPerViewport = 1600

type zoneKey struct{ i, j int32 }

// zone merges the back's Zone (what is in it) and the pusher's Zone (who listens to it).
type zone struct {
	key       zoneKey
	users     map[*user]struct{}
	groups    map[*group]struct{}
	listeners map[*user]struct{}
}

func floorDiv(a, b int32) int32 {
	q := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		q--
	}
	return q
}

func userZoneKey(p Position) zoneKey {
	return zoneKey{floorDiv(p.X, zoneSize), floorDiv(p.Y, zoneSize)}
}

func groupZoneKey(x, y float64) zoneKey {
	return zoneKey{int32(math.Floor(x / zoneSize)), int32(math.Floor(y / zoneSize))}
}

func (s *state) zone(k zoneKey) *zone {
	z := s.zones[k]
	if z == nil {
		z = &zone{key: k, users: map[*user]struct{}{}, groups: map[*group]struct{}{}, listeners: map[*user]struct{}{}}
		s.zones[k] = z
	}
	return z
}

// gcZone frees a zone nobody is in and nobody listens to.
func (s *state) gcZone(z *zone) {
	if z != nil && len(z.users) == 0 && len(z.groups) == 0 && len(z.listeners) == 0 {
		delete(s.zones, z.key)
	}
}

// lazy creates the shared message the first time a listener needs it.
func lazy(m **Msg, event func() Event) *Msg {
	if *m == nil {
		*m = NewMsg(event(), true)
	}
	return *m
}

// userEnters tells the listeners of z that u arrived. Those that already saw u in from only see a move.
func (s *state) userEnters(u *user, z, from *zone) {
	z.users[u] = struct{}{}
	u.zone = z
	var joined, moved *Msg
	for l := range z.listeners {
		if l == u {
			continue
		}
		if from == nil || !l.listens(from.key) {
			l.peer.Send(lazy(&joined, func() Event { return UserJoined{User: u.view()} }))
		} else {
			l.peer.Send(lazy(&moved, func() Event { return UserMoved{UserID: u.id, Position: u.pos} }))
		}
	}
}

// userLeaves tells the listeners of z that u left, except those that still see it in to.
func (s *state) userLeaves(u *user, z, to *zone) {
	delete(z.users, u)
	var left *Msg
	for l := range z.listeners {
		if l != u && (to == nil || !l.listens(to.key)) {
			l.peer.Send(lazy(&left, func() Event { return UserLeft{UserID: u.id} }))
		}
	}
}

func (s *state) userMovesInZone(u *user) {
	var moved *Msg
	for l := range u.zone.listeners {
		if l != u {
			l.peer.Send(lazy(&moved, func() Event { return UserMoved{UserID: u.id, Position: u.pos} }))
		}
	}
}

func (s *state) groupEnters(g *group, z, from *zone) {
	z.groups[g] = struct{}{}
	g.zone = z
	var m *Msg
	for l := range z.listeners {
		l.peer.Send(lazy(&m, func() Event { return g.updated() }))
	}
}

func (s *state) groupLeaves(g *group, z, to *zone) {
	delete(z.groups, g)
	g.zone = nil
	var m *Msg
	for l := range z.listeners {
		if to == nil || !l.listens(to.key) {
			l.peer.Send(lazy(&m, func() Event { return GroupDeleted{GroupID: g.id} }))
		}
	}
}

// groupChanged tells the listeners of the group's zone its new state (moved, resized, locked).
func (s *state) groupChanged(g *group) {
	if g.zone == nil {
		return
	}
	var m *Msg
	for l := range g.zone.listeners {
		l.peer.Send(lazy(&m, func() Event { return g.updated() }))
	}
}

// setViewport subscribes u to the zones its viewport covers: it receives everything already in the new zones and
// stops hearing about the zones it no longer sees.
func (s *state) setViewport(u *user, vp Viewport) {
	if vp.Left > vp.Right || vp.Top > vp.Bottom {
		return
	}
	tl, br := boundZoneRectangle(userZoneKey(Position{X: vp.Left, Y: vp.Top}), userZoneKey(Position{X: vp.Right, Y: vp.Bottom}))
	want := make(map[zoneKey]struct{}, int((br.i-tl.i+1)*(br.j-tl.j+1)))
	for j := tl.j; j <= br.j; j++ {
		for i := tl.i; i <= br.i; i++ {
			want[zoneKey{i, j}] = struct{}{}
		}
	}
	for k := range want {
		if !u.listens(k) {
			s.subscribe(u, s.zone(k))
		}
	}
	for k, z := range u.listened {
		if _, ok := want[k]; !ok {
			s.unsubscribe(u, z)
		}
	}
}

func (s *state) subscribe(u *user, z *zone) {
	for _, other := range sortedUsers(z.users) {
		if other != u {
			u.peer.Send(NewMsg(UserJoined{User: other.view()}, true))
		}
	}
	for _, g := range sortedGroups(z.groups) {
		u.peer.Send(NewMsg(g.updated(), true))
	}
	z.listeners[u] = struct{}{}
	u.listened[z.key] = z
}

func (s *state) unsubscribe(u *user, z *zone) {
	for _, other := range sortedUsers(z.users) {
		if other != u {
			u.peer.Send(NewMsg(UserLeft{UserID: other.id}, true))
		}
	}
	for _, g := range sortedGroups(z.groups) {
		u.peer.Send(NewMsg(GroupDeleted{GroupID: g.id}, true))
	}
	delete(z.listeners, u)
	delete(u.listened, z.key)
	s.gcZone(z)
}

func sortedUsers(set map[*user]struct{}) []*user {
	out := make([]*user, 0, len(set))
	for u := range set {
		out = append(out, u)
	}
	slices.SortFunc(out, func(a, b *user) int { return int(a.id - b.id) })
	return out
}

func sortedGroups(set map[*group]struct{}) []*group {
	out := make([]*group, 0, len(set))
	for g := range set {
		out = append(out, g)
	}
	slices.SortFunc(out, func(a, b *group) int { return int(a.id - b.id) })
	return out
}

// boundZoneRectangle crops an oversized viewport around its center, keeping its aspect ratio
// (PositionDispatcher.boundZoneRectangle).
func boundZoneRectangle(tl, br zoneKey) (zoneKey, zoneKey) {
	w, h := int64(br.i)-int64(tl.i)+1, int64(br.j)-int64(tl.j)+1
	if w*h <= MaxZonesPerViewport {
		return tl, br
	}
	ratio := math.Sqrt(float64(MaxZonesPerViewport) / float64(w*h))
	cw := max(1, int64(math.Floor(float64(w)*ratio)))
	ch := max(1, int64(math.Floor(float64(h)*ratio)))
	if cw*ch > MaxZonesPerViewport {
		if cw >= ch {
			cw = max(1, MaxZonesPerViewport/ch)
		} else {
			ch = max(1, MaxZonesPerViewport/cw)
		}
	}
	ci := floorDiv64(int64(tl.i)+int64(br.i), 2)
	cj := floorDiv64(int64(tl.j)+int64(br.j), 2)
	ntl := zoneKey{int32(ci - (cw-1)/2), int32(cj - (ch-1)/2)}        //nolint:gosec // zone indices of a map fit in int32
	return ntl, zoneKey{ntl.i + int32(cw) - 1, ntl.j + int32(ch) - 1} //nolint:gosec // zone indices of a map fit in int32
}

func floorDiv64(a, b int64) int64 {
	q := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		q--
	}
	return q
}
