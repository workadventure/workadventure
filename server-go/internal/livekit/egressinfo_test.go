package livekit

import (
	"testing"
	"time"

	lkp "github.com/livekit/protocol/livekit"
)

func TestAnEndedEgressTellsItsTimesAndFiles(t *testing.T) {
	got := info(&lkp.EgressInfo{EgressId: "EG_1", Status: lkp.EgressStatus_EGRESS_COMPLETE, StartedAt: 1700000000000000000,
		EndedAt: 1700000061500000000, FileResults: []*lkp.FileInfo{{Filename: "r/a.mp4", Size: 12345, Duration: 61500000000}}})
	if got.Status != "EGRESS_COMPLETE" || got.EndedAt.Sub(got.StartedAt) != 61500*time.Millisecond ||
		len(got.Files) != 1 || got.Files[0].SizeBytes != 12345 || got.Files[0].Duration != 61500*time.Millisecond {
		t.Fatalf("%+v", got)
	}
	failed := info(&lkp.EgressInfo{EgressId: "EG_2", Status: lkp.EgressStatus_EGRESS_FAILED, Error: "boom"})
	if failed.Status != "EGRESS_FAILED" || !failed.StartedAt.IsZero() || failed.Error != "boom" {
		t.Fatalf("%+v", failed)
	}
}
