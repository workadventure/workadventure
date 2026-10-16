package ws

import (
	"testing"

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
