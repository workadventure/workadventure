package core

import (
	"context"

	"github.com/workadventure/workadventure/server-go/internal/actor"
)

// Config holds the proximity settings of the back (MINIMUM_DISTANCE, GROUP_RADIUS, MAX_PER_GROUP).
type Config struct {
	MinimumDistance int
	GroupRadius     int
	MaxPerGroup     int
}

// inboxSize bounds the messages waiting for a room. When it is full, the connections posting to it block, so a
// saturated room slows its own clients down instead of growing in memory.
const inboxSize = 1024

// Room is a map instance (GameRoom in the back, PusherRoom in the pusher). It is an actor: its state lives on one
// goroutine and every method below only posts a closure to it. Different rooms run in parallel.
type Room struct {
	URL string
	a   *actor.Actor
	s   *state
}

func NewRoom(url string, cfg Config) *Room {
	return &Room{URL: url, a: actor.Start("room "+url, inboxSize), s: newState(url, cfg)}
}

// Stop ends the room once its pending messages are processed. Nothing may be posted after Stop.
func (r *Room) Stop()                 { r.a.Stop() }
func (r *Room) Done() <-chan struct{} { return r.a.Done() }

// Join adds the player behind p. Before anything else, p receives RoomJoined with its id in the room.
func (r *Room) Join(ctx context.Context, p Peer, req JoinRequest) error {
	return r.a.Post(ctx, func() { r.s.join(p, req) })
}

func (r *Room) Leave(ctx context.Context, p Peer) error {
	return r.a.Post(ctx, func() {
		if u := r.s.byPeer[p]; u != nil {
			r.s.leave(u)
		}
	})
}

// Move updates the position of the player and, if vp is not nil, what it sees (UserMovesMessage).
func (r *Room) Move(ctx context.Context, p Peer, pos Position, vp *Viewport) error {
	return r.a.Post(ctx, func() {
		if u := r.s.byPeer[p]; u != nil {
			r.s.move(u, pos)
			if vp != nil {
				r.s.setViewport(u, *vp)
			}
		}
	})
}

func (r *Room) SetViewport(ctx context.Context, p Peer, vp Viewport) error {
	return r.a.Post(ctx, func() {
		if u := r.s.byPeer[p]; u != nil {
			r.s.setViewport(u, vp)
		}
	})
}

func (r *Room) SetPlayerDetails(ctx context.Context, p Peer, d PlayerDetails) error {
	return r.a.Post(ctx, func() {
		if u := r.s.byPeer[p]; u != nil {
			r.s.setPlayerDetails(u, d)
		}
	})
}

// LockGroup locks or unlocks the bubble the player is in (LockGroupPromptMessage).
func (r *Room) LockGroup(ctx context.Context, p Peer, lock bool) error {
	return r.a.Post(ctx, func() {
		if u := r.s.byPeer[p]; u != nil && u.group != nil {
			u.group.locked = lock
			r.s.groupChanged(u.group)
		}
	})
}

// AskPosition asks where another player is, by uuid (and room id, for a player connected twice). The answer is
// MoveToPosition, or LocatePosition if locate is true. Nothing comes back if the player is not in the room.
func (r *Room) AskPosition(ctx context.Context, p Peer, uuid string, userID *int32, locate bool) error {
	return r.a.Post(ctx, func() {
		target := r.s.firstByUUID[uuid]
		if target == nil {
			return
		}
		if userID != nil {
			if byID := r.s.users[*userID]; byID != nil {
				target = byID
			}
		}
		if locate {
			p.Send(NewMsg(LocatePosition{Position: target.pos, UserID: target.id, UUID: target.uuid}, false))
		} else {
			p.Send(NewMsg(MoveToPosition{Position: target.pos}, false))
		}
	})
}

// MapEdit is a change of the room's map, or its refusal, as the adapter encoded it: the core orders and routes it.
type MapEdit struct{ Event any }

