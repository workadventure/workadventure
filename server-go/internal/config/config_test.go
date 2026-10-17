package config

import (
	"os"
	"regexp"
	"strings"
	"testing"
	"time"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func TestDefaults(t *testing.T) {
	c, err := parse(env(map[string]string{"SECRET_KEY": "s"}))
	if err != nil {
		t.Fatal(err)
	}
	if c.HTTPPort != 3000 || c.GroupRadius != 48 || c.MinimumDistance != 64 || c.MaxPerGroup != 4 {
		t.Fatalf("unexpected defaults: %+v", c)
	}
	if c.ClientDisconnectRetention != 30*time.Second || c.SocketIdleTimer != 120*time.Second {
		t.Fatalf("unexpected durations: %v %v", c.ClientDisconnectRetention, c.SocketIdleTimer)
	}
	if _, ok := c.FrontEnv["ADMIN_URL"]; ok {
		t.Fatal("unset optional variables must be left out of window.env")
	}
	if c.FrontEnv["NODE_ENV"] != "development" || c.FrontEnv["ENABLE_CHAT"] != true {
		t.Fatalf("unexpected front env: %v", c.FrontEnv)
	}
}

func TestInvalidValuesAreFatal(t *testing.T) {
	_, err := parse(env(map[string]string{"SECRET_KEY": "s", "ENABLE_CHAT": "yes", "MAX_PER_GROUP": "-1"}))
	if err == nil || !strings.Contains(err.Error(), "ENABLE_CHAT") || !strings.Contains(err.Error(), "MAX_PER_GROUP") {
		t.Fatalf("expected both errors, got %v", err)
	}
	if _, err := parse(env(map[string]string{})); err == nil {
		t.Fatal("SECRET_KEY is required")
	}
}

func TestPrometheusPortEqualToHTTPPortMeansMainPort(t *testing.T) {
	c, err := parse(env(map[string]string{"SECRET_KEY": "s", "PROMETHEUS_PORT": "3000"}))
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
	c, err := parse(env(map[string]string{"SECRET_KEY": "s"}))
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
		if _, ok := c.FrontEnv[string(k[1])]; !ok {
			t.Errorf("%s is missing from window.env", k[1])
		}
	}
}
