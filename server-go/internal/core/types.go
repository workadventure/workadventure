// Package core is the business core of the server: rooms, positions, zones and proximity bubbles. It knows
// nothing about WebSockets, protobuf or Redis. Clients are reached through the Peer port, and what the core
// tells them are plain Go events that an adapter encodes.
package core

import "sync"

// Direction a woka faces. Same numbering as PositionMessage.Direction.
type Direction int32

const (
	DirectionUp Direction = iota
	DirectionRight
	DirectionDown
	DirectionLeft
)

// Position of a player, in pixels.
type Position struct {
	X, Y      int32
	Direction Direction
	Moving    bool
}

// Viewport is the rectangle of the map a player sees, in pixels.
type Viewport struct {
	Left, Top, Right, Bottom int32
}

// AvailabilityStatus of a player. Same numbering as the AvailabilityStatus protobuf enum, so that adapters
// convert by value (a test in the WebSocket adapter checks the two stay aligned).
type AvailabilityStatus int32

const (
	StatusUnchanged AvailabilityStatus = iota
	StatusOnline
	StatusSilent
	StatusAway
	StatusJitsi
	StatusBBB
	StatusDenyProximityMeeting
	StatusSpeaker
	StatusBusy
	StatusDoNotDisturb
	StatusBackInAMoment
	StatusLivekit
	StatusListener
	StatusSoundBlocked
)

// Silent players never enter a proximity bubble (User.silent in the back).
func (s AvailabilityStatus) Silent() bool {
	switch s {
	case StatusDenyProximityMeeting, StatusSilent, StatusJitsi, StatusBBB, StatusSpeaker, StatusDoNotDisturb,
		StatusBackInAMoment, StatusLivekit, StatusListener, StatusSoundBlocked:
		return true
	}
	return false
}

// Texture of a woka layer or of a companion.
type Texture struct {
	ID, URL string
}

type SayType int32

// Say is a speech bubble or a thinking cloud above a woka.
type Say struct {
	Message string
	Type    SayType
}

type VariableScope int32

const (
	ScopeRoom VariableScope = iota
	ScopeWorld
)

// PlayerVariable is a variable a player sets on themselves through the scripting API.
type PlayerVariable struct {
	Name, Value     string
	Public, Persist bool
	TTL             *int32
	Scope           VariableScope
}

// PlayerDetails is a partial update of a player, relayed as-is to the players around (SetPlayerDetailsMessage).
// A nil field is "unchanged".
type PlayerDetails struct {
	OutlineColor       *uint32
	RemoveOutlineColor *bool
	ShowVoiceIndicator *bool
	AvailabilityStatus AvailabilityStatus
	SetVariable        *PlayerVariable
	ChatID             *string
	Say                *Say
}

// JoinRequest is what an authenticated client brings when it enters a room.
type JoinRequest struct {
	UUID         string
	TabID        string
	Name         string
	Textures     []Texture
	Companion    *Texture
	VisitCardURL string
	ChatID       *string
	Status       AvailabilityStatus
	Position     Position
	Viewport     Viewport
	Tags         []string
	IsLogged     bool
	IPAddress    string
	// PlayerVariables are its stored variables, read before the join.
	PlayerVariables []StoredVariable
}

// UserView is an immutable snapshot of a player, as seen by the players around.
type UserView struct {
	ID           int32
	UUID         string
	Name         string
	Textures     []Texture
	Companion    *Texture
	Position     Position
	Status       AvailabilityStatus
	VisitCardURL string
	OutlineColor *uint32
	Variables    map[string]string // public player variables; never mutated once shared
	ChatID       *string
	Say          *Say
}

// Events sent to clients. They are immutable once created, because one event is shared by every recipient.
type (
	// RoomJoined confirms the join and gives the player their id in the room.
	RoomJoined struct {
		UserID          int32
		Variables       []AreaVariable // the area variables when the player joined
		RoomVariables   []Variable     // the room variables it may read
		PlayerVariables []Variable     // its own stored variables
		Items           []ItemState    // the state of the interactive objects
	}
	UserJoined struct{ User UserView }
	UserMoved  struct {
		UserID   int32
		Position Position
	}
	UserLeft     struct{ UserID int32 }
	GroupUpdated struct {
		GroupID int32
		X, Y    int32
		Size    int32
		Locked  bool
		UserIDs []int32
	}
	GroupDeleted      struct{ GroupID int32 }
	GroupUsersUpdated struct {
		GroupID int32
		UserIDs []int32
	}
	PlayerDetailsUpdated struct {
		UserID  int32
		Details PlayerDetails
	}
	// JoinSpaceRequest asks the client to join the space of the bubble it just entered.
	JoinSpaceRequest struct {
		SpaceName        string
		PropertiesToSync []string
	}
	LeaveSpaceRequest      struct{ SpaceName string }
	DuplicateUserConnected struct{}
	// MoveToPosition answers AskPosition (MOVE): walk to where the other player is.
	MoveToPosition struct{ Position Position }
	// LocatePosition answers AskPosition (LOCATE): show where the other player is.
	LocatePosition struct {
		Position Position
		UserID   int32
		UUID     string
	}
)

// Msg is one event on its way to one or many clients. Adapters encode it once, on the first connection that
// needs the bytes, and every recipient shares them: a move seen by 300 players is marshalled once, not 300 times.
type Msg struct {
	Event Event
	// Batched messages wait up to 100 ms to be sent together (zone traffic, like the TS emitInBatch); the
	// others go out right away, after what is already batched.
	Batched bool

	once  sync.Once
	bytes []byte
}

func NewMsg(event Event, batched bool) *Msg { return &Msg{Event: event, Batched: batched} }

// Bytes returns the encoded message, encoding it on the first call. encode must give the same result for
// every recipient of a shared message.
func (m *Msg) Bytes(encode func(*Msg) []byte) []byte {
	m.once.Do(func() { m.bytes = encode(m) })
	return m.bytes
}

// Peer is the core's view of a connected client (port). Implementations must never block: the core calls them
// from a room's goroutine.
type Peer interface {
	Send(m *Msg)
	// Kick ends the client's session, for instance when the same browser tab connected again.
	Kick(reason string)
}
