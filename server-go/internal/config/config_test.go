package config

import (
	"encoding/json"
	"net/netip"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestDefaults(t *testing.T) {
	c, err := parse(map[string]string{"SECRET_KEY": "s"})
	if err != nil {
		t.Fatal(err)
	}
	if c.HTTPPort != 3000 || c.GroupRadius != 48 || c.MinimumDistance != 64 || c.MaxPerGroup != 4 {
		t.Fatalf("unexpected defaults: %+v", c)
	}
	if c.ClientDisconnectRetention != 30*time.Second || c.SocketIdleTimer != 120*time.Second {
		t.Fatalf("unexpected durations: %v %v", c.ClientDisconnectRetention, c.SocketIdleTimer)
	}
	env := envMap(t, c.FrontEnv)
	if _, ok := env["ADMIN_URL"]; ok {
		t.Fatal("unset optional variables must be left out of window.env")
	}
	if env["NODE_ENV"] != "development" || env["ENABLE_CHAT"] != true {
		t.Fatalf("unexpected front env: %v", c.FrontEnv)
	}
}

// The proxies trusted with X-Forwarded-For are the private ranges unless TRUSTED_PROXIES says otherwise.
func TestTrustedProxies(t *testing.T) {
	c, err := parse(map[string]string{"SECRET_KEY": "s"})
	if err != nil || len(c.TrustedProxies) != 6 || !c.TrustedProxies[3].Contains(netip.MustParseAddr("172.18.0.4")) {
		t.Fatalf("default trusted proxies: %v %v", c.TrustedProxies, err)
	}
	if c, err = parse(map[string]string{"SECRET_KEY": "s", "TRUSTED_PROXIES": "203.0.113.0/24, 2001:db8::/32"}); err != nil || len(c.TrustedProxies) != 2 {
		t.Fatalf("trusted proxies: %v %v", c.TrustedProxies, err)
	}
	if _, err = parse(map[string]string{"SECRET_KEY": "s", "TRUSTED_PROXIES": "10.0.0.1"}); err == nil || !strings.Contains(err.Error(), "TRUSTED_PROXIES") {
		t.Fatalf("a range is expected: %v", err)
	}
}

func TestInvalidValuesAreFatal(t *testing.T) {
	_, err := parse(map[string]string{"SECRET_KEY": "s", "ENABLE_CHAT": "yes", "MAX_PER_GROUP": "-1"})
	if err == nil || !strings.Contains(err.Error(), "ENABLE_CHAT") || !strings.Contains(err.Error(), "MAX_PER_GROUP") {
		t.Fatalf("expected both errors, got %v", err)
	}
	if _, err := parse(map[string]string{}); err == nil {
		t.Fatal("SECRET_KEY is required")
	}
}

func TestPrometheusPortEqualToHTTPPortMeansMainPort(t *testing.T) {
	c, err := parse(map[string]string{"SECRET_KEY": "s", "PROMETHEUS_PORT": "3000"})
	if err != nil || c.PrometheusPort != 0 {
		t.Fatalf("got %v %v", c, err)
	}
}

// Every required key of the front's FrontConfigurationInterface must be in window.env: the front reads it without a
// fallback (PROXIMITY_FILE_TRANSFER_MAX_USERS undefined disabled the proximity file button).
func TestTheFrontEnvHasEveryRequiredKeyOfTheTSInterface(t *testing.T) {
	src, err := os.ReadFile("../../../play/src/common/FrontConfigurationInterface.ts")
	if err != nil {
		t.Skip("no TS interface next to this checkout")
	}
	c, err := parse(map[string]string{"SECRET_KEY": "s"})
	if err != nil {
		t.Fatal(err)
	}
	keys := regexp.MustCompile(`(?m)^    ([A-Z][A-Z0-9_]*): (.*);$`).FindAllSubmatch(src, -1)
	if len(keys) < 50 {
		t.Fatalf("only %d keys read: the interface changed shape", len(keys))
	}
	for _, k := range keys {
		if strings.Contains(string(k[2]), "undefined") {
			continue // may be left out, as the pusher does when unset
		}
		if _, ok := envMap(t, c.FrontEnv)[string(k[1])]; !ok {
			t.Errorf("%s is missing from window.env", k[1])
		}
	}
}

func TestTheJSONBodyLimitReadsLikeTheBytesPackage(t *testing.T) {
	for v, want := range map[string]int64{"": 100 << 20, "100mb": 100 << 20, "1.5GB": 3 << 29, "2048": 2048, "10 kb": 10 << 10} {
		c, err := parse(map[string]string{"SECRET_KEY": "s", "BODY_PARSER_JSON_SIZE_LIMIT": v})
		if err != nil || c.MapStorage.JSONLimit != want {
			t.Errorf("%q: %v %v", v, c, err)
		}
	}
	if _, err := parse(map[string]string{"SECRET_KEY": "s", "BODY_PARSER_JSON_SIZE_LIMIT": "lots"}); err == nil {
		t.Fatal("an unreadable size is refused")
	}
}

// envMap is window.env as the page holds it.
func envMap(t *testing.T, env FrontEnv) map[string]any {
	t.Helper()
	b, err := json.Marshal(env)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	return m
}
