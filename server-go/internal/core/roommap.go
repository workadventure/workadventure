package core

import (
	"context"
	"slices"
	"strconv"
)

// Area is what a room knows of an area of its map: where it is and the properties the server acts on.
type Area struct {
	ID                  string
	X, Y, Width, Height float64
	Properties          []AreaProperty
}

type AreaProperty struct {
	ID, Type    string
	AllowedTags []string // lockableAreaPropertyData: who may lock it (empty: everybody)
	MaxUsers    *int     // maxUsersInAreaPropertyData; nil: no limit
}

const (
	lockable    = "lockableAreaPropertyData"
	maxUsersCap = "maxUsersInAreaPropertyData"
)

// AreaVariable is a value attached to an area property and shared by the room: the lock of a meeting room, whether
// an area is full. It lives as long as the room.
type AreaVariable struct{ AreaID, PropertyID, Key, Value string }

// Events about the map of the room.
type (
	AreaVariableChanged struct{ Variable AreaVariable }
	MapReplaced         struct{ RoomURL string } // the map file was replaced: the players must reload
	MapDeleted          struct{}
)

// Connect registers a connection to the room before it joins: from then on it gets the edits of the map and the
// area variables. connected runs on the room's goroutine and returns its first message (the edits it missed), so
// that no edit falls between the two. load reads the areas of the map, once per room.
func (r *Room) Connect(ctx context.Context, p Peer, load func() []Area, connected func() Event) error {
	return r.a.Post(ctx, func() {
		if !r.s.areasLoaded {
			r.s.areasLoaded = true
			r.s.setAreas(load())
		}
		r.s.listeners[p] = struct{}{}
		p.Send(NewMsg(connected(), false))
	})
}

// SetAreaVariable is SetAreaPropertyVariableMessage: a player locks or unlocks an area. ponytail: only the lock of
// a lockable area, the one variable the front sets; the back also lets any property get any variable.
func (r *Room) SetAreaVariable(ctx context.Context, p Peer, v AreaVariable, tags []string) error {
	return r.a.Post(ctx, func() {
		if r.s.byPeer[p] == nil || v.Key != "lock" {
			return
		}
		prop := r.s.property(v.AreaID, v.PropertyID)
		if prop == nil || prop.Type != lockable {
			return
		}
		if len(prop.AllowedTags) > 0 && !slices.ContainsFunc(prop.AllowedTags, func(t string) bool { return slices.Contains(tags, t) }) {
			return
		}
		r.s.setVariable(v)
	})
}

// MapChanged tells the connections that the map file was replaced (they must reload) or deleted (they leave).
func (r *Room) MapChanged(ctx context.Context, deleted bool) error {
	return r.a.Post(ctx, func() {
		for p := range r.s.listeners {
			if deleted {
				p.Send(NewMsg(MapDeleted{}, false))
				p.Kick("Map was deleted.")
			} else {
				p.Send(NewMsg(MapReplaced{RoomURL: r.s.url}, false))
			}
		}
	})
}

func (s *state) toListeners(m *Msg) {
	for p := range s.listeners {
		p.Send(m)
	}
}

func (s *state) area(id string) *Area {
	for i := range s.areas {
		if s.areas[i].ID == id {
			return &s.areas[i]
		}
	}
	return nil
}

func (s *state) property(areaID, propertyID string) *AreaProperty {
	if a := s.area(areaID); a != nil {
		for i := range a.Properties {
			if a.Properties[i].ID == propertyID {
				return &a.Properties[i]
			}
		}
	}
	return nil
}

func (s *state) variables() []AreaVariable {
	out := make([]AreaVariable, 0, len(s.vars))
	for k, v := range s.vars {
		out = append(out, AreaVariable{AreaID: k[0], PropertyID: k[1], Key: k[2], Value: v})
	}
	return out
}

func (s *state) setVariable(v AreaVariable) {
	k := [3]string{v.AreaID, v.PropertyID, v.Key}
	if old, ok := s.vars[k]; ok && old == v.Value {
		return
	}
	s.vars[k] = v.Value
	s.toListeners(NewMsg(AreaVariableChanged{Variable: v}, true))
}

// Areas the server counts players in (AreaZoneTracker): lockable ones, unlocked when the last player leaves, and
// capped ones, full at their maximum.
func counted(a *Area) bool {
	return slices.ContainsFunc(a.Properties, func(p AreaProperty) bool { return p.Type == lockable || p.Type == maxUsersCap })
}

func (a *Area) contains(p Position) bool {
	x, y := float64(p.X), float64(p.Y)
	return x >= a.X && x <= a.X+a.Width && y >= a.Y && y <= a.Y+a.Height
}

// track updates the areas a player is in, after it joined or moved.
func (s *state) track(u *user) {
	var now []string
	for i := range s.areas {
		if a := &s.areas[i]; counted(a) && a.contains(u.pos) {
			now = append(now, a.ID)
		}
	}
	for _, id := range u.areas {
		if !slices.Contains(now, id) {
			s.recount(id, -1)
		}
	}
	for _, id := range now {
		if !slices.Contains(u.areas, id) {
			s.recount(id, 1)
		}
	}
	u.areas = now
}

func (s *state) untrack(u *user) {
	for _, id := range u.areas {
		s.recount(id, -1)
	}
	u.areas = nil
}

func (s *state) recount(id string, delta int) {
	before := s.counts[id]
	s.counts[id] = before + delta
	if s.counts[id] <= 0 {
		delete(s.counts, id)
	}
	s.areaRules(id, before, s.counts[id])
}

func (s *state) areaRules(id string, before, after int) {
	a := s.area(id)
	if a == nil {
		return
	}
	for _, p := range a.Properties {
		switch {
		case p.Type == lockable && before > 0 && after == 0:
			s.setVariable(AreaVariable{AreaID: id, PropertyID: p.ID, Key: "lock", Value: "false"})
		case p.Type == maxUsersCap:
			full := p.MaxUsers != nil && after >= *p.MaxUsers
			if (s.vars[[3]string{id, p.ID, "maxUsersReached"}] == "true") != full {
				s.setVariable(AreaVariable{AreaID: id, PropertyID: p.ID, Key: "maxUsersReached", Value: strconv.FormatBool(full)})
			}
		}
	}
}

// setAreas replaces the areas after an edit of the map: players are counted again, and an area that moved away
// from its players unlocks.
func (s *state) setAreas(areas []Area) {
	before := s.counts
	s.areas, s.counts = areas, map[string]int{}
	for _, u := range s.users {
		u.areas = nil
		for i := range s.areas {
			if a := &s.areas[i]; counted(a) && a.contains(u.pos) {
				u.areas = append(u.areas, a.ID)
				s.counts[a.ID]++
			}
		}
	}
	for i := range s.areas {
		id := s.areas[i].ID
		s.areaRules(id, before[id], s.counts[id])
	}
}
