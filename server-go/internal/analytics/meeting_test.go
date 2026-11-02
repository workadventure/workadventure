package analytics

import (
	"testing"
	"time"
)

func newTestMeeting(kind string) (m *Meeting, rows *[]Event, clock *time.Time, transport *string) {
	var out []Event
	t0 := time.UnixMilli(1_700_000_000_000)
	tr := "WEBRTC"
	m = NewMeeting("org/w.bubble-1", "org/w", func() string { return kind }, func() string { return tr }, func(e Event) { out = append(out, e) })
	m.now = func() time.Time { return t0 }
	return m, &out, &t0, &tr
}

func join(m *Meeting, id string, active bool) {
	mb := member(id)
	m.Join(mb.UUID, mb.SpaceUserID, mb.RoomID, mb.Tags, active)
}

func member(id string) MeetingMember {
	return MeetingMember{UUID: "u-" + id, SpaceUserID: id, RoomID: "http://play/@/org/w/r", Tags: []string{"t"}}
}

func TestABubbleIsMeasuredFromItsSecondMemberToItsLastButOne(t *testing.T) {
	m, rows, clock, transport := newTestMeeting("bubble")
	t0 := *clock
	at := func(s int) { *clock = t0.Add(time.Duration(s) * time.Second) }
	join(m, "alice", true)
	if len(*rows) != 0 || m.session != nil {
		t.Fatal("alone is not a meeting")
	}
	join(m, "bob", true)
	at(10)
	*transport = "LIVEKIT"
	m.TransportChanged()
	at(20)
	join(m, "carol", true)
	at(30)
	m.Leave("bob")
	at(40)
	m.Leave("alice")
	if len(*rows) != 4 {
		t.Fatalf("three participations then the meeting: %d rows", len(*rows))
	}
	alice, bob, carol, meeting := (*rows)[0], (*rows)[1], (*rows)[2], (*rows)[3]
	if alice.EventName != "meeting.participation.ended" || alice.Properties["joinRank"] != 1 || alice.Properties["durationSeconds"] != 40.0 ||
		alice.Properties["webrtcSeconds"] != 10.0 || alice.Properties["livekitSeconds"] != 30.0 || alice.Properties["role"] != "speaker" ||
		alice.UserUUID != "u-alice" || alice.SpaceUserID != "alice" || alice.Source != "pusher" || alice.Properties["meetingId"] != "bubble-1" {
		t.Fatalf("alice: %+v", alice)
	}
	if bob.Properties["joinRank"] != 2 || bob.Properties["durationSeconds"] != 30.0 || bob.ClientEventTime != Time(t0.Add(30*time.Second)) {
		t.Fatalf("bob left at 30 s: %+v", bob)
	}
	if carol.Properties["joinRank"] != 3 || carol.Properties["durationSeconds"] != 20.0 || carol.Properties["webrtcSeconds"] != 0.0 {
		t.Fatalf("carol, still there when it ended: %+v", carol)
	}
	if meeting.EventName != "meeting.ended" || meeting.UserUUID != "" || meeting.SpaceUserID != "" || meeting.RoomID != "http://play/@/org/w/r" ||
		meeting.Properties["participantCount"] != 3 || meeting.Properties["peakParticipantCount"] != 3 || meeting.Properties["speakerCount"] != 3 ||
		meeting.Properties["durationSeconds"] != 40.0 || meeting.Properties["endReason"] != "closed" || len(meeting.EventID) != 64 {
		t.Fatalf("the meeting: %+v", meeting)
	}
	if m.Close("closed") {
		t.Fatal("nothing left to close")
	}
}

func TestABroadcastLastsWhileSomeoneSpeaks(t *testing.T) {
	m, rows, clock, _ := newTestMeeting("")
	t0 := *clock
	join(m, "speaker", false)
	join(m, "listener", false)
	m.SetActive("speaker", true)
	if m.session != nil {
		t.Fatal("no kind yet: nothing opens")
	}
	m.kind = func() string { return "megaphone" }
	m.KindChanged()
	*clock = t0.Add(5 * time.Second)
	m.SetActive("speaker", false)
	if len(*rows) != 3 {
		t.Fatalf("%d rows", len(*rows))
	}
	if (*rows)[0].Properties["role"] != "speaker" || (*rows)[0].Properties["airtimeSeconds"] != 5.0 || (*rows)[1].Properties["role"] != "listener" ||
		(*rows)[2].Properties["speakerCount"] != 1 {
		t.Fatalf("one speaker, one listener: %+v", *rows)
	}
	m.SetActive("speaker", true)
	if !m.Close("back_shutdown") || (*rows)[5].Properties["endReason"] != "back_shutdown" {
		t.Fatal("a shutdown ends the session it finds")
	}
}
