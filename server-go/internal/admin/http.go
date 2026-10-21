package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/config"
)

// HTTP is the SaaS admin (ADMIN_API_URL), asked as the pusher's AdminApi does (dev/contracts/admin-api.md). Local
// answers what the admin's capabilities leave to the server.
type HTTP struct {
	cfg    *config.Config
	local  *Local
	caps   map[string]string
	client *http.Client
}

// requestTimeout bounds every call to the admin. The TS servers set none (an admin that hangs held /me, the
// WebSocket and the page until TCP gave up); 10 s keeps a stuck admin from piling requests up.
const requestTimeout = 10 * time.Second

// NewHTTP reads the admin's capabilities first, trying again every ADMIN_API_RETRY_DELAY until it answers (A1):
// the server must not serve with capabilities it does not know.
func NewHTTP(ctx context.Context, cfg *config.Config, local *Local) (*HTTP, error) {
	a := &HTTP{cfg: cfg, local: local, client: &http.Client{Timeout: requestTimeout}}
	warned := false
	for {
		var caps map[string]any
		err := a.call(ctx, http.MethodGet, cfg.AdminAPIURL, "/api/capabilities", nil, false, "", nil, &caps)
		if err == nil {
			a.caps = map[string]string{}
			for k, v := range caps {
				if s, ok := v.(string); ok {
					a.caps[k] = s
				}
			}
			slog.Info("admin capabilities", "capabilities", a.caps)
			return a, nil
		}
		if !warned {
			slog.Warn("the admin does not answer /api/capabilities yet, trying again", "error", err)
			warned = true
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(cfg.AdminAPIRetryDelay):
		}
	}
}

func (a *HTTP) Capabilities() map[string]string { return a.caps }

func (a *HTTP) has(capability string) bool { return a.caps[capability] == "v1" }

// call does one request: base + path, the admin token unless anonymous, the query, a JSON body and answer.
func (a *HTTP) call(ctx context.Context, method, base, path string, query url.Values, withToken bool, locale string, body, out any) error {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	target := strings.TrimRight(base, "/") + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if withToken {
		req.Header.Set("Authorization", a.cfg.AdminAPIToken)
	}
	if locale != "" {
		req.Header.Set("Accept-Language", locale)
	}
	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("%s %s: %s", method, path, resp.Status)
	}
	if out == nil || len(bytes.TrimSpace(data)) == 0 {
		return nil
	}
	return json.Unmarshal(data, out)
}

func orEN(locale string) string {
	if locale == "" {
		return "en"
	}
	return locale
}

// isErrorAPI says whether an answer is an ErrorApiData of the given types.
func isErrorAPI(m map[string]any, types ...string) bool {
	if m["status"] != "error" {
		return false
	}
	t, _ := m["type"].(string)
	for _, want := range types {
		if t == want {
			return true
		}
	}
	return false
}

// MemberData is A3 (GET /api/room/access).
func (a *HTTP) MemberData(ctx context.Context, q MemberQuery) (MemberData, error) {
	query := url.Values{"userIdentifier": {q.Identifier}, "playUri": {q.PlayURI}, "ipAddress": {q.IPAddress}, "isLogged": {"0"}}
	for _, id := range q.CharacterTextureIDs {
		query.Add("characterTextureIds[]", id)
	}
	if q.CompanionTextureID != "" {
		query.Set("companionTextureId", q.CompanionTextureID)
	}
	if q.AccessToken != "" {
		query.Set("accessToken", q.AccessToken)
		query.Set("isLogged", "1")
	}
	if q.ChatID != "" {
		query.Set("chatID", q.ChatID)
	}
	var raw json.RawMessage
	if err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/room/access", query, true, orEN(q.Locale), nil, &raw); err != nil {
		return MemberData{}, refusal("ROOM_ACCESS_ERROR", "Connection error", err.Error())
	}
	var generic map[string]any
	if json.Unmarshal(raw, &generic) != nil {
		return MemberData{}, refusal("ROOM_ACCESS_VALIDATION", "Invalid answer", "The admin answered something that is not JSON")
	}
	if isErrorAPI(generic, "error", "retry", "redirect", "unauthorized") {
		return MemberData{}, &Refusal{Data: generic}
	}
	var m struct {
		MemberData
		AnalyticsEventsEnabled *bool `json:"analyticsEventsEnabled"`
	}
	if generic["status"] != "ok" || json.Unmarshal(raw, &m) != nil || m.UserUUID == "" || m.World == "" {
		return MemberData{}, refusal("ROOM_ACCESS_VALIDATION", "Invalid answer", "The admin's answer to /api/room/access does not follow the contract")
	}
	m.MemberData.AnalyticsEventsEnabled = m.AnalyticsEventsEnabled == nil || *m.AnalyticsEventsEnabled // on unless said otherwise
	if m.Tags == nil {
		m.Tags = []string{}
	}
	if m.CharacterTextures == nil {
		m.CharacterTextures = []Texture{}
	}
	if m.Applications == nil {
		m.Applications = []Application{}
	}
	return m.MemberData, nil
}

