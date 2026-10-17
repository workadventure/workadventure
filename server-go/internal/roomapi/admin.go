package roomapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// AdminAuthorizer is AdminAuthenticator of the Room API (A25): with an admin, it decides which key may touch which
// room, and its answer becomes the gRPC status. In production its yes is kept as long as its Cache-Control says
// (5 minutes without one), like axios-cache-interceptor.
type AdminAuthorizer struct {
	url    string
	cache  bool
	client *http.Client
	mu     sync.Mutex
	ok     map[string]time.Time // room and key → until when the admin's yes holds
}

func NewAdminAuthorizer(adminAPIURL string, production bool) *AdminAuthorizer {
	return &AdminAuthorizer{url: strings.TrimRight(adminAPIURL, "/") + "/api/room-api/authorization", cache: production,
		client: &http.Client{Timeout: 10 * time.Second}, ok: map[string]time.Time{}}
}

var adminCodes = map[string]int{"UNAUTHENTICATED": codeUnauthenticated, "NOT_FOUND": codeNotFound,
	"PERMISSION_DENIED": codePermissionDenied, "INTERNAL": codeInternal, "UNKNOWN": codeUnknown}

func (a *AdminAuthorizer) authorize(apiKey, room string) error {
	encoded := encodeURI(room)
	cacheKey := encoded + "\x00" + apiKey
	if a.cache {
		a.mu.Lock()
		until, ok := a.ok[cacheKey]
		a.mu.Unlock()
		if ok && time.Now().Before(until) {
			return nil
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.url+"?"+url.Values{"roomUrl": {encoded}}.Encode(), nil)
	if err != nil {
		return fail(codeInternal, "Internal error! Please contact us!")
	}
	req.Header.Set("X-API-Key", apiKey)
	resp, err := a.client.Do(req)
	if err != nil {
		return fail(codeInternal, "Internal error! Please contact us!")
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode/100 != 2 {
		if len(body) == 0 {
			return fail(codeInternal, "Internal error! Please contact us!")
		}
		code := codeUnauthenticated
		switch {
		case resp.StatusCode == http.StatusBadRequest:
			code = codeUnknown
		case resp.StatusCode == http.StatusNotFound:
			code = codeNotFound
		case resp.StatusCode == http.StatusForbidden:
			code = codePermissionDenied
		case resp.StatusCode >= 500:
			code = codeInternal
		}
		return fail(code, "%s", body)
	}
	var answer struct {
		Success *bool   `json:"success"`
		Error   string  `json:"error"`
		Message *string `json:"message"`
	}
	if json.Unmarshal(body, &answer) != nil || answer.Success == nil {
		return fail(codeInternal, "Unexpected error! Please contact us!")
	}
	if !*answer.Success {
		code, known := adminCodes[answer.Error]
		if !known || answer.Message == nil {
			return fail(codeInternal, "Unexpected error! Please contact us!")
		}
		return fail(code, "%s", *answer.Message)
	}
	if a.cache {
		a.mu.Lock()
		a.ok[cacheKey] = time.Now().Add(maxAge(resp.Header.Get("Cache-Control")))
		a.mu.Unlock()
	}
	return nil
}

// ponytail: the yeses are never pruned; one entry per room and key the admin accepted.

func maxAge(cacheControl string) time.Duration {
	for _, d := range strings.Split(cacheControl, ",") {
		if v, ok := strings.CutPrefix(strings.TrimSpace(d), "max-age="); ok {
			if n, err := strconv.Atoi(v); err == nil {
				return time.Duration(n) * time.Second
			}
		}
	}
	return 5 * time.Minute
}

// encodeURI is JavaScript's encodeURI.
func encodeURI(s string) string {
	var b strings.Builder
	for _, c := range []byte(s) {
		if c < 0x80 && (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || strings.IndexByte(";,/?:@&=+$-_.!~*'()#", c) >= 0) {
			b.WriteByte(c)
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}
