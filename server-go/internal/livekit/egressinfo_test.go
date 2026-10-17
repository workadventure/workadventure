package livekit

import (
	"encoding/json"
	"testing"
	"time"
)

func TestAnEndedEgressTellsItsTimesAndFiles(t *testing.T) {
	var i egressInfo
	if err := json.Unmarshal([]byte(`{"egressId":"EG_1","status":"EGRESS_COMPLETE","startedAt":"1700000000000000000",
		"endedAt":"1700000061500000000","fileResults":[{"filename":"r/a.mp4","size":"12345","duration":"61500000000"}]}`), &i); err != nil {
		t.Fatal(err)
	}
	info := i.info()
	if info.Status != "EGRESS_COMPLETE" || info.EndedAt.Sub(info.StartedAt) != 61500*time.Millisecond ||
		len(info.Files) != 1 || info.Files[0].SizeBytes != 12345 || info.Files[0].Duration != 61500*time.Millisecond {
		t.Fatalf("%+v", info)
	}
	var failed egressInfo
	if err := json.Unmarshal([]byte(`{"egress_id":"EG_2","status":4,"error":"boom"}`), &failed); err != nil || failed.info().Status != "EGRESS_FAILED" ||
		!failed.info().StartedAt.IsZero() || failed.info().Error != "boom" {
		t.Fatalf("%v %+v", err, failed.info())
	}
}