// MapDetails is A2 (GET /api/map): MapDetailsData, RoomRedirect or ErrorApiErrorData, or a local error.
func (a *HTTP) MapDetails(ctx context.Context, q MapQuery) (MapDetails, error) {
	raw, err := a.mapDetails(ctx, q)
	return Details(raw), err
}

func (a *HTTP) mapDetails(ctx context.Context, q MapQuery) (map[string]any, error) {
	query := url.Values{"playUri": {q.PlayURI}}
	if q.UserID != "" {
		query.Set("userId", q.UserID)
	}
	if q.AccessToken != "" {
		query.Set("accessToken", q.AccessToken)
	}
	var m map[string]any
	if err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/map", query, true, orEN(q.Locale), nil, &m); err != nil {
		return refusal("ROOM_ACCESS_ERROR", "Connection error", err.Error()).Data, nil
	}
	_, isRedirect := m["redirectUrl"].(string)
	_, hasGroup := m["group"]
	if !isRedirect && !hasGroup && !isErrorAPI(m, "error") {
		return refusal("MAP_VALIDATION", "Invalid answer", "The admin's answer to /api/map does not follow the contract").Data, nil
	}
	return m, nil
}

// WokaList is A19 with the api/woka/list capability, the local list otherwise.
func (a *HTTP) WokaList(ctx context.Context, roomURL, uuid string) (json.RawMessage, error) {
	return a.list(ctx, "api/woka/list", "/api/woka/list", roomURL, uuid, a.local.WokaList)
}

// CompanionList is A20 with the api/companion/list capability, the local list otherwise.
func (a *HTTP) CompanionList(ctx context.Context, roomURL, uuid string) (json.RawMessage, error) {
	return a.list(ctx, "api/companion/list", "/api/companion/list", roomURL, uuid, a.local.CompanionList)
}

func (a *HTTP) list(ctx context.Context, capability, path, roomURL, uuid string, local func(context.Context, string, string) (json.RawMessage, error)) (json.RawMessage, error) {
	if !a.has(capability) {
		return local(ctx, roomURL, uuid)
	}
	var raw json.RawMessage
	err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, path, url.Values{"roomUrl": {roomURL}, "uuid": {uuid}}, true, "", nil, &raw)
	return raw, err
}

// IceServers is A18 (on ADMIN_URL) with the api/ice-servers capability, generated here otherwise.
func (a *HTTP) IceServers(ctx context.Context, roomURL, uuid string, userID int32) ([]IceServer, error) {
	if !a.has("api/ice-servers") {
		return a.local.iceServers(userID), nil
	}
	if userID == 0 {
		return nil, errors.New("ICE servers before joining the room")
	}
	var list []struct {
		URLs       []string `json:"urls"`
		Username   string   `json:"username"`
		Credential string   `json:"credential"`
	}
	if err := a.call(ctx, http.MethodGet, a.cfg.AdminURL, "/api/ice-servers", url.Values{"roomUrl": {roomURL}, "userIdentifier": {uuid}}, true, "", nil, &list); err != nil {
		return nil, err
	}
	out := make([]IceServer, 0, len(list))
	for _, s := range list {
		out = append(out, IceServer{URLs: s.URLs, Username: s.Username, Credential: s.Credential})
	}
	return out, nil
}

// VerifyDomain is A21 with the api/domain/verify capability (any 2xx: valid), the host of PUSHER_URL otherwise.
func (a *HTTP) VerifyDomain(ctx context.Context, playURI string) bool {
	if !a.has("api/domain/verify") {
		return a.local.VerifyDomain(ctx, playURI)
	}
	return a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/domain/verify", url.Values{"uri": {playURI}}, true, "", nil, nil) == nil
}

