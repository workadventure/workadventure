package ws

import (
	"encoding/json"
	"log/slog"
	"math"
	"strconv"
	"sync"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/analytics"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// The pusher's side of the analytics (AnalyticsEventsQueue, AnalyticsReportMessageHandler, AnalyticsTimedEventTracker):
// what the front reports, signed with who the connection is, and the intervals the server measures.

// track queues an event of this connection; it is dropped before the join, when the world turned analytics off, or
// when its properties are too large.
func (s *Session) track(name, source, eventID string, at time.Time, properties map[string]any) {
	if s.srv.analytics == nil || !s.info.member.AnalyticsEventsEnabled {
		return
	}
	userID := s.userID.Load()
	if userID == 0 || s.info.userUUID == "" || s.info.member.World == "" || s.info.roomID == "" {
		return
	}
	if properties == nil {
		properties = map[string]any{}
	}
	if b, err := json.Marshal(properties); err != nil || len(b) > analytics.MaxPropertiesBytes {
		return
	}
	var ip *string
	if s.info.ipAddress != "" {
		ip = &s.info.ipAddress
	}
	tab := s.info.tabID
	s.srv.analytics.Enqueue(analytics.Event{
		EventName: name, Source: source, ClientEventTime: analytics.Time(at), PusherReceivedAt: analytics.Time(time.Now()),
		EventID: eventID, UserUUID: s.info.userUUID, UserID: &userID, SpaceUserID: s.spaceUserID(), ClientIP: ip,
		World: s.info.member.World, RoomID: s.info.roomID, TabID: &tab, Tags: s.info.member.Tags, Properties: properties,
	})
}

// stats holds the analytics intervals of a connection, created on first use.
type stats struct {
	mu      sync.Mutex
	tracker *analytics.Tracker
}

func (s *Session) timed() *analytics.Tracker {
	s.stats.mu.Lock()
	defer s.stats.mu.Unlock()
	if s.stats.tracker == nil {
		s.stats.tracker = analytics.NewTracker(s.info.tabID, func(name, id string, at time.Time, p map[string]any) {
			s.track(name, "pusher", id, at, p)
		})
	}
	return s.stats.tracker
}

// analyticsReport is an analyticsEventReportMessage.
func (s *Session) analyticsReport(r *pb.AnalyticsEventReportMessage) {
	if len(r.GetEvents()) > analytics.MaxEventsPerReport {
		return
	}
	for _, e := range r.GetEvents() {
		if e.GetSource() != "front" && e.GetSource() != "media" {
			continue
		}
		properties, _ := e.GetProperties().AsInterface().(map[string]any)
		switch e.GetEventName() {
		case "timed_event.open":
			s.openTimed(properties)
			continue
		case "timed_event.close":
			handle, _ := properties["handle"].(string)
			if handle == "" || len(handle) > 255 {
				continue
			}
			reason, _ := properties["endReason"].(string)
			s.timed().Close(handle, analytics.EndReason(reason), time.Now())
			continue
		}
		if !analytics.FromClient(e.GetEventName(), e.GetSource(), e.GetEventId(), e.GetClientEventTimeMs()) {
			continue
		}
		if properties == nil {
			properties = map[string]any{}
		}
		if err := analytics.ValidProperties(e.GetEventName(), properties); err != nil {
			slog.Debug("analytics event dropped: payload does not match the catalog", "event", e.GetEventName(), "error", err)
			continue
		}
		s.track(e.GetEventName(), e.GetSource(), e.GetEventId(), time.UnixMilli(int64(e.GetClientEventTimeMs())), properties)
	}
}

func (s *Session) openTimed(p map[string]any) {
	handle, _ := p["handle"].(string)
	name, _ := p["eventName"].(string)
	if handle == "" || len(handle) > 255 {
		return
	}
	if ok, byClient := analytics.IsTimed(name); !ok || !byClient {
		return
	}
	properties := map[string]any{}
	if raw, present := p["properties"]; present {
		var ok bool
		if properties, ok = raw.(map[string]any); !ok {
			return
		}
	}
	if b, err := json.Marshal(properties); err != nil || len(b) > analytics.MaxPropertiesBytes {
		return
	}
	if err := analytics.ValidOpenProperties(name, properties); err != nil {
		slog.Debug("timed event open dropped: payload does not match the catalog", "event", name, "error", err)
		return
	}
	s.timed().Open(handle, name, properties, time.Now())
}

// videoQuality is a videoQualityReportMessage: each sample becomes a media.video_quality.sample.
func (s *Session) videoQuality(r *pb.VideoQualityReportMessage) {
	for _, v := range r.GetSamples() {
		category := map[pb.VideoQualityStreamCategory]string{0: "video", 1: "screenSharing"}[v.StreamCategory]
		transport := map[pb.VideoQualityTransportType]string{0: "P2P", 1: "SFU"}[v.TransportType]
		if v.ClientEventTimeMs > 8.64e15 || v.StreamId == "" || category == "" || transport == "" || v.SpaceName == "" ||
			!finite(v.Fps, v.Jitter, v.BandwidthBytesPerSecond) {
			continue
		}
		if s.memberships.get(v.SpaceName) == nil {
			continue
		}
		direction := "inbound"
		if v.Direction == pb.VideoQualityStreamDirection_VIDEO_QUALITY_STREAM_DIRECTION_OUTBOUND {
			direction = "outbound"
		}
		var relayProtocol, limitation, encoder any
		if v.RelayProtocol != nil {
			if p := map[pb.VideoQualityRelayProtocol]string{0: "udp", 1: "tcp", 2: "tls"}[*v.RelayProtocol]; p != "" {
				relayProtocol = p
			}
		}
		if direction == "outbound" {
			if v.QualityLimitationReason != nil {
				if l := map[pb.VideoQualityLimitationReason]string{0: "none", 1: "cpu", 2: "bandwidth", 3: "other"}[*v.QualityLimitationReason]; l != "" {
					limitation = l
				}
			}
			encoder = orNil(v.EncoderImplementation)
		}
		var remoteSpaceUserID any
		if v.RemoteSpaceUserId != "" {
			remoteSpaceUserID = v.RemoteSpaceUserId
		}
		var fpsStdDev any
		if v.FpsStdDev != nil && finite(*v.FpsStdDev) {
			fpsStdDev = *v.FpsStdDev
		}
		var seq any
		seqOrTime := v.ClientEventTimeMs
		if v.SampleSeq != nil {
			seq, seqOrTime = *v.SampleSeq, *v.SampleSeq
		}
		props := map[string]any{
			"streamId": v.StreamId, "connectionId": orNil(v.ConnectionId), "sessionId": orNil(v.SessionId),
			"remoteUserUuid": orNil(v.RemoteUserUuid), "remoteSpaceUserId": remoteSpaceUserID, "spaceName": v.SpaceName,
			"streamCategory": category, "transportType": transport, "direction": direction, "relay": orNil(v.Relay),
			"relayProtocol": relayProtocol, "livekitServerUrl": orNil(v.LivekitServerUrl), "fps": v.Fps, "fpsStdDev": fpsStdDev,
			"jitter": v.Jitter, "bandwidthBytesPerSecond": v.BandwidthBytesPerSecond, "frameWidth": v.FrameWidth,
			"frameHeight": v.FrameHeight, "mimeType": orNil(v.MimeType), "qualityLimitationReason": limitation,
			"encoderImplementation": encoder, "sampleSeq": seq, "livekitRegion": orNil(nonEmpty(v.LivekitRegion)),
		}
		counterProps(v, direction, props)
		s.track("media.video_quality.sample", "pusher", s.info.userUUID+":"+v.StreamId+":"+strconv.FormatUint(seqOrTime, 10),
			time.UnixMilli(int64(v.ClientEventTimeMs)), props)
	}
}

// counterProps adds the playback (inbound) and sender (outbound) measures of a sample, as the TS pusher does: a
// value outside what a browser can report is dropped on its own.
func counterProps(v *pb.VideoQualitySampleMessage, direction string, props map[string]any) {
	inbound, outbound := direction == "inbound", direction == "outbound"
	props["roundTripTimeMs"] = plausible(inbound, v.RoundTripTimeMs, 60_000)
	for k, x := range map[string]struct {
		v   *float64
		max float64
	}{
		"captureFps": {v.CaptureFps, 240}, "captureTargetFps": {v.CaptureTargetFps, 240},
		"encodeMsPerFrame": {v.EncodeMsPerFrame, 10_000}, "cpuLimitedRatio": {v.CpuLimitedRatio, 1},
		"bandwidthLimitedRatio": {v.BandwidthLimitedRatio, 1}, "uploadRoundTripTimeMs": {v.UploadRoundTripTimeMs, 60_000},
		"uploadLossRatio": {v.UploadLossRatio, 1}, "availableOutgoingBitrate": {v.AvailableOutgoingBitrate, 10_000_000_000},
	} {
		props[k] = plausible(outbound, x.v, x.max)
	}
	// Inbound playback counters: worthless without their window, so an implausible window drops them all.
	measurable := inbound && v.WindowSeconds != nil && finite(*v.WindowSeconds) && *v.WindowSeconds > 0 && *v.WindowSeconds <= 300
	props["windowSeconds"] = plausible(measurable, v.WindowSeconds, 300)
	for k, x := range map[string]*float64{
		"freezeSeconds": v.FreezeSeconds, "pauseSeconds": v.PauseSeconds, "decodeSeconds": v.DecodeSeconds,
		"interFrameDelaySumSeconds": v.InterFrameDelaySumSeconds, "interFrameDelaySquaredSumSeconds": v.InterFrameDelaySquaredSumSeconds,
	} {
		props[k] = plausible(measurable, x, math.MaxFloat64)
	}
	for k, x := range map[string]*uint32{
		"framesDecoded": v.FramesDecoded, "framesDropped": v.FramesDropped, "freezeCount": v.FreezeCount,
		"pauseCount": v.PauseCount, "packetsReceived": v.PacketsReceived, "packetsLost": v.PacketsLost,
	} {
		if props[k] = nil; measurable && x != nil {
			props[k] = *x
		}
	}
}

// plausible is the value when wanted, finite and in [0, max], else nil (as the TS pusher's plausible()).
func plausible(wanted bool, v *float64, max float64) any {
	if !wanted || v == nil || !finite(*v) || *v < 0 || *v > max {
		return nil
	}
	return *v
}

func nonEmpty(s *string) *string {
	if s == nil || *s == "" {
		return nil
	}
	return s
}

func finite(xs ...float64) bool {
	for _, x := range xs {
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return false
		}
	}
	return true
}

// orNil is the value, or JSON null when the optional field is absent.
func orNil[T any](p *T) any {
	if p == nil {
		return nil
	}
	return *p
}

// closeTimed ends the intervals of the connection, the session last.
func (s *Session) closeTimed(reason string) {
	s.stats.mu.Lock()
	t := s.stats.tracker
	s.stats.mu.Unlock()
	if t != nil {
		t.CloseAll(reason, time.Now(), time.UnixMilli(s.t.lastActivity.Load()))
	}
}

// SetAnalytics gives the server the queue its connections report to (nil: none).
func (srv *Server) SetAnalytics(q *analytics.Queue) { srv.analytics = q }

// CloseAnalytics ends the intervals of every connection, before a shutdown drains the queue.
func (srv *Server) CloseAnalytics() {
	srv.sessions.Range(func(k, _ any) bool {
		k.(*Session).closeTimed("pusher_shutdown")
		return true
	})
}
