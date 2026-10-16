package admin

import (
	"bytes"
	"context"
	"os"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/config"
)

func local(t *testing.T) *Local {
	t.Helper()
	l, err := NewLocal(&config.Config{StartRoomURL: "/_/global/maps.workadventu.re/starter/map.json", OpidWokaNamePolicy: "user_input", FrontEnv: map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}
	return l
}

// The woka and companion lists are copies of play/src/pusher/data (go:embed cannot reach outside the module).
func TestEmbeddedDataMatchesThePusher(t *testing.T) {
	for _, name := range []string{"woka.json", "companions.json"} {
		want, err := os.ReadFile("../../../play/src/pusher/data/" + name)
		if err != nil {
			t.Skip("pusher sources not available:", err)
		}
		got, _ := os.ReadFile("data/" + name)
		if !bytes.Equal(got, want) {
			t.Errorf("internal/admin/data/%s differs from play/src/pusher/data/%s: copy it again", name, name)
		}
	}
}

func TestMemberTextures(t *testing.T) {
	l := local(t)
	m, err := l.MemberData(context.Background(), MemberQuery{Identifier: "u", PlayURI: "http://play.test/_/global/maps.test/a.json", CharacterTextureIDs: []string{"male1"}})
	if err != nil || !m.IsCharacterTexturesValid || len(m.CharacterTextures) != 1 || m.World != "http://play.test" {
		t.Fatalf("got %+v %v", m, err)
	}
	m, _ = l.MemberData(context.Background(), MemberQuery{Identifier: "u", PlayURI: "http://play.test/_/g/m", CharacterTextureIDs: []string{"nope"}, CompanionTextureID: "nope"})
	if m.IsCharacterTexturesValid || m.IsCompanionTextureValid {
		t.Fatalf("unknown textures must be invalid: %+v", m)
	}
}

func TestMapDetails(t *testing.T) {
	l := local(t)
	d, _ := l.MapDetails(context.Background(), "http://play.test/_/global/maps.test/tests/E2E/empty.json")
	if d["mapUrl"] != "http://maps.test/tests/E2E/empty.json" {
		t.Fatalf("got %v", d)
	}
	d, _ = l.MapDetails(context.Background(), "http://play.test/")
	if d["redirectUrl"] != "http://play.test/_/global/maps.workadventu.re/starter/map.json" {
		t.Fatalf("got %v", d)
	}
	d, _ = l.MapDetails(context.Background(), "http://play.test/nope")
	if d["code"] != "UNSUPPORTED_URL_FORMAT" {
		t.Fatalf("got %v", d)
	}
}

func TestNoRecordingIsOfferedWhileThisServerCannotRecord(t *testing.T) {
	l := local(t)
	l.cfg.RecordingConfigured = true // S3 is set, but there is no egress yet
	d, _ := l.MapDetails(context.Background(), "http://play.test/_/global/maps.test/tests/E2E/empty.json")
	m, _ := l.MemberData(context.Background(), MemberQuery{Identifier: "u", PlayURI: "http://play.test/_/global/maps.test/a.json", AccessToken: "t"})
	if d["recording"].(map[string]any)["buttonState"] != "hidden" || m.CanRecord {
		t.Fatalf("a button the server would always refuse: %v, canRecord %v", d["recording"], m.CanRecord)
	}
}
