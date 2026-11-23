package analytics

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"slices"
	"strings"
	"time"
)

// Meeting is SessionAnalytics of the back: the conversations of one space, measured by the server. A session opens
// when enough members are active (two in a bubble or an area, one speaker in a megaphone or a speaker zone) and,
// when it closes, writes one meeting.participation.ended per participant then one meeting.ended. Not safe for
// concurrent use: the space's goroutine owns it.
type Meeting struct {
	id, world, meetingID string
	kind                 func() string // the space's kind ("" until the front says)
	transport            func() string // WEBRTC, LIVEKIT or NONE
	enqueue              func(Event)
	now                  func() time.Time

	members map[string]*meetingMember
	joined  []string // members in arrival order, for the join ranks
	active  int
	roomID  string
	session *meetingSession
}

// MeetingMember is who joined, as the rows name them.
type MeetingMember struct {
	UUID, SpaceUserID, RoomID string
	Tags                      []string
}

type meetingMember struct {
	MeetingMember
	active bool
}

type meetingSession struct {
	kind           string
	openedAt       time.Time
	transports     []segment
	participations map[string]*participation
	order          []string
	present, peak  int
}

type segment struct {
	transport string
	from      time.Time
}

type participation struct {
	member    MeetingMember
	joinRank  int
	startedAt time.Time
	endedAt   *time.Time
	onAir     *time.Time
	airtime   time.Duration
	spoke     bool
}

var minActive = map[string]int{"bubble": 2, "area": 2, "megaphone": 1, "speaker_zone": 1}

// NewMeeting measures the space id (its full name, world prefixed) of world.
func NewMeeting(id, world string, kind, transport func() string, enqueue func(Event)) *Meeting {
	return &Meeting{id: id, world: world, meetingID: strings.TrimPrefix(id, world+"."), kind: kind, transport: transport,
		enqueue: enqueue, now: time.Now, members: map[string]*meetingMember{}}
}

func (m *Meeting) KindChanged() { m.sync() }

func (m *Meeting) TransportChanged() {
	if m.session == nil {
		return
	}
	t := m.transport()
	if last := m.session.transports[len(m.session.transports)-1]; last.transport == t {
		return
	}
	m.session.transports = append(m.session.transports, segment{t, m.now()})
}

// Join counts a member present; active is whether it counts towards opening a session (a speaker, in a broadcast).
// With the methods below, it makes Meeting the core.MeetingReporter of a space.
func (m *Meeting) Join(uuid, spaceUserID, roomID string, tags []string, active bool) {
	mb := MeetingMember{UUID: uuid, SpaceUserID: spaceUserID, RoomID: roomID, Tags: tags}
	if m.members[mb.SpaceUserID] != nil {
		return
	}
	if m.roomID == "" {
		m.roomID = mb.RoomID
	}
	m.members[mb.SpaceUserID] = &meetingMember{mb, active}
	m.joined = append(m.joined, mb.SpaceUserID)
	if active {
		m.active++
	}
	if m.session != nil {
		m.addParticipation(mb.SpaceUserID)
	}
	m.sync()
}

func (m *Meeting) SetActive(id string, active bool) {
	e := m.members[id]
	if e == nil || e.active == active {
		return
	}
	e.active = active
	if active {
		m.active++
	} else {
		m.active--
	}
	if m.session != nil {
		if p := m.session.participations[id]; p != nil {
			if active {
				m.onAir(p)
			} else {
				m.offAir(p)
			}
		}
	}
	m.sync()
}

func (m *Meeting) Leave(id string) {
	e := m.members[id]
	if e == nil {
		return
	}
	delete(m.members, id)
	m.joined = slices.DeleteFunc(m.joined, func(j string) bool { return j == id })
	if e.active {
		m.active--
	}
	if m.session != nil {
		if p := m.session.participations[id]; p != nil && p.endedAt == nil {
			m.offAir(p)
			now := m.now()
			p.endedAt = &now
			m.session.present--
		}
	}
	m.sync()
}

