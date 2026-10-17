package ws

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"testing"

	"github.com/workadventure/workadventure/server-go/internal/auth"
	"github.com/workadventure/workadventure/server-go/internal/config"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"

	"github.com/workadventure/workadventure/server-go/internal/s3"
)

func TestAUsersFolderListsItsRecordingsNewestFirst(t *testing.T) {
	objects := []s3.Object{
		{Key: "u/recording-2026-10-17T09:00:00.mp4", Size: 10},
		{Key: "u/thumbnail-2026-10-17T09:00:00_00001.jpeg"},
		{Key: "u/thumbnail-2026-10-17T09:00:00_00000.jpeg"},
		{Key: "u/recording-2026-10-17T10:30:00.mp4", Size: 20},
		{Key: "u/thumbnail-2026-10-17T11:00:00_00000.jpeg"}, // thumbnails of a recording without its video yet
		{Key: "u/notes.txt"},
	}
	recordings, thumbnails := recordingsOf(objects)
	if len(recordings) != 2 || recordings[0].Timestamp != "2026-10-17T10:30:00" || recordings[1].GetVideoFile().GetFilename() != "recording-2026-10-17T09:00:00.mp4" {
		t.Fatalf("%v", recordings)
	}
	if got := thumbnails["2026-10-17T09:00:00"]; len(got) != 2 || got[0] != "u/thumbnail-2026-10-17T09:00:00_00000.jpeg" {
		t.Fatalf("thumbnails in order: %v", got)
	}
}

// fakeBucket is an S3 bucket "rec" holding two users' recordings; it records the requests it gets.
func fakeBucket(t *testing.T) (*httptest.Server, func() []string) {
	t.Helper()
	keys := []string{"alice/recording-2026-10-17T09:00:00.mp4", "alice/thumbnail-2026-10-17T09:00:00_00000.jpeg",
		"bob/recording-2026-10-17T09:00:00.mp4"}
	var mu sync.Mutex
	var calls []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		calls = append(calls, r.Method+" "+r.URL.Path+" "+r.URL.Query().Get("prefix"))
		mu.Unlock()
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		prefix := r.URL.Query().Get("prefix")
		var b strings.Builder
		b.WriteString(`<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>rec</Name><IsTruncated>false</IsTruncated>`)
		for _, k := range keys {
			if strings.HasPrefix(k, prefix) {
				fmt.Fprintf(&b, "<Contents><Key>%s</Key><Size>10</Size></Contents>", k)
			}
		}
		b.WriteString("</ListBucketResult>")
		w.Header().Set("Content-Type", "application/xml")
		_, _ = io.WriteString(w, b.String())
	}))
	t.Cleanup(srv.Close)
	return srv, func() []string { mu.Lock(); defer mu.Unlock(); return append([]string(nil), calls...) }
}

// A player lists, deletes and downloads its own recordings only.
func TestAPlayerOnlyReachesItsOwnRecordings(t *testing.T) {
	h := newHarness(t)
	bucket, calls := fakeBucket(t)
	h.srv.cfg.RecordingConfigured = true
	h.srv.cfg.RecordingS3 = config.RecordingS3{Endpoint: bucket.URL, Region: "eu", Bucket: "rec", AccessKey: "k", Secret: "s"}
	alice := h.dialAs(auth.Token{Identifier: "alice"}, "")
	ask := func(id int32, q *pb.QueryMessage) *pb.AnswerMessage {
		alice.query(id, q)
		var got *pb.AnswerMessage
		alice.waitFor("the answer", func(d *pb.ServerToClientMessage, _ *pb.SubMessage) bool {
			got = d.GetAnswerMessage()
			return got.GetId() == id
		})
		return got
	}

	list := ask(1, &pb.QueryMessage{Query: &pb.QueryMessage_GetRecordingsQuery{GetRecordingsQuery: &pb.GetRecordingsQuery{}}}).GetGetRecordingsAnswer().GetRecordings()
	if len(list) != 1 || list[0].GetVideoFile().GetKey() != "alice/recording-2026-10-17T09:00:00.mp4" || list[0].GetPosterUrl() == "" {
		t.Fatalf("alice's recordings: %v", list)
	}
	for _, key := range []string{"bob/recording-2026-10-17T09:00:00.mp4", "alice/../bob/recording-2026-10-17T09:00:00.mp4"} {
		if a := ask(2, &pb.QueryMessage{Query: &pb.QueryMessage_GetSignedUrlQuery{GetSignedUrlQuery: &pb.GetSignedUrlQuery{Key: key}}}); a.GetError().GetMessage() != "Forbidden" {
			t.Fatalf("%s: %v", key, a)
		}
	}
	if u := ask(3, &pb.QueryMessage{Query: &pb.QueryMessage_GetSignedUrlQuery{GetSignedUrlQuery: &pb.GetSignedUrlQuery{Key: "alice/recording-2026-10-17T09:00:00.mp4"}}}).
		GetGetSignedUrlAnswer().GetSignedUrl(); !strings.Contains(u, "/rec/alice/recording-") || !strings.Contains(u, "X-Amz-Signature=") {
		t.Fatalf("her own: %q", u)
	}
	if a := ask(4, &pb.QueryMessage{Query: &pb.QueryMessage_DeleteRecordingQuery{DeleteRecordingQuery: &pb.DeleteRecordingQuery{
		RecordingId: "../bob/recording-2026-10-17T09:00:00.mp4"}}}).GetDeleteRecordingAnswer(); a.GetSuccess() {
		t.Fatal("a path out of her folder is refused")
	}
	if a := ask(5, &pb.QueryMessage{Query: &pb.QueryMessage_DeleteRecordingQuery{DeleteRecordingQuery: &pb.DeleteRecordingQuery{
		RecordingId: "recording-2026-10-17T09:00:00.mp4"}}}).GetDeleteRecordingAnswer(); !a.GetSuccess() {
		t.Fatalf("her own: %v", a)
	}
	for _, c := range calls() {
		if strings.Contains(c, "bob") {
			t.Fatalf("the bucket was asked about bob's folder: %v", calls())
		}
	}
	if !slices.Contains(calls(), "DELETE /rec/alice/thumbnail-2026-10-17T09:00:00_00000.jpeg ") ||
		!slices.Contains(calls(), "DELETE /rec/alice/recording-2026-10-17T09:00:00.mp4 ") {
		t.Fatalf("the video and its thumbnails are deleted: %v", calls())
	}
}
