package livekit

import (
	"context"
	"errors"
	"strings"
	"time"

	lkp "github.com/livekit/protocol/livekit"

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

func (e *Egress) upload() *lkp.S3Upload {
	return &lkp.S3Upload{Endpoint: e.s3.Endpoint, AccessKey: e.s3.AccessKey, Secret: e.s3.Secret, Region: e.s3.Region,
		Bucket: e.s3.Bucket, ForcePathStyle: true}
}

func (e *Egress) Start(ctx context.Context, room string, recorder core.SpaceUser) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	ts := time.Now().UTC().Format("2006-01-02T15:04:05")
	folder := recorder.UUID
	info, err := e.c.egress.StartRoomCompositeEgress(ctx, &lkp.RoomCompositeEgressRequest{
		RoomName: RoomName(room), Layout: "grid",
		FileOutputs: []*lkp.EncodedFileOutput{{FileType: lkp.EncodedFileType_MP4, Filepath: folder + "/recording-" + ts,
			DisableManifest: true, Output: &lkp.EncodedFileOutput_S3{S3: e.upload()}}},
		ImageOutputs: []*lkp.ImageOutput{{CaptureInterval: 10, Width: 320, Height: 180, FilenamePrefix: folder + "/thumbnail-" + ts,
			Output: &lkp.ImageOutput_S3{S3: e.upload()}}},
	})
	if err != nil {
		return "", err
	}
	if info.GetEgressId() == "" {
		return "", errors.New("the egress gave no id")
	}
	return info.GetEgressId(), nil
}

// Stop stops an egress; one that already ended is not an error.
func (e *Egress) Stop(ctx context.Context, id string) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	_, err := e.c.egress.StopEgress(ctx, &lkp.StopEgressRequest{EgressId: id})
	if err != nil {
		for _, ended := range []string{"EGRESS_COMPLETE", "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED"} {
			if strings.Contains(err.Error(), ended) {
				return nil
			}
		}
	}
	return err
}

func (e *Egress) Status(ctx context.Context, id string) (core.EgressInfo, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	list, err := e.c.egress.ListEgress(ctx, &lkp.ListEgressRequest{EgressId: id})
	if err != nil {
		return core.EgressInfo{}, err
	}
	if len(list.GetItems()) == 0 {
		return core.EgressInfo{Status: "EGRESS_ABORTED"}, nil // LiveKit forgot it
	}
	return info(list.GetItems()[0]), nil
}

func info(i *lkp.EgressInfo) core.EgressInfo {
	at := func(ns int64) time.Time {
		if ns == 0 {
			return time.Time{}
		}
		return time.Unix(0, ns)
	}
	out := core.EgressInfo{Status: i.GetStatus().String(), StartedAt: at(i.GetStartedAt()), EndedAt: at(i.GetEndedAt()), Error: i.GetError()}
	for _, f := range i.GetFileResults() {
		out.Files = append(out.Files, core.EgressFile{Filename: f.GetFilename(), SizeBytes: f.GetSize(), Duration: time.Duration(f.GetDuration())})
	}
	return out
}
