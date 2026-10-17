package ws

import (
	"context"
	"crypto/hmac"
	"crypto/sha1" //nolint:gosec // BigBlueButton's checksum
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/text/unicode/norm"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// Jitsi and BigBlueButton (handleQueryJitsiJwtMessage, handleJoinBBBMeetingMessage of the back), and the OAuth
// refresh of the external modules (A17). The settings come from the admin's thirdParty, else from the environment.

type confSettings struct{ URL, ISS, Secret string }

func (s *Session) thirdParty(name string) (confSettings, bool) {
	if t, ok := s.srv.roomMap(s.info.roomID).thirdParty[name].(map[string]any); ok {
		c := confSettings{}
		c.URL, _ = t["url"].(string)
		c.ISS, _ = t["iss"].(string)
		c.Secret, _ = t["secret"].(string)
		return c, true
	}
	switch name {
	case "jitsi":
		j := s.srv.cfg.Jitsi
		return confSettings{j.URL, j.ISS, j.Secret}, j.URL != ""
	case "bbb":
		b := s.srv.cfg.BBB
		return confSettings{URL: b.URL, Secret: b.Secret}, b.URL != "" && b.Secret != ""
	}
	return confSettings{}, false
}

// name is the player's name, from its JoinRoomFrontMessage.
func (s *Session) playerName() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.name
}

func (s *Session) jitsiJWT(id int32, room string) {
	j, ok := s.thirdParty("jitsi")
	if !ok || j.Secret == "" {
		s.answerError(id, "You must set the SECRET_JITSI_KEY key to the secret to generate JWT tokens for Jitsi.")
		return
	}
	moderator := s.isAdmin()
	if !moderator {
		tag := s.moderatorTag(func(p map[string]any) (string, string) {
			name, _ := p["jitsiRoom"].(string)
			tag, _ := p["jitsiRoomAdminTag"].(string)
			_, noPrefix := p["jitsiNoPrefix"]
			if name == "" {
				return "", ""
			}
			return slugifyJitsiRoomName(name, s.info.roomID, noPrefix), tag
		}, true)[room]
		moderator = tag != "" && slices.Contains(s.info.member.Tags, tag)
	}
	claims := jwt.MapClaims{
		"context": map[string]any{
			"user":     map[string]any{"id": s.userID.Load(), "name": s.playerName(), "moderator": moderator},
			"features": map[string]any{"livestreaming": moderator, "recording": moderator},
		},
		"sub": j.URL, "room": room, "moderator": moderator, "aud": "jitsi", "exp": time.Now().Add(24 * time.Hour).Unix(),
	}
	if j.ISS != "" {
		claims["iss"] = j.ISS
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(j.Secret))
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_JitsiJwtAnswer{JitsiJwtAnswer: &pb.JitsiJwtAnswer{Jwt: signed, Url: j.URL}}})
}

func (s *Session) joinBBB(id int32, q *pb.JoinBBBMeetingQuery) {
	b, ok := s.thirdParty("bbb")
	if !ok {
		s.answerError(id, "Unable to join the conference because either the BBB_URL or BBB_SECRET environment variables are not set.")
		return
	}
	if b.Secret == "" {
		s.answerError(id, "You must set the SECRET_BBB_KEY key to the secret to generate JWT tokens for BBB.")
		return
	}
	moderator := s.isAdmin()
	if !moderator {
		tags := s.moderatorTag(func(p map[string]any) (string, string) {
			name, _ := p["bbbMeeting"].(string)
			tag, _ := p["bbbMeetingAdminTag"].(string)
			return name, tag
		}, false)
		tag, known := tags[q.GetLocalMeetingId()]
		moderator = !known || slices.Contains(s.info.member.Tags, tag) // a meeting without an admin tag: everyone moderates
	}
	password := func(role string) string {
		m := hmac.New(sha256.New, []byte(b.Secret))
		m.Write([]byte(role + "-" + q.GetMeetingId()))
		return hex.EncodeToString(m.Sum(nil))[:50]
	}
	attendee, mod := password("attendee"), password("moderator")
	host := strings.TrimSuffix(b.URL, "/")
	create := bbbURL(host, b.Secret, "create", [][2]string{{"attendeePW", attendee}, {"moderatorPW", mod}, {"record", "true"},
		{"meta_worka-room-url", s.info.roomID}, {"name", q.GetMeetingName()}, {"meetingID", q.GetMeetingId()}})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, create, nil)
	req.Header.Set("Accept", "text/xml, application/json, text/plain, */*")
	resp, err := embedClient.Do(req)
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	resp.Body.Close()
	pw := attendee
	if moderator {
		pw = mod
	}
	join := bbbURL(host, b.Secret, "join", [][2]string{{"userID", strconv.Itoa(int(s.userID.Load()))}, {"joinViaHtml5", "true"},
		{"fullName", s.playerName()}, {"meetingID", q.GetMeetingId()}, {"password", pw}})
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_JoinBBBMeetingAnswer{JoinBBBMeetingAnswer: &pb.JoinBBBMeetingAnswer{
		MeetingId: q.GetMeetingId(), ClientURL: join}}})
}

// bbbURL is bigbluebutton-js's constructUrl: the parameters in order, the checksum last.
func bbbURL(host, secret, action string, params [][2]string) string {
	parts := make([]string, len(params))
	for i, p := range params {
		parts[i] = qsEscape(p[0]) + "=" + qsEscape(p[1])
	}
	query := strings.Join(parts, "&")
	sum := sha1.Sum([]byte(action + query + secret)) //nolint:gosec // BigBlueButton's checksum
	return host + "/api/" + action + "?" + query + "&checksum=" + hex.EncodeToString(sum[:])
}

