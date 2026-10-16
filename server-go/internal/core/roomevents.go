package core

import (
	"context"
	"unicode/utf16"
)

// Events of the players that the room relays: emotes to those who see the sender's zone, the state of the
// interactive objects of the map (kept for those who join later), the events of the map's entities.

type (
	EmoteEvent struct {
		ActorUserID int32
		Emote       string
	}
	// ItemState is the last state of an interactive object of the Tiled map, as JSON.
	ItemState struct {
		ItemID    int32
		StateJSON string
	}
)

// maxEmoteLength is in UTF-16 code units, as the back counts (EmoteValidator.ts).
const maxEmoteLength = 32

// Emote relays an emote of p to the players that see its zone, if it is only emojis (the back drops anything else:
// it would otherwise put any text above a player's head).
func (r *Room) Emote(ctx context.Context, p Peer, emote string) error {
	if !validEmote(emote) {
		return nil
	}
	return r.a.Post(ctx, func() {
		u := r.s.byPeer[p]
		if u == nil || u.zone == nil {
			return
		}
		m := NewMsg(EmoteEvent{ActorUserID: u.id, Emote: emote}, true)
		for l := range u.zone.listeners {
			l.peer.Send(m)
		}
	})
}

// validEmote is EMOJI_ONLY_REGEXP, /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u. ponytail: Go's unicode
// tables have neither property; the ranges below cover the emoji blocks, the components (joiner, selectors,
// keycap, skin tones, tags, regional indicators) and the digits, # and * that Emoji_Component also holds.
func validEmote(e string) bool {
	if e == "" || len(utf16.Encode([]rune(e))) > maxEmoteLength {
		return false
	}
	for _, r := range e {
		switch {
		case r >= 0x1F000 && r <= 0x1FAFF, r >= 0x2600 && r <= 0x27BF, r >= 0x2300 && r <= 0x23FF, r >= 0x2B00 && r <= 0x2BFF,
			r >= 0x2190 && r <= 0x21FF, r >= 0x25A0 && r <= 0x25FF, r >= 0x2900 && r <= 0x297F, r >= 0xE0020 && r <= 0xE007F,
			r == 0x00A9, r == 0x00AE, r == 0x203C, r == 0x2049, r == 0x2122, r == 0x2139, r == 0x3030, r == 0x303D, r == 0x3297, r == 0x3299,
			r == 0x200D, r == 0x20E3, r == 0xFE0E, r == 0xFE0F, r >= '0' && r <= '9', r == '#', r == '*':
		default:
			return false
		}
	}
	return true
}

// ItemEvent relays the event of an interactive object to the whole room and keeps its state for the newcomers.
func (r *Room) ItemEvent(ctx context.Context, state ItemState, m *Msg) error {
	return r.a.Post(ctx, func() {
		r.s.items[state.ItemID] = state.StateJSON
		for _, u := range r.s.users {
			u.peer.Send(m)
		}
	})
}

func (s *state) itemStates() []ItemState {
	out := make([]ItemState, 0, len(s.items))
	for id, st := range s.items {
		out = append(out, ItemState{ItemID: id, StateJSON: st})
	}
	return out
}

// UserMessage is a message of an admin to the players (SendUserMessage): a text, or an audio message to play.
type UserMessage struct{ Type, Message string }

// SendUserMessage gives it to every player of the room.
func (r *Room) SendUserMessage(ctx context.Context, m UserMessage) error {
	return r.a.Post(ctx, func() {
		msg := NewMsg(m, false)
		for _, u := range r.s.users {
			u.peer.Send(msg)
		}
	})
}