// Report is A5; the answer is ignored.
func (a *HTTP) Report(ctx context.Context, r Report) error {
	return a.call(ctx, http.MethodPost, a.cfg.AdminAPIURL, "/api/report", nil, true, "en", map[string]string{"reportedUserUuid": r.ReportedUUID,
		"reportedUserComment": r.Comment, "reporterUserUuid": r.ReporterUUID, "reportWorldSlug": r.RoomURL}, nil)
}

// Ban is A7: a 2xx records it, unless its body says status "error".
func (a *HTTP) Ban(ctx context.Context, b Ban) error {
	body := map[string]string{"uuidToBan": b.UUID, "playUri": b.PlayURI, "name": b.Name, "message": b.Message, "byUserUuid": b.ByUUID}
	if b.IPAddress != "" {
		body["ipAddress"] = b.IPAddress
	}
	var answer map[string]any
	if err := a.call(ctx, http.MethodPost, a.cfg.AdminAPIURL, "/api/ban", nil, true, "", body, &answer); err != nil {
		slog.Warn("the admin did not record the ban", "error", err)
		return err
	}
	if answer["status"] == "error" {
		slog.Warn("the admin refused the ban", "answer", answer)
		return ErrBanRefused
	}
	return nil
}

// RoomTags is A8: any failure is no tag.
func (a *HTTP) RoomTags(ctx context.Context, roomURL string) []string {
	var tags []string
	if err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/room/tags", url.Values{"roomUrl": {roomURL}}, true, "", nil, &tags); err != nil {
		slog.Warn("room tags of the admin", "error", err)
	}
	if tags == nil {
		tags = []string{}
	}
	return tags
}

// SameWorld is A6; tags is present even empty, joined by commas.
func (a *HTTP) SameWorld(ctx context.Context, roomURL string, tags []string, bypassTagFilter bool) ([]RoomDescription, bool, error) {
	q := url.Values{"roomUrl": {roomURL}, "bypassTagFilter": {fmt.Sprint(bypassTagFilter)}, "tags": {strings.Join(tags, ",")}}
	var rooms []RoomDescription
	err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/room/sameWorld", q, true, "en", nil, &rooms)
	return rooms, true, err
}

// ChatMembers is A12 (playUri, though the OpenAPI says roomUrl).
func (a *HTTP) ChatMembers(ctx context.Context, roomURL, search string) (ChatMembers, error) {
	var m ChatMembers
	err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/chat/members", url.Values{"playUri": {roomURL}, "searchText": {search}}, true, "", nil, &m)
	return m, err
}

func (a *HTTP) SearchMembers(ctx context.Context, roomURL, search string) ([]Member, error) {
	var m []Member
	err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/members", url.Values{"playUri": {roomURL}, "searchText": {search}}, true, "", nil, &m)
	return m, err
}

// GetMember is A15; like the pusher, the uuid goes into the path as it is.
func (a *HTTP) GetMember(ctx context.Context, uuid string) (Member, error) {
	var m Member
	err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/members/"+uuid, nil, true, "", nil, &m)
	return m, err
}

// SearchTags is A14: /api/world/tags, whatever the OpenAPI says.
func (a *HTTP) SearchTags(ctx context.Context, roomURL, search string) ([]string, error) {
	var t []string
	err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/world/tags", url.Values{"playUri": {roomURL}, "searchText": {search}}, true, "", nil, &t)
	return t, err
}

// UpdateChatID is A16, on ADMIN_URL (not ADMIN_API_URL); the email of the message goes into the path as it is.
func (a *HTTP) UpdateChatID(ctx context.Context, email, chatID, roomURL string) error {
	return a.call(ctx, http.MethodPut, a.cfg.AdminURL, "/api/members/"+email+"/chatId", nil, true, "",
		map[string]string{"chatId": chatID, "userIdentifier": email, "roomUrl": roomURL}, nil)
}

// RefreshOAuthToken is A17, on ADMIN_URL; an answer without its message and token is an error.
func (a *HTTP) RefreshOAuthToken(ctx context.Context, token, provider, userIdentifier string) (string, string, error) {
	body := map[string]string{"accessToken": token}
	if provider != "" {
		body["provider"] = provider
	}
	if userIdentifier != "" {
		body["userIdentifier"] = userIdentifier
	}
	var out struct {
		Message *string `json:"message"`
		Token   *string `json:"token"`
	}
	if err := a.call(ctx, http.MethodPost, a.cfg.AdminURL, "/api/oauth/refreshtoken", nil, true, "", body, &out); err != nil {
		return "", "", err
	}
	if out.Message == nil || out.Token == nil {
		return "", "", errors.New("Unable to parse refreshTokenResponse")
	}
	return *out.Token, *out.Message, nil
}

