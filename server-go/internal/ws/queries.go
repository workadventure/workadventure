package ws

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/netguard"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// mapStorageJwt answers MapStorageJwtQuery: a token for /private/files of this map (SocketManager).
func (s *Session) mapStorageJwt(id int32) {
	key := s.srv.mapKey(s.info.roomID)
	if key == "" {
		s.answerError(id, "This room has no map")
		return
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"wamUrl": strings.TrimRight(s.srv.cfg.PublicMapStorageURL, "/") + "/" + key, "tags": orStrings(s.info.member.Tags),
		"exp": time.Now().Add(time.Hour).Unix(),
	}).SignedString([]byte(s.srv.cfg.SecretKey))
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_MapStorageJwtAnswer{MapStorageJwtAnswer: &pb.MapStorageJwtAnswer{Jwt: token}}})
}

// embedClient only reaches public addresses: any player may ask for any URL (SSRF).
var embedClient = netguard.Client(5 * time.Second)

// embeddableWebsite answers EmbeddableWebsiteQuery: whether a page lets itself be shown in an iframe of the front.
// It fetches the page (headers only), off the read loop; an address of the server's own network is "not reachable"
// unless its domain is in EMBEDDED_DOMAINS_WHITELIST.
func (s *Session) embeddableWebsite(id int32, raw string) {
	go func() {
		state, ok, message := embeddable(s.ctx, raw, s.srv.cfg.FrontURL, s.srv.cfg.EmbeddedDomainsWhitelist)
		a := &pb.EmbeddableWebsiteAnswer{Url: raw, State: state, Embeddable: ok}
		if message != "" {
			a.Message = proto.String(message)
		}
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_EmbeddableWebsiteAnswer{EmbeddableWebsiteAnswer: a}})
	}()
}

func embeddable(ctx context.Context, raw, frontURL string, whitelist []string) (state, ok bool, message string) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return false, false, "URL is not reachable"
	}
	host := strings.ToLower(u.Hostname())
	for _, d := range whitelist {
		if d = strings.ToLower(strings.TrimSpace(d)); d != "" && (host == d || strings.HasSuffix(host, "."+d)) {
			return true, true, ""
		}
	}
	status, header, err := fetch(ctx, http.MethodHead, raw)
	if err == nil && status == http.StatusMethodNotAllowed {
		status, header, err = fetch(ctx, http.MethodGet, raw)
	}
	switch {
	case err != nil:
		return false, false, "URL is not reachable"
	case status == 999: // LinkedIn
		return true, false, ""
	case status/100 == 2:
		front, _ := url.Parse(frontURL)
		return true, frameable(header, front.Hostname()), ""
	}
	return false, false, "URL is not reachable"
}

// fetch asks for raw and returns its status and headers: they are all we read.
func fetch(ctx context.Context, method, raw string) (int, http.Header, error) {
	req, err := http.NewRequestWithContext(ctx, method, raw, nil)
	if err != nil {
		return 0, nil, err
	}
	resp, err := embedClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	_ = resp.Body.Close()
	return resp.StatusCode, resp.Header, nil
}

// frameable is isFrameable of the pusher: frame-ancestors of the CSP when there is one, X-Frame-Options otherwise.
func frameable(h http.Header, frontHost string) bool {
	for _, directive := range strings.Split(h.Get("Content-Security-Policy"), ";") {
		fields := strings.Fields(directive)
		if len(fields) == 0 || strings.ToLower(fields[0]) != "frame-ancestors" {
			continue
		}
		for _, src := range fields[1:] {
			if src == "*" || src == "https:" || hostMatches(src, frontHost) {
				return true
			}
		}
		return false
	}
	xfo := strings.ToLower(strings.TrimSpace(h.Get("X-Frame-Options")))
	return xfo != "deny" && xfo != "sameorigin"
}

func hostMatches(src, host string) bool {
	if i := strings.Index(src, "://"); i >= 0 {
		src = src[i+3:]
	}
	src, _, _ = strings.Cut(src, "/")
	if h, _, found := strings.Cut(src, ":"); found {
		src = h
	}
	if rest, wild := strings.CutPrefix(src, "*."); wild {
		return strings.HasSuffix(host, "."+rest)
	}
	return strings.EqualFold(src, host)
}

// roomsFromSameWorld answers RoomsFromSameWorldQuery: the maps stored next to this one (LocalAdmin lists
// map-storage's /maps). The exit editor offers them.
func (s *Session) roomsFromSameWorld(id int32) {
	if list, ok, err := s.srv.admin.SameWorld(s.ctx, s.info.roomID, s.info.member.Tags, false); ok {
		if err != nil {
			s.answerError(id, err.Error())
			return
		}
		rooms := make([]*pb.RoomShortDescription, 0, len(list))
		for _, r := range list {
			rooms = append(rooms, &pb.RoomShortDescription{Name: r.Name, RoomUrl: r.RoomURL, WamUrl: r.WamURL, Description: r.Description,
				Copyright: r.Copyright, Thumbnail: r.Thumbnail})
		}
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_RoomsFromSameWorldAnswer{RoomsFromSameWorldAnswer: &pb.RoomsFromSameWorldAnswer{RoomDescriptions: rooms}}})
		return
	}
	if s.srv.mapKey(s.info.roomID) == "" {
		s.answerError(id, "No admin backoffice set!")
		return
	}
	base := strings.TrimRight(s.srv.cfg.PublicMapStorageURL, "/") + "/"
	var rooms []*pb.RoomShortDescription
	for p, m := range s.srv.maps.Maps() {
		meta, _ := m["metadata"].(map[string]any)
		str := func(k string) *string {
			if v, ok := meta[k].(string); ok {
				return &v
			}
			return nil
		}
		name := p
		if n := str("name"); n != nil {
			name = *n
		}
		rooms = append(rooms, &pb.RoomShortDescription{Name: name, RoomUrl: "/~/" + p, WamUrl: proto.String(base + p),
			Description: str("description"), Copyright: str("copyright"), Thumbnail: str("thumbnail")})
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_RoomsFromSameWorldAnswer{RoomsFromSameWorldAnswer: &pb.RoomsFromSameWorldAnswer{RoomDescriptions: rooms}}})
}

func orStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
