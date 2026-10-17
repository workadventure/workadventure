package ws

import (
	"context"
	"path"
	"regexp"
	"slices"
	"strings"
	"time"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/s3"
)

// The recordings of a user, in the S3 bucket under its uuid (RecordingService of the pusher): one MP4 per
// recording, and its thumbnails, both named after the time the recording started.

var recordingFile = regexp.MustCompile(`^(recording|thumbnail)-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})`)

func (srv *Server) recordingBucket() *s3.Client {
	if !srv.cfg.RecordingConfigured {
		return nil
	}
	r := srv.cfg.RecordingS3
	return s3.New(r.Endpoint, r.Region, r.Bucket, r.AccessKey, r.Secret)
}

// recordingsOf groups the objects of a user's folder by recording, newest first; a group without its video is left out.
func recordingsOf(objects []s3.Object) (recordings []*pb.Recording, thumbnails map[string][]string) {
	thumbnails = map[string][]string{}
	videos := map[string]s3.Object{}
	for _, o := range objects {
		m := recordingFile.FindStringSubmatch(path.Base(o.Key))
		if m == nil {
			continue
		}
		if m[1] == "recording" && strings.HasSuffix(o.Key, ".mp4") {
			videos[m[2]] = o
		} else if m[1] == "thumbnail" {
			thumbnails[m[2]] = append(thumbnails[m[2]], o.Key)
		}
	}
	for ts, v := range videos {
		size := v.Size
		slices.Sort(thumbnails[ts])
		recordings = append(recordings, &pb.Recording{Timestamp: ts, BaseFilename: "recording-" + ts,
			VideoFile: &pb.VideoFile{Key: v.Key, Filename: path.Base(v.Key), Size: &size}})
	}
	slices.SortFunc(recordings, func(a, b *pb.Recording) int { return strings.Compare(b.Timestamp, a.Timestamp) })
	return recordings, thumbnails
}

func (s *Session) getRecordings(id int32) {
	bucket := s.srv.recordingBucket()
	if bucket == nil || s.info.userUUID == "" {
		s.answerError(id, "Recording is not available on this server")
		return
	}
	ctx, cancel := context.WithTimeout(s.ctx, 10*time.Second)
	defer cancel()
	objects, err := bucket.List(ctx, s.info.userUUID+"/")
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	recordings, thumbnails := recordingsOf(objects)
	for _, r := range recordings {
		if t := thumbnails[r.Timestamp]; len(t) > 0 {
			poster := t[min(1, len(t)-1)] // the second one: the first is often black
			r.PosterUrl, _ = bucket.Presign(s.srv.cfg.RecordingS3.CDNEndpoint, poster, time.Hour, false)
		}
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_GetRecordingsAnswer{GetRecordingsAnswer: &pb.GetRecordingsAnswer{Recordings: recordings}}})
}

func (s *Session) deleteRecording(id int32, recordingID string) {
	bucket := s.srv.recordingBucket()
	m := recordingFile.FindStringSubmatch(recordingID)
	if bucket == nil || m == nil || strings.ContainsAny(recordingID, "/\\") {
		s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_DeleteRecordingAnswer{DeleteRecordingAnswer: &pb.DeleteRecordingAnswer{
			ErrorMessage: ptr("Invalid recording")}}})
		return
	}
	ctx, cancel := context.WithTimeout(s.ctx, 10*time.Second)
	defer cancel()
	prefix := s.info.userUUID + "/"
	objects, err := bucket.List(ctx, prefix+"thumbnail-"+m[2])
	if err == nil {
		err = bucket.Delete(ctx, prefix+recordingID)
	}
	for _, o := range objects {
		if err == nil {
			err = bucket.Delete(ctx, o.Key)
		}
	}
	answer := &pb.DeleteRecordingAnswer{Success: err == nil}
	if err != nil {
		answer.ErrorMessage = ptr(err.Error())
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_DeleteRecordingAnswer{DeleteRecordingAnswer: answer}})
}

// recordingThumbnails: up to 15 thumbnails, evenly spread over the recording.
func (s *Session) recordingThumbnails(id int32, base string) {
	bucket := s.srv.recordingBucket()
	m := recordingFile.FindStringSubmatch(base)
	urls := []string{}
	if bucket != nil && m != nil && !strings.ContainsAny(base, "/\\") {
		ctx, cancel := context.WithTimeout(s.ctx, 10*time.Second)
		defer cancel()
		if objects, err := bucket.List(ctx, s.info.userUUID+"/thumbnail-"+m[2]); err == nil {
			keys := make([]string, 0, len(objects))
			for _, o := range objects {
				keys = append(keys, o.Key)
			}
			slices.Sort(keys)
			step := max(1, (len(keys)+14)/15)
			for i := 0; i < len(keys) && len(urls) < 15; i += step {
				if u, err := bucket.Presign(s.srv.cfg.RecordingS3.CDNEndpoint, keys[i], time.Hour, false); err == nil {
					urls = append(urls, u)
				}
			}
		}
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_GetRecordingThumbnailsAnswer{GetRecordingThumbnailsAnswer: &pb.GetRecordingThumbnailsAnswer{Urls: urls}}})
}

// signedURL lets the user download one of its own recordings for 2 h.
func (s *Session) signedURL(id int32, key string) {
	bucket := s.srv.recordingBucket()
	if bucket == nil || s.info.userUUID == "" || !strings.HasPrefix(key, s.info.userUUID+"/") || strings.Contains(key, "..") {
		s.answerError(id, "Forbidden")
		return
	}
	u, err := bucket.Presign(s.srv.cfg.RecordingS3.CDNEndpoint, key, 2*time.Hour, true)
	if err != nil {
		s.answerError(id, err.Error())
		return
	}
	s.answer(id, &pb.AnswerMessage{Answer: &pb.AnswerMessage_GetSignedUrlAnswer{GetSignedUrlAnswer: &pb.GetSignedUrlAnswer{SignedUrl: u}}})
}

func ptr(s string) *string { return &s }
