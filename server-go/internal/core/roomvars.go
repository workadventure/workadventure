package core

import (
	"context"
	"fmt"
	"slices"
	"time"
)

// VarDef is a room variable the map declares: an object of type "variable" in the Tiled map.
type VarDef struct {
	Persist                bool
	ReadableBy, WritableBy string // a tag; "" for everybody
}

// RoomVariables is what a room starts with. Defs is nil when the map could not be read: every variable is then
// accepted, and none is kept.
type RoomVariables struct {
	Defs   map[string]VarDef
	Values map[string]string        // JSON values
	Save   func(name, value string) // keeps a persistent variable ("" removes it); must not block
}

// Variable is a name and its JSON value, of the room or of a player.
type Variable struct{ Name, Value string }

// StoredVariable is a stored variable of a player, given back when it joins.
type StoredVariable struct {
	Name, Value string
	Public      bool
}

type (
	VariableChanged struct{ Name, Value string }
	// RoomError tells one player that what it asked was refused (ErrorMessage).
	RoomError struct{ Message string }
)

// A map read longer ago than this may have changed: a variable it does not declare makes the room read it again.
const redeclareAfter = 10 * time.Second

// InitVariables loads the room variables, once per room. load runs on the caller's goroutine before the join it
// precedes is posted, so the join sees the variables.
func (r *Room) InitVariables(ctx context.Context, load func() RoomVariables) {
	r.varsOnce.Do(func() {
		v := load()
		_ = r.a.Post(ctx, func() { r.s.roomVars, r.s.varsAt = &v, time.Now() })
	})
}

// SetVariable is VariableMessage. A variable the map does not declare is refused; but if the map was read more than
// 10 s ago and mayRedeclare, done(true) tells the caller to read the map again, Redeclare and retry once. done runs
// on the room's goroutine, always.
func (r *Room) SetVariable(ctx context.Context, p Peer, v Variable, tags []string, mayRedeclare bool, done func(stale bool)) error {
	return r.a.Post(ctx, func() { done(r.s.setRoomVariable(p, v, tags, mayRedeclare)) })
}

// Redeclare takes the declarations of a map read again; new variables start at their default.
func (r *Room) Redeclare(ctx context.Context, v RoomVariables) error {
	return r.a.Post(ctx, func() {
		cur := r.s.roomVars
		if cur == nil {
			return
		}
		cur.Defs = v.Defs
		for k, val := range v.Values {
			if _, ok := cur.Values[k]; !ok {
				cur.Values[k] = val
			}
		}
		r.s.varsAt = time.Now()
	})
}

func (s *state) setRoomVariable(p Peer, v Variable, tags []string, mayRedeclare bool) (stale bool) {
	u, vars := s.byPeer[p], s.roomVars
	if u == nil || vars == nil {
		return false
	}
	def, declared := vars.Defs[v.Name]
	if vars.Defs != nil && !declared {
		if mayRedeclare && time.Since(s.varsAt) > redeclareAfter {
			return true
		}
		u.peer.Send(NewMsg(RoomError{Message: fmt.Sprintf("Trying to set a variable %q that is not defined as a variable in the map", v.Name)}, false))
		return false
	}
	if def.WritableBy != "" && !slices.Contains(tags, def.WritableBy) {
		u.peer.Send(NewMsg(RoomError{Message: fmt.Sprintf("Trying to set a variable %q but this variable is not writable by you", v.Name)}, false))
		return false
	}
	if old, ok := vars.Values[v.Name]; ok && old == v.Value {
		return false
	}
	vars.Values[v.Name] = v.Value
	if declared && def.Persist && vars.Save != nil {
		vars.Save(v.Name, v.Value)
	}
	m := NewMsg(VariableChanged{Name: v.Name, Value: v.Value}, true)
	for _, o := range s.users {
		if def.ReadableBy == "" || slices.Contains(o.tags, def.ReadableBy) {
			o.peer.Send(m)
		}
	}
	return false
}

// readableVariables is the snapshot a joining player gets.
func (s *state) readableVariables(tags []string) []Variable {
	if s.roomVars == nil {
		return nil
	}
	out := make([]Variable, 0, len(s.roomVars.Values))
	for name, value := range s.roomVars.Values {
		if def := s.roomVars.Defs[name]; def.ReadableBy == "" || slices.Contains(tags, def.ReadableBy) {
			out = append(out, Variable{Name: name, Value: value})
		}
	}
	return out
}
