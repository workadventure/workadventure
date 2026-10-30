package netguard

import (
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strconv"
	"testing"
	"time"
)

func TestOnlyPublicAddressesAreFetched(t *testing.T) {
	for addr, public := range map[string]bool{"127.0.0.1": false, "10.1.2.3": false, "172.16.0.1": false, "192.168.1.1": false,
		"169.254.169.254": false, "100.64.0.1": false, "0.0.0.0": false, "::1": false, "fd00::1": false, "fe80::1": false,
		"::ffff:10.0.0.1": false, "8.8.8.8": true, "2606:4700::1111": true} {
		if Public(netip.MustParseAddr(addr)) != public {
			t.Errorf("%s: public should be %v", addr, public)
		}
	}
	local := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	defer local.Close()
	if err := get(local.URL); !errors.Is(err, ErrNotPublic) {
		t.Fatalf("127.0.0.1 is refused: %v", err)
	}
	if err := get("http://localhost:" + strconv.Itoa(local.Listener.Addr().(*net.TCPAddr).Port)); !errors.Is(err, ErrNotPublic) {
		t.Fatalf("a name resolving to 127.0.0.1 is refused: %v", err)
	}
}

func TestARedirectToAPrivateAddressIsRefused(t *testing.T) {
	private := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	defer private.Close()
	public := httptest.NewServer(http.RedirectHandler(private.URL, http.StatusFound))
	defer public.Close()
	publicPort := uint16(public.Listener.Addr().(*net.TCPAddr).Port)
	allowed = func(ap netip.AddrPort) bool { return ap.Port() == publicPort }
	defer func() { allowed = func(ap netip.AddrPort) bool { return Public(ap.Addr()) } }()
	if err := get(public.URL); !errors.Is(err, ErrNotPublic) {
		t.Fatalf("the redirect to a private address is refused: %v", err)
	}
}

// get fetches u with the guarded client; only the error matters.
func get(u string) error {
	resp, err := Client(time.Second).Get(u)
	if err == nil {
		_ = resp.Body.Close()
	}
	return err
}

// The client is the right-most address no trusted proxy stands for: what a client writes in X-Forwarded-For itself
// is never taken over what the proxies saw, so it cannot dodge an IP ban.
func TestClientIPTrustsOnlyTheProxies(t *testing.T) {
	trusted := []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8"), netip.MustParsePrefix("::1/128")}
	for _, c := range []struct{ remote, xff, want string }{
		{"10.0.0.2:4000", "1.2.3.4, 203.0.113.7", "203.0.113.7"},  // the client claims 1.2.3.4; the proxy saw 203.0.113.7
		{"10.0.0.2:4000", "203.0.113.7, 10.0.0.9", "203.0.113.7"}, // through two trusted proxies
		{"198.51.100.1:4000", "1.2.3.4", "198.51.100.1"},          // no proxy in front: the header is the client's
		{"10.0.0.2:4000", "", "10.0.0.2"},                         // a client of the private network
		{"10.0.0.2:4000", "10.0.0.5", "10.0.0.5"},                 // every hop trusted: the left-most
		{"[::1]:4000", "203.0.113.7:51000", "203.0.113.7"},        // a hop with its port
		{"10.0.0.2:4000", "unknown", ""},                          // a trusted proxy that did not know
		{"10.0.0.2:4000", "::ffff:203.0.113.7", "203.0.113.7"},    // an IPv4-mapped address
	} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.RemoteAddr = c.remote
		if c.xff != "" {
			r.Header.Set("X-Forwarded-For", c.xff)
		}
		if got := ClientIP(r, trusted); got != c.want {
			t.Errorf("remote %s, X-Forwarded-For %q: %q, want %q", c.remote, c.xff, got, c.want)
		}
	}
}
