// Package spacestate holds the state the members of a space share (raised hands, floor, recording, polls,
// questions). The types and their Validate methods are generated from the zod schema the front parses every
// state with (libs/shared-utils/src/SpaceState/SpaceState.ts): a state that passes Validate is one the front
// accepts.
package spacestate

// The types are generated (server-go/schemas, go generate there); validate.go checks a state against the schema.

// Empty is emptySpaceState(): collections are empty, never null.
func Empty() SpaceState {
	return SpaceState{
		RaisedHands: []RaisedHandEntry{}, FloorHolders: []FloorHolderEntry{},
		Recording: RecordingState{Status: RecordingStatusIdle},
		Polls:     map[string]ProximityPoll{}, Questions: map[string]ProximityQuestion{},
	}
}
