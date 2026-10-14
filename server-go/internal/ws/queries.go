package ws

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/protobuf/proto"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
)

// mapStorageJwt answers MapStorageJwtQuery: a token for /private/files of this map (SocketManager).
func (s *Session) mapStorageJwt(id int32) {
	key := mapKey(s.info.roomID)
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

var embedClient = &http.Client{Timeout: 5 * time.Second}

// embeddableWebsite answers EmbeddableWebsiteQuery: whether a page lets itself be shown in an iframe of the front.
// It fetches the page, off the read loop. ponytail: like the pusher, any URL a player gives is fetched (headers only).
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
	resp, err := fetch(ctx, http.MethodHead, raw)
	if err == nil && resp.StatusCode == http.StatusMethodNotAllowed {
		resp, err = fetch(ctx, http.MethodGet, raw)
	}
	switch {
	case err != nil:
		return false, false, "URL is not reachable"
	case resp.StatusCode == 999: // LinkedIn
		return true, false, ""
	case resp.StatusCode/100 == 2:
		front, _ := url.Parse(frontURL)
		return true, frameable(resp.Header, front.Hostname()), ""
	}
	return false, false, "URL is not reachable"
}

func fetch(ctx context.Context, method, raw string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, raw, nil)
	if err != nil {
		return nil, err
	}
	resp, err := embedClient.Do(req)
	if err != nil {
		return nil, err
	}
	resp.Body.Close() // the headers are all we read
	return resp, nil
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
