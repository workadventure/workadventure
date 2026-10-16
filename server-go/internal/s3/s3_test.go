package s3

import (
	"net/url"
	"testing"
	"time"
)

// The example of the AWS documentation (Authenticating Requests: Using Query Parameters), with its fixed date.
func TestAPresignedURLIsSignedAsAWSDoes(t *testing.T) {
	c := New("https://examplebucket.s3.amazonaws.com", "us-east-1", "", "AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
	q := url.Values{"X-Amz-Algorithm": {"AWS4-HMAC-SHA256"}, "X-Amz-Credential": {"AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request"},
		"X-Amz-Date": {"20130524T000000Z"}, "X-Amz-Expires": {"86400"}, "X-Amz-SignedHeaders": {"host"}}
	at, _ := time.Parse("20060102T150405Z", "20130524T000000Z")
	_, _, sig := c.signature("GET", "examplebucket.s3.amazonaws.com", "/test.txt", q, [][2]string{{"host", "examplebucket.s3.amazonaws.com"}}, "UNSIGNED-PAYLOAD", at)
	if sig != "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404" {
		t.Fatal(sig)
	}
}