// Close ends the open session, if any ("closed", or "back_shutdown" for a shutdown), and says whether there was one.
func (m *Meeting) Close(reason string) bool {
	s := m.session
	if s == nil {
		return false
	}
	m.session = nil
	end := m.now()
	interval := func(p map[string]any, from, at time.Time) map[string]any {
		p["startedAt"], p["endedAt"], p["endReason"] = Time(from), Time(at), reason
		p["durationSeconds"] = max(0, seconds(at.Sub(from)))
		web, lk := s.transportSeconds(from, at)
		p["webrtcSeconds"], p["livekitSeconds"] = web, lk
		return p
	}
	speakers := 0
	for _, id := range s.order {
		p := s.participations[id]
		m.offAir(p)
		at := end
		if p.endedAt != nil {
			at = *p.endedAt
		}
		role := "listener"
		if p.spoke {
			speakers++
			role = "speaker"
		}
		mb := p.member
		m.enqueue(m.row("meeting.participation.ended", &mb, at, eventIDOf(m.id, s.openedAt.UnixMilli(), mb.SpaceUserID), interval(map[string]any{
			"meetingId": m.meetingID, "meetingKind": s.kind, "joinRank": p.joinRank, "role": role, "airtimeSeconds": seconds(p.airtime),
		}, p.startedAt, at)))
	}
	m.enqueue(m.row("meeting.ended", nil, end, eventIDOf(m.id, s.openedAt.UnixMilli()), interval(map[string]any{
		"meetingId": m.meetingID, "meetingKind": s.kind, "participantCount": len(s.participations), "peakParticipantCount": s.peak,
		"speakerCount": speakers,
	}, s.openedAt, end)))
	return true
}

func (m *Meeting) sync() {
	kind := m.kind()
	need, known := minActive[kind]
	wanted := known && m.active >= need
	if wanted && m.session == nil {
		now := m.now()
		m.session = &meetingSession{kind: kind, openedAt: now, transports: []segment{{m.transport(), now}}, participations: map[string]*participation{}}
		for _, id := range m.joined {
			m.addParticipation(id)
		}
	} else if !wanted && m.session != nil {
		m.Close("closed")
	}
}

func (m *Meeting) addParticipation(id string) {
	s, e := m.session, m.members[id]
	if s == nil || e == nil {
		return
	}
	s.present++
	s.peak = max(s.peak, s.present)
	p := &participation{member: e.MeetingMember, joinRank: len(s.participations) + 1, startedAt: m.now()}
	if e.active {
		m.onAir(p)
	}
	s.participations[id] = p
	s.order = append(s.order, id)
}

func (m *Meeting) onAir(p *participation) {
	if p.onAir == nil {
		now := m.now()
		p.onAir = &now
	}
	p.spoke = true
}

func (m *Meeting) offAir(p *participation) {
	if p.onAir != nil {
		p.airtime += m.now().Sub(*p.onAir)
		p.onAir = nil
	}
}

func (s *meetingSession) transportSeconds(from, to time.Time) (webrtc, livekit float64) {
	for i, seg := range s.transports {
		segEnd := to
		if i+1 < len(s.transports) {
			segEnd = s.transports[i+1].from
		}
		overlap := minTime(segEnd, to).Sub(maxTime(seg.from, from))
		if overlap <= 0 {
			continue
		}
		switch seg.transport {
		case "WEBRTC":
			webrtc += seconds(overlap)
		case "LIVEKIT":
			livekit += seconds(overlap)
		}
	}
	return webrtc, livekit
}

func minTime(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}

func maxTime(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}

func seconds(d time.Duration) float64 { return float64(d.Milliseconds()) / 1000 }

func (m *Meeting) row(name string, mb *MeetingMember, at time.Time, id string, p map[string]any) Event {
	e := Event{EventName: name, Source: "pusher", ClientEventTime: Time(at), PusherReceivedAt: Time(at), EventID: id,
		World: m.world, RoomID: m.roomID, Tags: []string{}, Properties: p}
	if mb != nil {
		e.UserUUID, e.SpaceUserID, e.RoomID, e.Tags = mb.UUID, mb.SpaceUserID, mb.RoomID, mb.Tags
	}
	return e
}

func eventIDOf(parts ...any) string {
	s := make([]string, len(parts))
	for i, p := range parts {
		s[i] = fmt.Sprint(p)
	}
	sum := sha256.Sum256([]byte(strings.Join(s, ":")))
	return hex.EncodeToString(sum[:])
}
