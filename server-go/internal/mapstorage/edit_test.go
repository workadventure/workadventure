package mapstorage

import (
	"errors"
	"slices"
	"testing"
	"time"
)

// An edit is computed on a copy, without lock, then written only if the document is still that version.

func TestAnEditComputedOnAnOlderMapNeverOverwritesANewerOne(t *testing.T) {
	s := New(t.TempDir())
	_ = s.Put("maps/office.wam", []byte("v10"))
	computing, release := make(chan struct{}), make(chan struct{})
	done := make(chan error)
	var seen []string
	go func() {
		done <- s.Edit("maps/office.wam", func(file []byte) ([]byte, error) {
			seen = append(seen, string(file))
			if len(seen) == 1 {
				close(computing)
				<-release // a slow edit, computed on v10
			}
			return append(file, "+edit"...), nil
		})
	}()
	<-computing
	_ = s.Put("maps/office.wam", []byte("v11")) // meanwhile, someone stores v11
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	if got, _ := s.Read("maps/office.wam"); string(got) != "v11+edit" || !slices.Equal(seen, []string{"v10", "v11"}) {
		t.Fatalf("the edit is computed again on v11, never written over it: %q after %v", got, seen)
	}
}

func TestAnEditThatKeepsLosingTheRaceGivesUp(t *testing.T) {
	s := New(t.TempDir())
	_ = s.Put("maps/office.wam", []byte("v0"))
	n := 0
	err := s.Edit("maps/office.wam", func(file []byte) ([]byte, error) {
		n++
		_ = s.Put("maps/office.wam", []byte{'v', byte('0' + n)}) // the map changes during every attempt
		return []byte("edited"), nil
	})
	if !errors.Is(err, ErrBusy) || n != editAttempts {
		t.Fatalf("refused after %d attempts: %v", n, err)
	}
	if got, _ := s.Read("maps/office.wam"); string(got) == "edited" {
		t.Fatal("a refused edit writes nothing")
	}
}

func TestEditsOfTwoMapsDoNotWaitForEachOther(t *testing.T) {
	s := New(t.TempDir())
	computing, release, officeDone := make(chan struct{}), make(chan struct{}), make(chan error, 1)
	go func() {
		officeDone <- s.Edit("maps/office.wam", func([]byte) ([]byte, error) { close(computing); <-release; return []byte("office"), nil })
	}()
	<-computing
	done := make(chan error)
	go func() {
		done <- s.Edit("maps/garden.wam", func([]byte) ([]byte, error) { return []byte("garden"), nil })
	}()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the garden waited for the office")
	}
	close(release)
	// The office still writes its file: the test's directory is removed once it is done.
	if err := <-officeDone; err != nil {
		t.Fatal(err)
	}
}

func TestAMissingDocumentIsCreatedByAnEdit(t *testing.T) {
	s := New(t.TempDir())
	err := s.Edit("assets/entities/entities.json", func(file []byte) ([]byte, error) {
		if file != nil {
			t.Fatal("nothing yet: nil")
		}
		return []byte("{}"), nil
	})
	if got, _ := s.Read("assets/entities/entities.json"); err != nil || string(got) != "{}" {
		t.Fatalf("%v %q", err, got)
	}
}

// The edits a client missed (lastCommandId).

func TestAClientThatReconnectsGetsOnlyTheEditsItMissed(t *testing.T) {
	s := New(t.TempDir())
	for _, id := range []string{"e1", "e2", "e3"} {
		s.Record("maps/office.wam", id, id)
	}
	s.Record("maps/garden.wam", "g1", "g1")
	if got := s.Since("maps/office.wam", "e1"); !slices.Equal(got, []any{"e2", "e3"}) {
		t.Fatalf("after e1: %v", got)
	}
	if got := s.Since("maps/office.wam", "e3"); len(got) != 0 {
		t.Fatalf("up to date: %v", got)
	}
	if got := s.Since("maps/office.wam", ""); len(got) != 3 {
		t.Fatalf("a client that knows no edit gets the recent ones: %v", got)
	}
}

func TestReplacingAMapForgetsItsEdits(t *testing.T) {
	hs := newHarness(t)
	hs.s.Record("maps/office.wam", "e1", "e1")
	if w := hs.do("PUT", "/maps/office.wam", []byte(wamFile), "application/json"); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if got := hs.s.Since("maps/office.wam", ""); len(got) != 0 {
		t.Fatalf("a client of the new file must not replay the old edits: %v", got)
	}
}
