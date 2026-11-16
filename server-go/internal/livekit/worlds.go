package livekit

import (
	"context"
	"errors"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

// Worlds is the LiveKit of each world, as the admin gives it (A24, api/livekit/credentials): the
// core.MediaProvider of the SaaS. Recordings, when set, is the bucket every world records into.
type Worlds struct {
	Credentials func(ctx context.Context, playURI string) (host, key, secret string, err error)
	Recordings  *S3
}

func (w Worlds) LiveKitFor(ctx context.Context, playURI string) (core.LiveKit, error) {
	if playURI == "" {
		return nil, errors.New("playUri is required when using AdminAPI for Livekit credentials")
	}
	host, key, secret, err := w.Credentials(ctx, playURI)
	if err != nil {
		return nil, err
	}
	return New(host, key, secret), nil
}

// EgressFor records on the world's LiveKit, into the shared bucket.
func (w Worlds) EgressFor(lk core.LiveKit) core.Egress {
	c, ok := lk.(*Client)
	if !ok || w.Recordings == nil {
		return nil
	}
	return c.Egress(*w.Recordings)
}

func (w Worlds) CanRecord() bool { return w.Recordings != nil }
