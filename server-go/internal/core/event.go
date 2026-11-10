package core

import "encoding/json"

// Event is what the core sends to its Peers and its watchers: one of the core's own types, and nothing else (the
// interface is sealed). The adapters turn each into their wire format (internal/ws/codec.go). External is the one
// door left to an adapter, for the messages it makes for its own connection.
type Event interface{ coreEvent() }

// External is a message an adapter makes for its own client (an answer, an error, its pings): it never goes through
// a room or a space, which only send the core's events. Value is the adapter's own type.
type External struct{ Value any }

// ScriptingEvent is an event of the scripting API (WA.event.broadcast, player.sendEvent, the Room API, a global event).
// Data is JSON; SenderID is nil when no player sent it.
type ScriptingEvent struct {
	Name     string
	Data     json.RawMessage
	SenderID *int32
}

// ItemEvent is an interactive object's event (ItemEventMessage): its new state is kept for the players to come.
type ItemEvent struct {
	ItemID                           int32
	Event, StateJSON, ParametersJSON string
}

// EntityEvent is an event of an entity of the map (a sound it played): Event is opaque to the core, as the
// adapter encoded it.
type EntityEvent struct {
	EntityID string
	Event    []byte
}

// WorldFullWarning tells the players that their world reached its capacity (the admin's warning).
type WorldFullWarning struct{}

// ModuleMessage is a message of an external module (the calendar…) to one player: Message is JSON.
type ModuleMessage struct {
	ModuleID              string
	RecipientUUID, RoomID *string
	Message               json.RawMessage
}

// PrivateEvent is what a SpacePrivateEvent carries: sealed like Event.
type PrivateEvent interface{ privateEvent() }

func (External) coreEvent()               {}
func (ScriptingEvent) coreEvent()         {}
func (ItemEvent) coreEvent()              {}
func (EntityEvent) coreEvent()            {}
func (WorldFullWarning) coreEvent()       {}
func (ModuleMessage) coreEvent()          {}
func (AreaVariableChanged) coreEvent()    {}
func (DuplicateUserConnected) coreEvent() {}
func (Ejected) coreEvent()                {}
func (EmoteEvent) coreEvent()             {}
func (FollowAborted) coreEvent()          {}
func (FollowConfirmed) coreEvent()        {}
func (FollowRequested) coreEvent()        {}
func (GroupDeleted) coreEvent()           {}
func (GroupUpdated) coreEvent()           {}
func (GroupUsersUpdated) coreEvent()      {}
func (InvitationAnswered) coreEvent()     {}
func (InvitationClosed) coreEvent()       {}
func (InvitationReceived) coreEvent()     {}
func (InvitationTooHigh) coreEvent()      {}
func (JoinSpaceRequest) coreEvent()       {}
func (LeaveSpaceRequest) coreEvent()      {}
func (LocatePosition) coreEvent()         {}
func (MapDeleted) coreEvent()             {}
func (MapEdit) coreEvent()                {}
func (MapReplaced) coreEvent()            {}
func (MemberJoined) coreEvent()           {}
func (MemberLeft) coreEvent()             {}
func (MoveToPosition) coreEvent()         {}
func (PlayerDetailsUpdated) coreEvent()   {}
func (RoomError) coreEvent()              {}
func (RoomJoined) coreEvent()             {}
func (SpaceMetadataUpdated) coreEvent()   {}
func (SpacePrivateEvent) coreEvent()      {}
func (SpacePublicEvent) coreEvent()       {}
func (SpaceStatePatch) coreEvent()        {}
func (SpaceUserAdded) coreEvent()         {}
func (SpaceUserRemoved) coreEvent()       {}
func (SpaceUserUpdated) coreEvent()       {}
func (SpaceUsersInit) coreEvent()         {}
func (UserJoined) coreEvent()             {}
func (UserLeft) coreEvent()               {}
func (UserMessage) coreEvent()            {}
func (UserMoved) coreEvent()              {}
func (VariableChanged) coreEvent()        {}

func (WebRTCStart) privateEvent()       {}
func (WebRTCDisconnect) privateEvent()  {}
func (SwitchStrategy) privateEvent()    {}
func (FinalizeSwitch) privateEvent()    {}
func (RelayedEvent) privateEvent()      {}
func (LiveKitInvitation) privateEvent() {}
func (LiveKitDisconnect) privateEvent() {}
