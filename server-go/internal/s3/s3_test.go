package s3

import (
	"context"
	"crypto/md5"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestAPresignedURLIsPathStyleOnTheCDNWithItsResponseHeaders(t *testing.T) {
	c := New("https://s3.eu-west-3.amazonaws.com", "eu-west-3", "chat", "AKIAIOSFODNN7EXAMPLE", "secret")
	link, err := c.PresignAs("https://cdn.example.com/", "u1/a b.pdf", time.Hour, true, "application/pdf")
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(link)
	q := u.Query()
	if u.Host != "cdn.example.com" || u.Path != "/chat/u1/a b.pdf" || q.Get("X-Amz-Expires") != "3600" || q.Get("X-Amz-Signature") == "" ||
		!strings.HasPrefix(q.Get("X-Amz-Credential"), "AKIAIOSFODNN7EXAMPLE/") || !strings.Contains(q.Get("X-Amz-Credential"), "/eu-west-3/s3/") ||
		q.Get("response-content-disposition") != "attachment" || q.Get("response-content-type") != "application/pdf" {
		t.Fatal(link)
	}
}

func TestTheBucketLetsBrowsersReadTheFiles(t *testing.T) {
	var got string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		sum := md5.Sum(b)
		if r.Method == http.MethodPut && r.URL.Path == "/chat/" && r.URL.Query().Has("cors") &&
			r.Header.Get("Content-MD5") == base64.StdEncoding.EncodeToString(sum[:]) && strings.HasPrefix(r.Header.Get("Authorization"), "AWS4-HMAC-SHA256") {
			got = string(b)
			return
		}
		t.Logf("%s %s %v", r.Method, r.URL, r.Header)
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer srv.Close()
	if err := New(srv.URL, "eu", "chat", "k", "s").PutCORS(context.Background()); err != nil || !strings.Contains(got, "<AllowedOrigin>*</AllowedOrigin>") {
		t.Fatalf("%v %q", err, got)
	}
}