// qsEscape is Node's querystring.escape: encodeURIComponent.
func qsEscape(v string) string {
	var b strings.Builder
	for _, c := range []byte(v) {
		if c < 0x80 && (unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) || strings.ContainsRune("-_.!~*'()", rune(c))) {
			b.WriteByte(c)
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

// moderatorTag is ModeratorTagFinder: the admin tag of each conference of the map (tile layers, area objects,
// tiles), and of the Jitsi properties of the WAM when withWAM.
func (s *Session) moderatorTag(parse func(props map[string]any) (room, tag string), withWAM bool) map[string]string {
	out := map[string]string{}
	register := func(raw any) {
		list, _ := raw.([]any)
		props := map[string]any{}
		for _, p := range list {
			if m, _ := p.(map[string]any); m != nil {
				if name, _ := m["name"].(string); name != "" && m["value"] != nil {
					props[name] = m["value"]
				}
			}
		}
		if room, tag := parse(props); room != "" && tag != "" {
			out[room] = tag
		}
	}
	var tiled struct {
		Layers   []any `json:"layers"`
		Tilesets []struct {
			Tiles []struct {
				Properties any `json:"properties"`
			} `json:"tiles"`
		} `json:"tilesets"`
	}
	if data, err := s.srv.TiledMap(s.ctx, s.info.roomID); err == nil && json.Unmarshal(data, &tiled) == nil {
		var walk func(layers []any)
		walk = func(layers []any) {
			for _, l := range layers {
				layer, _ := l.(map[string]any)
				switch layer["type"] {
				case "objectgroup":
					objects, _ := layer["objects"].([]any)
					for _, o := range objects {
						if obj, _ := o.(map[string]any); obj["class"] == "area" || obj["type"] == "area" {
							register(obj["properties"])
						}
					}
				case "tilelayer":
					register(layer["properties"])
				case "group":
					inner, _ := layer["layers"].([]any)
					walk(inner)
				}
			}
		}
		walk(tiled.Layers)
		for _, ts := range tiled.Tilesets {
			for _, t := range ts.Tiles {
				if t.Properties != nil {
					register(t.Properties)
				}
			}
		}
	}
	if key := s.srv.mapKey(s.info.roomID); withWAM && key != "" {
		if data, err := s.srv.maps.Read(key); err == nil {
			var doc struct {
				Areas    []struct{ Properties []map[string]any }          `json:"areas"`
				Entities map[string]struct{ Properties []map[string]any } `json:"entities"`
			}
			if json.Unmarshal(data, &doc) == nil {
				var all [][]map[string]any
				for _, a := range doc.Areas {
					all = append(all, a.Properties)
				}
				for _, e := range doc.Entities {
					all = append(all, e.Properties)
				}
				for _, props := range all {
					for _, p := range props {
						if p["type"] != "jitsiRoomProperty" {
							continue
						}
						name, _ := p["roomName"].(string)
						tag, _ := p["jitsiRoomAdminTag"].(string)
						noPrefix, _ := p["noPrefix"].(bool)
						if tag != "" {
							out[slugifyJitsiRoomName(name, s.info.roomID, noPrefix)] = tag
						}
						break // the first jitsiRoomProperty of each area or entity
					}
				}
			}
		}
	}
	return out
}

var notSlug = regexp.MustCompile(`[^a-z0-9-_ ]`)
var spaces = regexp.MustCompile(`\s+`)

// slugify is shared-utils' slugify: accents dropped, lower case, dashes for spaces.
func slugify(v string) string {
	var b strings.Builder
	for _, r := range norm.NFD.String(v) {
		if r < 0x300 || r > 0x36f {
			b.WriteRune(r)
		}
	}
	return spaces.ReplaceAllString(notSlug.ReplaceAllString(strings.TrimSpace(strings.ToLower(b.String())), ""), "-")
}

func slugifyJitsiRoomName(name, roomID string, noPrefix bool) string {
	if noPrefix {
		return slugify(name)
	}
	return slugify(shortHash(roomID) + "-" + name)
}

// shortHash is shared-utils' shortHash: Java's String.hashCode, over UTF-16 units, in base 36.
func shortHash(s string) string {
	if s == "" {
		return ""
	}
	var h int32
	for _, c := range utf16Units(s) {
		h = (h << 5) - h + int32(c)
	}
	n := int64(h)
	if n < 0 {
		n = -n
	}
	return strconv.FormatInt(n, 36)
}

func utf16Units(s string) []uint16 {
	var out []uint16
	for _, r := range s {
		if r >= 0x10000 {
			r -= 0x10000
			out = append(out, uint16(0xD800+(r>>10)), uint16(0xDC00+(r&0x3FF)))
		} else {
			out = append(out, uint16(r))
		}
	}
	return out
}

func (s *Session) refreshOAuth(id int32, q *pb.OauthRefreshTokenQuery) {
	token, message, err := s.srv.admin.RefreshOAuthToken(s.ctx, q.GetTokenToRefresh(), q.GetProvider(), q.GetUserIdentifier())
	if err != nil {
		s.answerError(id, "The token refresh failed. Please try to login again to be connected 🙏")
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_OauthRefreshTokenAnswer{OauthRefreshTokenAnswer: &pb.OauthRefreshTokenAnswer{
		Token: token, Message: message}}})
}
