package livekit

import (
	"context"
	"testing"
)

// Each world's LiveKit comes from the admin's credentials, for a play URI of that world; it records into the shared
// bucket only when there is one.
func TestEachWorldHasItsLiveKitFromTheAdmin(t *testing.T) {
	var asked string
	w := Worlds{Credentials: func(_ context.Context, playURI string) (string, string, string, error) {
		asked = playURI
		return "https://lk.world.test", "k", "s", nil
	}}
	if _, err := w.LiveKitFor(context.Background(), ""); err == nil {
		t.Fatal("a play URI is required to know the world")
	}
	lk, err := w.LiveKitFor(context.Background(), "https://play.test/@/org/w/r")
	if err != nil || asked != "https://play.test/@/org/w/r" || lk.URL() != "wss://lk.world.test" {
		t.Fatalf("%v %q %v", err, asked, lk)
	}
	if w.CanRecord() || w.EgressFor(lk) != nil {
		t.Fatal("no bucket: no recording")
	}
	w.Recordings = &S3{Bucket: "rec"}
	if !w.CanRecord() || w.EgressFor(lk) == nil {
		t.Fatal("with a bucket, the world's LiveKit records")
	}
}
