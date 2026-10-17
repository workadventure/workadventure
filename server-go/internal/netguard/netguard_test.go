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
