// Package s3 lists, deletes and signs URLs of objects of an S3 bucket (AWS Signature Version 4, path-style):
// the few calls the recordings need, without the SDK.
package s3

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Client struct {
	Endpoint, Region, Bucket, AccessKey, Secret string
	http                                        *http.Client
}

func New(endpoint, region, bucket, accessKey, secret string) *Client {
	return &Client{Endpoint: strings.TrimRight(endpoint, "/"), Region: region, Bucket: bucket, AccessKey: accessKey, Secret: secret,
		http: &http.Client{Timeout: 2 * time.Minute}} // an upload of the chat may be large
}

type Object struct {
	Key  string
	Size uint64
}

func hashHex(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }

func mac(key []byte, s string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(s))
	return m.Sum(nil)
}

// escape is the URI encoding of SigV4: everything but unreserved characters (and / in paths).
func escape(s string, path bool) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || '0' <= c && c <= '9' || c == '-' || c == '_' || c == '.' || c == '~' || (path && c == '/') {
			b.WriteByte(c)
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

func canonicalQuery(q url.Values) string {
	keys := make([]string, 0, len(q))
	for k := range q {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		for _, v := range q[k] {
			parts = append(parts, escape(k, false)+"="+escape(v, false))
		}
	}
	return strings.Join(parts, "&")
}

// signature signs a canonical request for host, at t.
func (c *Client) signature(method, host, path string, q url.Values, headers [][2]string, payloadHash string, t time.Time) (scope, signed, sig string) {
	date := t.Format("20060102")
	scope = date + "/" + c.Region + "/s3/aws4_request"
	var ch, names []string
	for _, h := range headers {
		ch = append(ch, h[0]+":"+h[1]+"\n")
		names = append(names, h[0])
	}
	signed = strings.Join(names, ";")
	canonical := strings.Join([]string{method, escape(path, true), canonicalQuery(q), strings.Join(ch, ""), signed, payloadHash}, "\n")
	toSign := "AWS4-HMAC-SHA256\n" + t.Format("20060102T150405Z") + "\n" + scope + "\n" + hashHex([]byte(canonical))
	k := mac(mac(mac(mac([]byte("AWS4"+c.Secret), date), c.Region), "s3"), "aws4_request")
	return scope, signed, hex.EncodeToString(mac(k, toSign))
}

func (c *Client) do(ctx context.Context, method, key string, q url.Values) ([]byte, error) {
	return c.send(ctx, method, key, q, nil, nil)
}

// send signs the request; body (when any) is hashed into the signature, extra headers are sent unsigned.
func (c *Client) send(ctx context.Context, method, key string, q url.Values, body []byte, extra map[string]string) ([]byte, error) {
	u, err := url.Parse(c.Endpoint + "/" + c.Bucket + "/" + key)
	if err != nil {
		return nil, err
	}
	t := time.Now().UTC()
	payload := hashHex(body)
	headers := [][2]string{{"host", u.Host}, {"x-amz-content-sha256", payload}, {"x-amz-date", t.Format("20060102T150405Z")}}
	scope, signed, sig := c.signature(method, u.Host, u.Path, q, headers, payload, t)
	u.RawQuery = canonicalQuery(q)
	req, err := http.NewRequestWithContext(ctx, method, u.String(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	for k, v := range extra {
		req.Header.Set(k, v)
	}
	req.Header.Set("x-amz-content-sha256", payload)
	req.Header.Set("x-amz-date", t.Format("20060102T150405Z"))
	req.Header.Set("Authorization", "AWS4-HMAC-SHA256 Credential="+c.AccessKey+"/"+scope+", SignedHeaders="+signed+", Signature="+sig)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	answer, _ := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("S3 %s %s: %s %s", method, key, resp.Status, answer)
	}
	return answer, nil
}

// List lists the objects under prefix, every page of them.
func (c *Client) List(ctx context.Context, prefix string) ([]Object, error) {
	var out []Object
	token := ""
	for {
		q := url.Values{"list-type": {"2"}, "prefix": {prefix}}
		if token != "" {
			q.Set("continuation-token", token)
		}
		body, err := c.do(ctx, http.MethodGet, "", q)
		if err != nil {
			return nil, err
		}
		var page struct {
			Contents []struct {
				Key  string `xml:"Key"`
				Size uint64 `xml:"Size"`
			} `xml:"Contents"`
			Truncated bool   `xml:"IsTruncated"`
			Next      string `xml:"NextContinuationToken"`
		}
		if err := xml.Unmarshal(body, &page); err != nil {
			return nil, err
		}
		for _, o := range page.Contents {
			out = append(out, Object{Key: o.Key, Size: o.Size})
		}
		if !page.Truncated || page.Next == "" {
			return out, nil
		}
		token = page.Next
	}
}

func (c *Client) Delete(ctx context.Context, key string) error {
	_, err := c.do(ctx, http.MethodDelete, key, nil)
	return err
}

// Presign is a GET URL of key valid for ttl, signed for endpoint (a CDN in front of the bucket, or the bucket's
// own); with attachment, the browser saves the file.
// Put stores an object (PutObject), with its type and disposition.
func (c *Client) Put(ctx context.Context, key string, data []byte, contentType, disposition string) error {
	_, err := c.send(ctx, http.MethodPut, key, url.Values{}, data, map[string]string{"Content-Type": contentType, "Content-Disposition": disposition})
	return err
}

func (c *Client) Presign(endpoint, key string, ttl time.Duration, attachment bool) (string, error) {
	return c.PresignAs(endpoint, key, ttl, attachment, "")
}

// PresignAs is Presign with the response's Content-Type set (response-content-type), when contentType is not "".
func (c *Client) PresignAs(endpoint, key string, ttl time.Duration, attachment bool, contentType string) (string, error) {
	if endpoint == "" {
		endpoint = c.Endpoint
	}
	u, err := url.Parse(strings.TrimRight(endpoint, "/") + "/" + c.Bucket + "/" + key)
	if err != nil {
		return "", err
	}
	t := time.Now().UTC()
	q := url.Values{"X-Amz-Algorithm": {"AWS4-HMAC-SHA256"}, "X-Amz-Credential": {c.AccessKey + "/" + t.Format("20060102") + "/" + c.Region + "/s3/aws4_request"},
		"X-Amz-Date": {t.Format("20060102T150405Z")}, "X-Amz-Expires": {strconv.Itoa(int(ttl.Seconds()))}, "X-Amz-SignedHeaders": {"host"}}
	if attachment {
		q.Set("response-content-disposition", "attachment")
	}
	if contentType != "" {
		q.Set("response-content-type", contentType)
	}
	_, _, sig := c.signature(http.MethodGet, u.Host, u.Path, q, [][2]string{{"host", u.Host}}, "UNSIGNED-PAYLOAD", t)
	q.Set("X-Amz-Signature", sig)
	u.RawQuery = canonicalQuery(q)
	return u.String(), nil
}

// PutCORS lets every origin read the objects (GET, HEAD) with an Authorization header, like S3StorageProvider does
// on its first use: the browsers follow the signed links of the chat's files.
func (c *Client) PutCORS(ctx context.Context) error {
	body := []byte(`<CORSConfiguration><CORSRule><AllowedHeader>Authorization</AllowedHeader><AllowedMethod>GET</AllowedMethod>` +
		`<AllowedMethod>HEAD</AllowedMethod><AllowedOrigin>*</AllowedOrigin><ExposeHeader>Access-Control-Allow-Origin</ExposeHeader>` +
		`</CORSRule></CORSConfiguration>`)
	sum := md5.Sum(body) //nolint:gosec // Content-MD5 is what S3 asks for
	_, err := c.send(ctx, http.MethodPut, "", url.Values{"cors": {""}}, body,
		map[string]string{"Content-MD5": base64.StdEncoding.EncodeToString(sum[:]), "Content-Type": "application/xml"})
	return err
}
