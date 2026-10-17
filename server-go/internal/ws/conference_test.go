package ws

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/golang-jwt/jwt/v5"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// The expected values come from the TS code itself (shared-utils, bigbluebutton-js 0.2.0), run with node.
func TestSlugsHashesAndBBBURLsAreTheTSOnes(t *testing.T) {
	if got := slugifyJitsiRoomName("Salle Réunion 1", roomURL, false); got != "vg2cb-salle-reunion-1" {
		t.Fatal(got)
	}
	if slugify("Été  à Paris!") != "ete-a-paris" || shortHash("😀x") != "wpzed" {
		t.Fatal(slugify("Été  à Paris!"), shortHash("😀x"))
	}
	create := bbbURL("https://bbb.test/bigbluebutton", "s3cret", "create", [][2]string{{"attendeePW", "a"}, {"moderatorPW", "m"},
		{"record", "true"}, {"meta_worka-room-url", roomURL}, {"name", "Réunion 1"}, {"meetingID", "m-1"}})
	if create != "https://bbb.test/bigbluebutton/api/create?attendeePW=a&moderatorPW=m&record=true&meta_worka-room-url=http%3A%2F%2Fplay.test%2F_%2Fglobal%2Fmaps.test%2Ftests%2FE2E%2Fempty.json&name=R%C3%A9union%201&meetingID=m-1&checksum=713ebf94bdf93ebf5f417e13c8c0f8bf409dccc0" {
		t.Fatal(create)
	}
	join := bbbURL("https://bbb.test/bigbluebutton", "s3cret", "join", [][2]string{{"userID", "7"}, {"joinViaHtml5", "true"},
		{"fullName", "Alice B"}, {"meetingID", "m-1"}, {"password", "m"}})
	if !strings.HasSuffix(join, "fullName=Alice%20B&meetingID=m-1&password=m&checksum=e53aca955125a1aba207d2ef36f553e8c6924d1d") {
		t.Fatal(join)
	}
}

func TestConferencesAndTheOAuthRefresh(t *testing.T) {
	h := newHarness(t)
	var created atomic.Int32
	bbb := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/create") && r.URL.Query().Get("checksum") != "" {
			created.Add(1)
		}
		_, _ = w.Write([]byte(`<response><returncode>SUCCESS</returncode></response>`))
	}))
	defer bbb.Close()
	h.srv.cfg.Jitsi.URL, h.srv.cfg.Jitsi.Secret, h.srv.cfg.Jitsi.ISS = "meet.test", "jitsi-secret", "wa"
	h.srv.cfg.BBB.URL, h.srv.cfg.BBB.Secret = bbb.URL+"/", "bbb-secret"
	alice := h.dial("alice", "c-alice", nil)
	alice.send(join(100, 100))
	alice.waitFor("roomJoined", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool { return d.GetRoomJoinedMessage() != nil })

	alice.query(1, &pb.QueryMessage{Query: &pb.QueryMessage_JitsiJwtQuery{JitsiJwtQuery: &pb.JitsiJwtQuery{JitsiRoom: "standup"}}})
	var signed string
	alice.waitFor("the Jitsi JWT", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		signed = d.GetAnswerMessage().GetJitsiJwtAnswer().GetJwt()
		return signed != ""
	})
	claims := jwt.MapClaims{}
	if _, err := jwt.ParseWithClaims(signed, claims, func(*jwt.Token) (any, error) { return []byte("jitsi-secret"), nil },
		jwt.WithAudience("jitsi"), jwt.WithIssuer("wa")); err != nil || claims["room"] != "standup" || claims["sub"] != "meet.test" || claims["moderator"] != false {
		t.Fatalf("%v %v", claims, err)
	}

	alice.query(2, &pb.QueryMessage{Query: &pb.QueryMessage_JoinBBBMeetingQuery{JoinBBBMeetingQuery: &pb.JoinBBBMeetingQuery{
		MeetingId: "m-1", LocalMeetingId: "local", MeetingName: "Room"}}})
	alice.waitFor("the BBB join URL", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		a := d.GetAnswerMessage().GetJoinBBBMeetingAnswer()
		return a != nil && a.GetMeetingId() == "m-1" && strings.HasPrefix(a.GetClientURL(), bbb.URL+"/api/join?userID=")
	})
	if created.Load() != 1 {
		t.Fatal("the meeting is created before anyone joins it")
	}

	alice.query(3, &pb.QueryMessage{Query: &pb.QueryMessage_OauthRefreshTokenQuery{OauthRefreshTokenQuery: &pb.OauthRefreshTokenQuery{TokenToRefresh: "t"}}})
	alice.waitFor("the refusal", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
		return strings.HasPrefix(d.GetAnswerMessage().GetError().GetMessage(), "The token refresh failed.")
	})
}
