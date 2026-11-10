package ws

import (
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/config"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
)

func TestAWAMURLIsStoredUnderItsWorldWhenWorldsShareTheStorage(t *testing.T) {
	for _, c := range []struct {
		public, prefix string
		domains        bool
		wam, key       string
	}{
		{"http://map-storage.test", "", false, "http://map-storage.test/maps/office.wam", "maps/office.wam"},
		{"https://play.test/map-storage", "/map-storage", false, "https://play.test/map-storage/maps/office.wam", "maps/office.wam"},
		{"", "", true, "https://Acme-1.ms.test/office.wam", "acme-1.ms.test/office.wam"},
		{"", "", false, "https://ms.test/../etc/passwd", ""},
	} {
		srv := &Server{cfg: &config.Config{PublicMapStorageURL: c.public, MapStorage: mapstorage.Options{PathPrefix: c.prefix, UseDomainNameInPath: c.domains}}}
		if got := srv.storageKey(c.wam); got != c.key {
			t.Errorf("%s: %q, want %q", c.wam, got, c.key)
		}
	}
}
