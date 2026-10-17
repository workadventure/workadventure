// Package s3 lists, deletes, stores and signs URLs of objects of an S3 bucket (path-style), with minio-go: the calls
// of the recordings and of the uploader.
package s3

import (
	"bytes"
	"context"
	"net/url"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/cors"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	Endpoint, Region, Bucket, AccessKey, Secret string // also handed to the LiveKit egress
}

func New(endpoint, region, bucket, accessKey, secret string) *Client {
	return &Client{Endpoint: strings.TrimRight(endpoint, "/"), Region: region, Bucket: bucket, AccessKey: accessKey, Secret: secret}
}

type Object struct {
	Key  string
	Size uint64
}

// minio is a client of endpoint. The region is given, so creating one, or signing a URL with it, makes no request.
func (c *Client) minio(endpoint string) (*minio.Client, error) {
	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}
	return minio.New(u.Host, &minio.Options{Creds: credentials.NewStaticV4(c.AccessKey, c.Secret, ""), Secure: u.Scheme == "https",
		Region: c.Region, BucketLookup: minio.BucketLookupPath})
}

// List lists the objects under prefix, every page of them.
func (c *Client) List(ctx context.Context, prefix string) ([]Object, error) {
	mc, err := c.minio(c.Endpoint)
	if err != nil {
		return nil, err
	}
	var out []Object
	for o := range mc.ListObjects(ctx, c.Bucket, minio.ListObjectsOptions{Prefix: prefix, Recursive: true}) {
		if o.Err != nil {
			return nil, o.Err
		}
		out = append(out, Object{Key: o.Key, Size: uint64(max(o.Size, 0))})
	}
	return out, nil
}

func (c *Client) Delete(ctx context.Context, key string) error {
	mc, err := c.minio(c.Endpoint)
	if err != nil {
		return err
	}
	return mc.RemoveObject(ctx, c.Bucket, key, minio.RemoveObjectOptions{})
}

// Put stores an object (PutObject), with its type and disposition.
func (c *Client) Put(ctx context.Context, key string, data []byte, contentType, disposition string) error {
	mc, err := c.minio(c.Endpoint)
	if err != nil {
		return err
	}
	_, err = mc.PutObject(ctx, c.Bucket, key, bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{ContentType: contentType, ContentDisposition: disposition})
	return err
}

// Presign is a GET URL of key valid for ttl, signed for endpoint (a CDN in front of the bucket, or the bucket's
// own); with attachment, the browser saves the file.
func (c *Client) Presign(endpoint, key string, ttl time.Duration, attachment bool) (string, error) {
	return c.PresignAs(endpoint, key, ttl, attachment, "")
}

// PresignAs is Presign with the response's Content-Type set (response-content-type), when contentType is not "".
func (c *Client) PresignAs(endpoint, key string, ttl time.Duration, attachment bool, contentType string) (string, error) {
	if endpoint == "" {
		endpoint = c.Endpoint
	}
	mc, err := c.minio(strings.TrimRight(endpoint, "/"))
	if err != nil {
		return "", err
	}
	q := url.Values{}
	if attachment {
		q.Set("response-content-disposition", "attachment")
	}
	if contentType != "" {
		q.Set("response-content-type", contentType)
	}
	u, err := mc.PresignedGetObject(context.Background(), c.Bucket, key, ttl, q)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// PutCORS lets every origin read the objects (GET, HEAD) with an Authorization header, like S3StorageProvider does
// on its first use: the browsers follow the signed links of the chat's files.
func (c *Client) PutCORS(ctx context.Context) error {
	mc, err := c.minio(c.Endpoint)
	if err != nil {
		return err
	}
	return mc.SetBucketCors(ctx, c.Bucket, cors.NewConfig([]cors.Rule{{AllowedHeader: []string{"Authorization"},
		AllowedMethod: []string{"GET", "HEAD"}, AllowedOrigin: []string{"*"}, ExposeHeader: []string{"Access-Control-Allow-Origin"}}}))
}