// EditMap applies an edit of the room's map on the room's goroutine, so that edits are applied and announced one
// at a time, in order, to every player: the editor too, which waits for its own edit to come back. apply returns
// what to announce, or a refusal for the editor alone. ponytail: apply writes the map file from the room's
// goroutine; edits are rare and a write takes about a millisecond. Hand it to the worker pool if maps grow large.
func (r *Room) EditMap(ctx context.Context, p Peer, apply func() (announce, refusal any)) error {
	return r.a.Post(ctx, func() {
		announce, refusal := apply()
		if refusal != nil {
			p.Send(NewMsg(MapEdit{Event: refusal}, true))
			return
		}
		m := NewMsg(MapEdit{Event: announce}, true)
		for _, u := range r.s.users {
			u.peer.Send(m)
		}
	})
}

// Stats is a consistent snapshot of a room, for metrics and tests.
type Stats struct {
	Users, Groups, Zones int
}

func (r *Room) Stats(ctx context.Context) (Stats, error) {
	ch := make(chan Stats, 1)
	if err := r.a.Post(ctx, func() {
		ch <- Stats{Users: len(r.s.users), Groups: len(r.s.groups), Zones: len(r.s.zones)}
	}); err != nil {
		return Stats{}, err
	}
	select {
	case st := <-ch:
		return st, nil
	case <-ctx.Done():
		return Stats{}, ctx.Err()
	}
}

// state is owned by the room's goroutine: no lock.
type state struct {
	url         string
	cfg         Config
	users       map[int32]*user
	byPeer      map[Peer]*user
	countUUID   map[string]int
	firstByUUID map[string]*user // the first connection of each uuid still in the room (getUserByUuid)
	byTab       map[string]*user
	groups      map[int32]*group
	userIndex   *spatialIndex[*user]
	groupIndex  *spatialIndex[*group]
	zones       map[zoneKey]*zone
	nextUserID  int32
}

func newState(url string, cfg Config) *state {
	cell := float64(max(cfg.MinimumDistance, cfg.GroupRadius, 1))
	return &state{
		url:         url,
		cfg:         cfg,
		users:       map[int32]*user{},
		byPeer:      map[Peer]*user{},
		countUUID:   map[string]int{},
		firstByUUID: map[string]*user{},
		byTab:       map[string]*user{},
		groups:      map[int32]*group{},
		userIndex:   newSpatialIndex[*user](cell),
		groupIndex:  newSpatialIndex[*group](cell),
		zones:       map[zoneKey]*zone{},
		nextUserID:  1,
	}
}

type user struct {
	id           int32
	peer         Peer
	uuid, tabID  string
	name         string
	textures     []Texture
	companion    *Texture
	visitCardURL string
	chatID       *string
	status       AvailabilityStatus
	pos          Position
	outline      *uint32
	say          *Say
	vars         map[string]string // public variables, copy-on-write: a UserView may share it
	group        *group
	zone         *zone
	listened     map[zoneKey]*zone
}

func (u *user) view() UserView {
	return UserView{
		ID: u.id, UUID: u.uuid, Name: u.name, Textures: u.textures, Companion: u.companion, Position: u.pos,
		Status: u.status, VisitCardURL: u.visitCardURL, OutlineColor: u.outline, Variables: u.vars,
		ChatID: u.chatID, Say: u.say,
	}
}

func (u *user) listens(k zoneKey) bool {
	_, ok := u.listened[k]
	return ok
}

