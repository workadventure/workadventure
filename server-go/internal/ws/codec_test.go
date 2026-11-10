package ws

import (
	"testing"

	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// The core mirrors the protobuf enums by value; this catches a new value added on one side only.
func TestEnumsAreAligned(t *testing.T) {
	if len(pb.AvailabilityStatus_name) != int(core.StatusSoundBlocked)+1 {
		t.Fatalf("AvailabilityStatus has %d values, core knows %d", len(pb.AvailabilityStatus_name), core.StatusSoundBlocked+1)
	}
	pairs := map[core.AvailabilityStatus]pb.AvailabilityStatus{
		core.StatusOnline: pb.AvailabilityStatus_ONLINE, core.StatusDoNotDisturb: pb.AvailabilityStatus_DO_NOT_DISTURB,
		core.StatusBackInAMoment: pb.AvailabilityStatus_BACK_IN_A_MOMENT, core.StatusSoundBlocked: pb.AvailabilityStatus_SOUND_BLOCKED,
		core.StatusListener: pb.AvailabilityStatus_LISTENER, core.StatusLivekit: pb.AvailabilityStatus_LIVEKIT,
	}
	for c, p := range pairs {
		if int32(c) != int32(p) {
			t.Errorf("%v != %v", c, p)
		}
	}
	if int32(core.DirectionLeft) != int32(pb.PositionMessage_LEFT) || int32(core.ScopeWorld) != int32(pb.SetPlayerVariableMessage_WORLD) {
		t.Error("Direction or Scope drifted")
	}
}

// A batch built from shared entries must decode exactly like one marshalled by protobuf.
func TestBatchFrameIsValidProtobuf(t *testing.T) {
	moved := core.NewMsg(core.UserMoved{UserID: 7, Position: core.Position{X: 10, Y: 20, Direction: core.DirectionLeft, Moving: true}}, true)
	left := core.NewMsg(core.UserLeft{UserID: 8}, true)
	frame := batchFrame(42, [][]byte{moved.Bytes(encodeShared), left.Bytes(encodeShared)})

	var got pb.PusherToFrontWebSocketMessage
	if err := proto.Unmarshal(frame, &got); err != nil {
		t.Fatal(err)
	}
	want := &pb.PusherToFrontWebSocketMessage{Nonce: 42, Message: &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_BatchMessage{BatchMessage: &pb.BatchMessage{
		Payload: []*pb.SubMessage{subMessage(moved.Event), subMessage(left.Event)},
	}}}}
	if !proto.Equal(&got, want) {
		t.Fatalf("got %v\nwant %v", &got, want)
	}

	direct := core.NewMsg(core.JoinSpaceRequest{SpaceName: "s", PropertiesToSync: []string{"cameraState"}}, false)
	var got2 pb.PusherToFrontWebSocketMessage
	if err := proto.Unmarshal(directFrame(43, direct.Bytes(encodeShared)), &got2); err != nil || got2.Nonce != 43 || got2.Message.GetJoinSpaceRequestMessage().GetSpaceName() != "s" {
		t.Fatalf("direct frame: %v %v", &got2, err)
	}
}

func TestPlayerDetailsRoundTrip(t *testing.T) {
	in := &pb.SetPlayerDetailsMessage{AvailabilityStatus: pb.AvailabilityStatus_BUSY, SayMessage: &pb.SayMessage{Message: "hi", Type: pb.SayMessageType_ThinkingCloud}}
	if out := playerDetails(toPlayerDetails(in)); !proto.Equal(in, out) {
		t.Fatalf("got %v", out)
	}
}
