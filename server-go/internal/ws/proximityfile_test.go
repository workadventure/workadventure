package ws

import (
	"testing"

	"google.golang.org/protobuf/proto"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// The receiver of a file offer is shown the sender's own name, never the one the offer claims.
func TestAFileOfferCarriesTheSendersOwnName(t *testing.T) {
	h := newHarness(t)
	ids := map[string]string{}
	var alice, bob *client
	for _, name := range []string{"alice", "bob"} {
		c := h.dial(name, "c-"+name, nil)
		c.send(join(100, 100))
		c.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })
		c.query(7, &pb.QueryMessage{Query: &pb.QueryMessage_JoinSpaceQuery{JoinSpaceQuery: &pb.JoinSpaceQuery{SpaceName: "meeting"}}})
		c.waitFor("the join answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
			ids[name] = d.GetAnswerMessage().GetJoinSpaceAnswer().GetSpaceUserId()
			return ids[name] != ""
		})
		if name == "alice" {
			alice = c
		} else {
			bob = c
		}
	}
	alice.send(&pb.ClientToServerMessage{Message: &pb.ClientToServerMessage_PrivateEvent{PrivateEvent: &pb.PrivateEventFrontToPusher{
		SpaceName: "meeting", ReceiverUserId: ids["bob"], SpaceEvent: &pb.PrivateSpaceEvent{Event: &pb.PrivateSpaceEvent_ProximityFileTransferOffer{
			ProximityFileTransferOffer: &pb.ProximityFileTransferOfferMessage{TransferId: "t1", FileName: "a.pdf", Size: 3, Name: proto.String("the boss")}}}}}})
	bob.waitFor("the offer", func(_ *pb.ServerToClientMessage, s *pb.SubMessage) bool {
		o := s.GetPrivateEvent().GetSpaceEvent().GetProximityFileTransferOffer()
		if o != nil && o.GetName() != "bot" {
			t.Fatalf("offer from %q", o.GetName())
		}
		return o.GetTransferId() == "t1"
	})
}

func TestTheSampleCountersAreKeptOnlyWhenPlausible(t *testing.T) {
	f, u := proto.Float64, proto.Uint32
	in := map[string]any{}
	counterProps(&pb.VideoQualitySampleMessage{WindowSeconds: f(5), FramesDecoded: u(150), FreezeSeconds: f(-1),
		RoundTripTimeMs: f(40), CaptureFps: f(30)}, "inbound", in)
	if in["windowSeconds"] != 5.0 || in["framesDecoded"] != uint32(150) || in["freezeSeconds"] != nil ||
		in["roundTripTimeMs"] != 40.0 || in["captureFps"] != nil || in["packetsLost"] != nil {
		t.Fatalf("inbound: %v", in)
	}
	in = map[string]any{}
	counterProps(&pb.VideoQualitySampleMessage{WindowSeconds: f(301), FramesDecoded: u(150)}, "inbound", in)
	if in["windowSeconds"] != nil || in["framesDecoded"] != nil {
		t.Fatalf("an implausible window keeps counters: %v", in)
	}
	out := map[string]any{}
	counterProps(&pb.VideoQualitySampleMessage{CaptureFps: f(30), CpuLimitedRatio: f(2), WindowSeconds: f(5), RoundTripTimeMs: f(40)}, "outbound", out)
	if out["captureFps"] != 30.0 || out["cpuLimitedRatio"] != nil || out["windowSeconds"] != nil || out["roundTripTimeMs"] != nil || len(out) != 21 {
		t.Fatalf("outbound: %v (%d)", out, len(out))
	}
}