func (s *state) join(p Peer, req JoinRequest) {
	if s.byPeer[p] != nil {
		return // joinRoomFrontMessage sent twice
	}
	tabKey := req.UUID + "_" + req.TabID
	if req.TabID != "" {
		// The same browser tab reconnected: drop the stale connection now rather than show a ghost.
		if old := s.byTab[tabKey]; old != nil {
			s.leave(old)
			old.peer.Kick("A new connection from the same browser tab replaced this connection for user " + req.UUID + ".")
		}
	}
	duplicate := s.countUUID[req.UUID] > 0

	s.nextUserID++
	u := &user{
		id: s.nextUserID, peer: p, uuid: req.UUID, tabID: req.TabID, name: req.Name, textures: req.Textures,
		companion: req.Companion, visitCardURL: req.VisitCardURL, chatID: req.ChatID, status: req.Status,
		pos: req.Position, listened: map[zoneKey]*zone{},
	}
	p.Send(NewMsg(RoomJoined{UserID: u.id}, false))

	s.users[u.id] = u
	s.byPeer[p] = u
	s.countUUID[u.uuid]++
	if s.firstByUUID[u.uuid] == nil {
		s.firstByUUID[u.uuid] = u
	}
	if u.tabID != "" {
		s.byTab[tabKey] = u
	}
	s.userIndex.set(u, float64(u.pos.X), float64(u.pos.Y))
	s.userEnters(u, s.zone(userZoneKey(u.pos)), nil)
	s.updateUserGroup(u)
	if duplicate {
		p.Send(NewMsg(DuplicateUserConnected{}, false))
	}
	s.setViewport(u, req.Viewport)
}

func (s *state) leave(u *user) {
	if u.group != nil {
		s.leaveGroup(u)
	}
	delete(s.users, u.id)
	delete(s.byPeer, u.peer)
	if s.countUUID[u.uuid]--; s.countUUID[u.uuid] <= 0 {
		delete(s.countUUID, u.uuid)
	}
	if s.firstByUUID[u.uuid] == u {
		delete(s.firstByUUID, u.uuid)
		for _, other := range s.users {
			if other.uuid == u.uuid {
				s.firstByUUID[u.uuid] = other
				break
			}
		}
	}
	if u.tabID != "" && s.byTab[u.uuid+"_"+u.tabID] == u {
		delete(s.byTab, u.uuid+"_"+u.tabID)
	}
	s.userIndex.remove(u)
	z := u.zone
	s.userLeaves(u, z, nil)
	s.gcZone(z)
	for _, l := range u.listened {
		delete(l.listeners, u)
		s.gcZone(l)
	}
	u.listened = nil
}

func (s *state) move(u *user, pos Position) {
	old := u.zone
	u.pos = pos
	s.userIndex.set(u, float64(pos.X), float64(pos.Y))
	if k := userZoneKey(pos); k != old.key {
		nz := s.zone(k)
		s.userLeaves(u, old, nz)
		s.userEnters(u, nz, old)
		s.gcZone(old)
	} else {
		s.userMovesInZone(u)
	}
	s.updateUserGroup(u)
}

func (s *state) setPlayerDetails(u *user, d PlayerDetails) {
	wasSilent := u.status.Silent()

	if d.RemoveOutlineColor != nil && *d.RemoveOutlineColor {
		u.outline = nil
	} else if d.OutlineColor != nil {
		c := *d.OutlineColor
		u.outline = &c
	}
	if d.AvailabilityStatus != StatusUnchanged {
		u.status = d.AvailabilityStatus
	}
	if d.ChatID != nil {
		id := *d.ChatID
		u.chatID = &id
	}
	if v := d.SetVariable; v != nil {
		// ponytail: public variables only live in memory; Redis persistence, TTL and WORLD scope come with J3.
		vars := make(map[string]string, len(u.vars)+1)
		for k, val := range u.vars {
			vars[k] = val
		}
		if v.Public {
			vars[v.Name] = v.Value
		} else {
			delete(vars, v.Name)
		}
		u.vars = vars
	}
	if d.Say != nil {
		if d.Say.Message != "" {
			say := *d.Say
			u.say = &say
		} else {
			u.say = nil
		}
	}

	// A private variable must not leave the server.
	if d.SetVariable == nil || d.SetVariable.Public {
		m := NewMsg(PlayerDetailsUpdated{UserID: u.id, Details: d}, true)
		for l := range u.zone.listeners {
			if l != u {
				l.peer.Send(m)
			}
		}
	}

	if u.group != nil && u.status.Silent() {
		s.leaveGroup(u)
	} else if wasSilent && !u.status.Silent() {
		// Back from a silent status: join whoever is next to us without waiting for a move.
		s.updateUserGroup(u)
	}
}
