package httpapi

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
)

// The expected palettes come from GenerateCustomColors.ts with chroma-js, run with node.
func TestTheWorldsColorsAreTheTSPalettes(t *testing.T) {
	for hex, want := range map[string]string{
		"#ff6600": "--secondary-50: 23 100% 91%;\n--secondary-100: 23 100% 91%;\n--secondary-200: 24 100% 82%;\n--secondary-300: 24 100% 73%;\n--secondary-400: 24 100% 64%;\n--secondary: 24 100% 55%;\n--secondary-600: 24 100% 45%;\n--secondary-700: 24 100% 36%;\n--secondary-800: 24 100% 27%;\n--secondary-900: 24 100% 18%;\n",
		"#1B2A41": "--secondary-50: 220 8% 85%;\n--secondary-100: 220 8% 85%;\n--secondary-200: 214 9% 70%;\n--secondary-300: 216 9% 55%;\n--secondary-400: 216 14% 40%;\n--secondary: 217 26% 25%;\n--secondary-600: 217 40% 16%;\n--secondary-700: 216 40% 13%;\n--secondary-800: 216 40% 10%;\n--secondary-900: 219 41% 7%;\n",
		"#808080": "--secondary-50: 0 0% 91%;\n--secondary-100: 0 0% 91%;\n--secondary-200: 0 0% 82%;\n--secondary-300: 0 0% 73%;\n--secondary-400: 0 0% 64%;\n--secondary: 0 0% 55%;\n--secondary-600: 0 0% 45%;\n--secondary-700: 0 0% 36%;\n--secondary-800: 0 0% 27%;\n--secondary-900: 0 0% 18%;\n",
	} {
		if got := stringPalette(hex, "secondary"); got != want {
			t.Errorf("%s:\n%s\nwant\n%s", hex, got, want)
		}
	}
	if cssOverride("", "") != "" {
		t.Fatal("no color, no style")
	}
}

// branded is an admin whose world has its own tags and colors, and one room that moved.
type branded struct{ *admin.Local }

func (branded) MapDetails(_ context.Context, q admin.MapQuery) (map[string]any, error) {
	if strings.Contains(q.PlayURI, "/old") {
		return map[string]any{"redirectUrl": "http://brand.test/@/o/w/new"}, nil
	}
	return map[string]any{"wamUrl": "http://ms.test/a.wam", "primaryColor": "#ff6600", "backgroundColor": nil,
		"metatags": map[string]any{"title": "Whitelabel world", "favIcons": []any{map[string]any{"rel": "icon", "src": "http://brand.test/i.png"}}}}, nil
}

func TestTheWorldBrandsItsPage(t *testing.T) {
	front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, `<meta name="wa-api-version" content="v1"><title>{{ title }}</title><meta name="msapplication-TileImage" content="{{ msApplicationTileImage }}">{{{ cssVariablesOverride }}}`)
	}))
	defer front.Close()
	cfg := &config.Config{AdminAPIURL: "http://admin.test", StartRoomURL: "/_/global/start.json", OpidWokaNamePolicy: "user_input", FrontEnv: map[string]any{}}
	local, _ := admin.NewLocal(cfg)
	assets := NewFrontAssets(front.URL, "", "v1")
	if err := assets.refresh(context.Background()); err != nil {
		t.Fatal(err)
	}
	h := New(cfg, auth.New("secret"), branded{local}, assets, http.NotFoundHandler(), "1.0.0")
	page := get(h, "GET", "http://brand.test/@/o/w/home", nil, nil).Body.String()
	if !strings.Contains(page, "<title>Whitelabel world</title>") || !strings.Contains(page, `content="http://brand.test/i.png"`) ||
		!strings.Contains(page, "--secondary: 24 100% 55%;") || strings.Contains(page, "--contrast") {
		t.Fatalf("the world's title, icon and colors, from the first page: %s", page)
	}
	if w := get(h, "GET", "http://brand.test/@/o/w/old", nil, nil); w.Code != http.StatusFound || w.Header().Get("Location") != "http://brand.test/@/o/w/new" {
		t.Fatalf("a room that moved redirects: %d %s", w.Code, w.Header().Get("Location"))
	}
}
