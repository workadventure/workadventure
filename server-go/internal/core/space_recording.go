package core

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/spacestate"
)

// Recording a space (RecordingManager of the back): one recording at a time, by one member. The space moves to
// LiveKit, a LiveKit egress records its room into S3, and the space state tells everyone: starting, recording,
// stopping, then idle once the file is written, which is when the front lists it. The egress is watched by
// asking its status (the back waited for LiveKit's webhooks); it stops when the recorder leaves, or when nobody
// streams any more.

// Egress records LiveKit rooms. Its calls run off the space's goroutine.
type Egress interface {
	Start(ctx context.Context, room string, recorder SpaceUser) (egressID string, err error)
	Stop(ctx context.Context, egressID string) error
	// Status is the egress status of LiveKit: EGRESS_STARTING, EGRESS_ACTIVE, EGRESS_ENDING, EGRESS_COMPLETE,
	// EGRESS_FAILED, EGRESS_ABORTED or EGRESS_LIMIT_REACHED.
	Status(ctx context.Context, egressID string) (string, error)
}

// recordingPoll is how often a running egress is asked for its status.
var recordingPoll = time.Second

type recording struct {
	recorder  SpaceUser
	egressID  string
	status    spacestate.RecordingStatus
	stopAsked bool // stop asked while starting
	starting  []func(error)
	gen       int
}

func (s *spaceState) publishRecording(status spacestate.RecordingStatus, recorder string) {
	r := recorder
	_ = s.updateState(func(st *spacestate.SpaceState) error {
		st.Recording = spacestate.RecordingState{Recording: status == spacestate.RecordingStatusRecording || status == spacestate.RecordingStatusStopping,
			Recorder: &r, Status: status}
		if recorder == "" {
			st.Recording.Recorder = nil
		}
		return nil
	})
}

// startRecording answers StartRecording once the egress runs, or why not.
func (s *spaceState) startRecording(sender *SpaceUser, reply func(error)) {
	egress := s.mediaCfg.Egress
	if egress == nil || s.mediaCfg.LiveKit == nil || !s.media {
		reply(ErrNoRecording)
		return
	}
	if r := s.rec; r != nil {
		if r.recorder.ID != sender.ID {
			reply(map[spacestate.RecordingStatus]error{
				spacestate.RecordingStatusStarting:  errors.New("Recording is already starting"),
				spacestate.RecordingStatusRecording: errors.New("Recording already started"),
				spacestate.RecordingStatusStopping:  errors.New("Recording is already stopping"),
			}[r.status])
			return
		}
		if r.status == spacestate.RecordingStatusStarting {
			r.starting = append(r.starting, reply)
		} else {
			reply(nil)
		}
		return
	}
	s.recGen++
	s.rec = &recording{recorder: *sender, status: spacestate.RecordingStatusStarting, starting: []func(error){reply}, gen: s.recGen}
	s.publishRecording(spacestate.RecordingStatusStarting, sender.ID)
	if s.strategy != strategyLiveKit {
		s.switchTo(strategyLiveKit) // a recording is a LiveKit room
	}
	s.lkSync()
	s.recordWhenReady()
}

// recordWhenReady starts the egress once the LiveKit room exists (lkSync calls it again when it is ready).
func (s *spaceState) recordWhenReady() {
	r := s.rec
	if r == nil || r.egressID != "" || r.status != spacestate.RecordingStatusStarting || s.lk.room != lkReady {
		return
	}
	r.egressID = "pending"
	gen, room, recorder, egress := r.gen, s.roomName, r.recorder, s.mediaCfg.Egress
	go func() {
		id, err := egress.Start(context.Background(), room, recorder)
		s.later(func() {
			r := s.rec
			if r == nil || r.gen != gen {
				if err == nil {
					go func() { _ = egress.Stop(context.Background(), id) }() // the space moved on meanwhile
				}
				return
			}
			if err != nil {
				slog.Error("cannot start the recording", "room", room, "error", err)
				s.endRecording(errors.New("Failed to start recording"))
				return
			}
			r.egressID = id
			s.watchEgress(gen)
		})
	}()
}

// watchEgress asks the egress for its status until it ends.
func (s *spaceState) watchEgress(gen int) {
	time.AfterFunc(recordingPoll, func() {
		var id string
		var egress Egress
		ok := make(chan bool, 1)
		s.later(func() {
			if r := s.rec; r != nil && r.gen == gen {
				id, egress = r.egressID, s.mediaCfg.Egress
				ok <- true
				return
			}
			ok <- false
		})
		select {
		case still := <-ok:
			if !still {
				return
			}
		case <-time.After(10 * time.Second): // the space stopped
			return
		}
		status, err := egress.Status(context.Background(), id)
		s.later(func() {
			r := s.rec
			if r == nil || r.gen != gen {
				return
			}
			switch {
			case err != nil:
				slog.Warn("cannot read the recording's status", "error", err)
			case status == "EGRESS_ACTIVE" && r.status == spacestate.RecordingStatusStarting:
				r.status = spacestate.RecordingStatusRecording
				s.publishRecording(r.status, r.recorder.ID)
				for _, reply := range r.starting {
					reply(nil)
				}
				r.starting = nil
				if r.stopAsked {
					s.stopEgress()
				}
			case status == "EGRESS_COMPLETE" || status == "EGRESS_FAILED" || status == "EGRESS_ABORTED" || status == "EGRESS_LIMIT_REACHED":
				if r.status != spacestate.RecordingStatusStopping {
					slog.Warn("the recording ended by itself", "room", s.roomName, "status", status)
				}
				s.endRecording(nil)
				return
			}
			s.watchEgress(gen)
		})
	})
}

// endRecording goes back to idle; the recorder stays in the state, which is how the front tells it its file is ready.
func (s *spaceState) endRecording(startErr error) {
	r := s.rec
	if r == nil {
		return
	}
	s.rec = nil
	for _, reply := range r.starting {
		reply(startErr)
	}
	s.publishRecording(spacestate.RecordingStatusIdle, r.recorder.ID)
	s.evaluate() // the space may go back to WebRTC now
}

// stopRecording is StopRecording: only the recorder stops it.
func (s *spaceState) stopRecording(sender *SpaceUser) error {
	r := s.rec
	if r == nil {
		return errors.New("No recording in progress")
	}
	if r.recorder.ID != sender.ID {
		return errors.New("User is not the one recording")
	}
	s.stopByServer()
	return nil
}

// stopByServer stops the recording, whoever asks: the recorder left, nobody streams any more.
func (s *spaceState) stopByServer() {
	r := s.rec
	if r == nil {
		return
	}
	if r.status == spacestate.RecordingStatusStarting {
		if r.egressID == "" { // the egress was not started yet: nothing to stop
			s.endRecording(errors.New("Recording stopped before it started"))
			return
		}
		r.stopAsked = true
		return
	}
	if r.status == spacestate.RecordingStatusRecording {
		s.stopEgress()
	}
}

func (s *spaceState) stopEgress() {
	r := s.rec
	r.status = spacestate.RecordingStatusStopping
	s.publishRecording(r.status, r.recorder.ID)
	id, gen, egress := r.egressID, r.gen, s.mediaCfg.Egress
	go func() {
		if err := egress.Stop(context.Background(), id); err != nil {
			slog.Warn("cannot stop the recording, it will end by itself", "error", err)
			_ = gen
		}
	}()
}
