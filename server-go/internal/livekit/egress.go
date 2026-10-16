package livekit

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/core"
)

// S3 is where the egress writes the recordings (LIVEKIT_RECORDING_S3_*).
type S3 struct{ Endpoint, AccessKey, Secret, Region, Bucket string }

// Egress records the rooms of a LiveKit server into S3, as the back's LiveKitService.startRecording does: one MP4
// and a thumbnail every 10 s, under the recorder's uuid.
type Egress struct {
	c  *Client
	s3 S3
}

func (c *Client) Egress(s3 S3) *Egress { return &Egress{c: c, s3: s3} }

func (e *Egress) twirp(ctx context.Context, method string, body, out any) error {
	return e.c.call(ctx, "livekit.Egress/"+method, video{"roomRecord": true}, body, out)
}

type egressInfo struct {
	EgressID  string `json:"egressId"`
	EgressID2 string `json:"egress_id"`
	Status    any    `json:"status"`
}

func (i egressInfo) id() string {
	if i.EgressID != "" {
		return i.EgressID
	}
	return i.EgressID2
}

// status reads the status, a name or the enum's number (EgressStatus of livekit_egress.proto).
func (i egressInfo) status() string {
	switch v := i.Status.(type) {
	case string:
		return v
	case float64:
		names := []string{"EGRESS_STARTING", "EGRESS_ACTIVE", "EGRESS_ENDING", "EGRESS_COMPLETE", "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED"}
		if n := int(v); n >= 0 && n < len(names) {
			return names[n]
		}
	}
	return "EGRESS_STARTING"
}

func (e *Egress) Start(ctx context.Context, room string, recorder core.SpaceUser) (string, error) {
	s3 := map[string]any{"endpoint": e.s3.Endpoint, "accessKey": e.s3.AccessKey, "secret": e.s3.Secret, "region": e.s3.Region,
		"bucket": e.s3.Bucket, "forcePathStyle": true}
	ts := time.Now().UTC().Format("2006-01-02T15:04:05")
	folder := recorder.UUID
	body := map[string]any{
		"roomName": RoomName(room), "layout": "grid",
		"fileOutputs":  []any{map[string]any{"fileType": "MP4", "filepath": folder + "/recording-" + ts, "disableManifest": true, "s3": s3}},
		"imageOutputs": []any{map[string]any{"captureInterval": 10, "width": 320, "height": 180, "filenamePrefix": folder + "/thumbnail-" + ts, "s3": s3}},
	}
	var info egressInfo
	if err := e.twirp(ctx, "StartRoomCompositeEgress", body, &info); err != nil {
		return "", err
	}
	if info.id() == "" {
		return "", errors.New("the egress gave no id")
	}
	return info.id(), nil
}

// Stop stops an egress; one that already ended is not an error.
func (e *Egress) Stop(ctx context.Context, id string) error {
	err := e.twirp(ctx, "StopEgress", map[string]string{"egressId": id}, nil)
	if err != nil {
		for _, ended := range []string{"EGRESS_COMPLETE", "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED"} {
			if strings.Contains(err.Error(), ended) {
				return nil
			}
		}
	}
	return err
}

func (e *Egress) Status(ctx context.Context, id string) (string, error) {
	var list struct {
		Items []egressInfo `json:"items"`
	}
	if err := e.twirp(ctx, "ListEgress", map[string]string{"egressId": id}, &list); err != nil {
		return "", err
	}
	if len(list.Items) == 0 {
		return "EGRESS_ABORTED", nil // LiveKit forgot it
	}
	return list.Items[0].status(), nil
}