// SaveUser is A9 (save-name), A10 (save-textures) and A11 (save-companion-texture): sent only when the admin
// offers the capability (api/save-textures covers the companion), and only a 204 is a success.
func (a *HTTP) SaveUser(ctx context.Context, what SaveWhat, userIdentifier, roomURL string, value any) error {
	s := saves[what]
	if _, ok := a.Capabilities()[s.capability]; !ok {
		return nil
	}
	b, err := json.Marshal(map[string]any{"playUri": roomURL, "userIdentifier": userIdentifier, s.field: value})
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(a.cfg.AdminAPIURL, "/")+s.path, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", a.cfg.AdminAPIToken)
	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	_ = resp.Body.Close() // only the status is read: a failed close loses nothing
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("%s: got %d, expected 204", s.path, resp.StatusCode)
	}
	return nil
}

var saves = map[SaveWhat]struct{ path, capability, field string }{
	SaveName:      {"/api/save-name", "api/save-name", "name"},
	SaveTextures:  {"/api/save-textures", "api/save-textures", "textures"},
	SaveCompanion: {"/api/save-companion-texture", "api/save-textures", "texture"},
}

// Challenge is A4: a web route of the admin, out of /api, without the token.
func (a *HTTP) Challenge(ctx context.Context, host string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(a.cfg.AdminAPIURL, "/")+"/white-label/cf-challenge?"+url.Values{"host": {host}}.Encode(), nil)
	if err != nil {
		return "", err
	}
	resp, err := a.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil || resp.StatusCode/100 != 2 {
		return "", fmt.Errorf("cf-challenge: %s %v", resp.Status, err)
	}
	// axios parses a JSON string; the admin answers the text
	var s string
	if json.Unmarshal(data, &s) == nil {
		return s, nil
	}
	return string(data), nil
}

// RecordingEvent is A23: an egress ended (RecordingEventPayload). Sent when the admin offers api/recordings/events
// v1, tried again 3 times (250 ms, 1 s, 4 s) on a network error, a 5xx, a 408 or a 429.
func (a *HTTP) RecordingEvent(ctx context.Context, payload any) error {
	if a.Capabilities()["api/recordings/events"] != "v1" {
		return nil
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	for attempt, wait := range []time.Duration{0, 250 * time.Millisecond, time.Second, 4 * time.Second} {
		if wait > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(wait):
			}
		}
		status, err := a.postStatus(ctx, strings.TrimRight(a.cfg.AdminAPIURL, "/")+"/api/recordings/events", body, 5*time.Second)
		switch {
		case err == nil && status/100 == 2:
			return nil
		case err == nil && status/100 == 4 && status != http.StatusRequestTimeout && status != http.StatusTooManyRequests:
			return fmt.Errorf("recordings/events: HTTP %d", status)
		case attempt == 3:
			if err == nil {
				err = fmt.Errorf("recordings/events: HTTP %d", status)
			}
			return err
		}
	}
	return nil
}

func (a *HTTP) postStatus(ctx context.Context, target string, body []byte, timeout time.Duration) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", a.cfg.AdminAPIToken)
	resp, err := a.client.Do(req)
	if err != nil {
		return 0, err
	}
	_ = resp.Body.Close()
	return resp.StatusCode, nil
}

// LiveKitCredentials is A24: the LiveKit of the world a play URI belongs to, asked at each move to LiveKit.
func (a *HTTP) LiveKitCredentials(ctx context.Context, playURI string) (host, key, secret string, err error) {
	var c struct {
		Host   *string `json:"livekitHost"`
		Key    *string `json:"livekitApiKey"`
		Secret *string `json:"livekitApiSecret"`
	}
	if err := a.call(ctx, http.MethodGet, a.cfg.AdminAPIURL, "/api/livekit/credentials", url.Values{"playUri": {playURI}}, true, "", nil, &c); err != nil {
		return "", "", "", err
	}
	if c.Host == nil || c.Key == nil || c.Secret == nil {
		return "", "", "", errors.New("the admin's LiveKit credentials are incomplete")
	}
	return *c.Host, *c.Key, *c.Secret, nil
}
