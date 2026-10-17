// Package netguard keeps the server from fetching, for a player, an address of its own network (SSRF): the check
// is on the IP actually dialed, after DNS and on every redirect, so a name resolving to 10.0.0.1 is refused too.
package netguard

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"syscall"
	"time"
)

var ErrNotPublic = errors.New("address not public")

// cgnat is 100.64.0.0/10 (RFC 6598), private in practice; the cloud metadata 169.254.169.254 is link-local.
var cgnat = netip.MustParsePrefix("100.64.0.0/10")

// Public says whether ip may be fetched for a player: not loopback, private (RFC 1918, ULA), link-local, CGNAT,
// multicast or unspecified.
func Public(ip netip.Addr) bool {
	ip = ip.Unmap()
	return ip.IsValid() && !ip.IsLoopback() && !ip.IsPrivate() && !ip.IsLinkLocalUnicast() && !ip.IsLinkLocalMulticast() &&
		!ip.IsInterfaceLocalMulticast() && !ip.IsMulticast() && !ip.IsUnspecified() && !cgnat.Contains(ip)
}

// allowed is Public, replaced in the tests to let one local server stand for a public one.
var allowed = func(ap netip.AddrPort) bool { return Public(ap.Addr()) }

// Client is an HTTP client that only connects to public addresses, without the environment's proxy (the proxy's
// address would be the one checked).
func Client(timeout time.Duration) *http.Client {
	d := &net.Dialer{Timeout: 5 * time.Second, Control: func(_, address string, _ syscall.RawConn) error {
		ap, err := netip.ParseAddrPort(address)
		if err != nil || !allowed(ap) {
			return fmt.Errorf("%w: %s", ErrNotPublic, address)
		}
		return nil
	}}
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.Proxy = nil
	t.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
		return d.DialContext(ctx, network, addr)
	}
	return &http.Client{Timeout: timeout, Transport: t}
}
