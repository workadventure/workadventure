package httpapi

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"sync/atomic"
	"time"

	"github.com/cbroglie/mustache"
)

// FrontAssets polls the index.html template of the "front" container (RemoteFrontAssets). The front can be
// redeployed alone, so the template, which holds the hashed names of the entry files, is never baked in.
type FrontAssets struct {
	internalURL, assetsURL, apiVersion string
	client                             *http.Client
	tpl                                atomic.Pointer[mustache.Template]
	etag                               string
	reportedVersion                    string
}

func NewFrontAssets(internalURL, assetsURL, apiVersion string) *FrontAssets {
	return &FrontAssets{internalURL: internalURL, assetsURL: assetsURL, apiVersion: apiVersion, client: &http.Client{Timeout: 10 * time.Second}}
}

// Template returns the parsed index.html, or nil while it is not loaded (the server is then not ready).
func (f *FrontAssets) Template() *mustache.Template { return f.tpl.Load() }

// Poll refreshes the template every 30 s (every 2 s until the first one is loaded), until ctx ends.
func (f *FrontAssets) Poll(ctx context.Context) {
	if f.internalURL == "" {
		slog.Warn("ASSETS_URL is not set: no front to serve")
		return
	}
	for {
		if err := f.refresh(ctx); err != nil {
			slog.Error("failed to refresh the front template", "error", err)
		}
		delay := 30 * time.Second
		if f.Template() == nil {
			delay = 2 * time.Second
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(delay):
		}
	}
}

var apiVersionMeta = regexp.MustCompile(`<meta name="wa-api-version" content="([^"]*)"`)

func (f *FrontAssets) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, f.internalURL+"/index.html", nil)
	if err != nil {
		return err
	}
	if f.etag != "" {
		req.Header.Set("If-None-Match", f.etag)
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotModified {
		return nil
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("could not fetch the front template: HTTP %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	html := string(body)
	version := ""
	if m := apiVersionMeta.FindStringSubmatch(html); m != nil {
		version = m[1]
	}
	if version != f.apiVersion {
		// This front speaks another protocol than this server: keep serving the current template.
		if f.reportedVersion != version {
			f.reportedVersion = version
			slog.Error("ignoring the front template: its apiVersionHash does not match the server's", "front", version, "server", f.apiVersion)
		}
		return nil
	}
	tpl, err := mustache.ParseString(RewriteAssetURLs(html, f.assetsURL))
	if err != nil {
		return err
	}
	f.tpl.Store(tpl)
	f.etag = resp.Header.Get("ETag")
	return nil
}

var assetURL = regexp.MustCompile(`(\s(?:src|href)=")(?:\./(assets/)|/((?:src|@vite)/))`)

// RewriteAssetURLs points the files emitted by Vite to the assets domain. Public files (./static/…) stay on the
// page's origin (service workers, iframe_api.js).
func RewriteAssetURLs(html, assetsURL string) string {
	return assetURL.ReplaceAllString(html, "${1}"+assetsURL+"/${2}${3}")
}
