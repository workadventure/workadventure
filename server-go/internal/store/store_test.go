package store

import (
	"context"
	"errors"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

func TestRedisReadsAndWritesTheVariablesAndTheTokens(t *testing.T) {
	srv := miniredis.RunT(t)
	srv.RequireAuth("secret")
	c := NewRedis(srv.Addr(), "secret")
	ctx := context.Background()
	if err := c.HSet(ctx, "http://play/_/global/maps/m.json", "field1", `"some json"`); err != nil {
		t.Fatal(err)
	}
	m, err := c.HGetAll(ctx, "http://play/_/global/maps/m.json")
	if err != nil || m["field1"] != `"some json"` {
		t.Fatalf("%v %v", m, err)
	}
	if _, ok, err := c.Get(ctx, "none"); ok || err != nil {
		t.Fatalf("a missing key is not an error: %v %v", ok, err)
	}
	// The Synapse admin token lock (matrix.ShareThrough): only the first SET NX wins, until it expires.
	if ok, err := c.SetNX(ctx, "lock", "a", 30*time.Second); !ok || err != nil {
		t.Fatal(ok, err)
	}
	if ok, _ := c.SetNX(ctx, "lock", "b", 30*time.Second); ok {
		t.Fatal("a second SET NX must lose")
	}
	srv.FastForward(31 * time.Second)
	if ok, _ := c.SetNX(ctx, "lock", "b", 30*time.Second); !ok {
		t.Fatal("the lock expires")
	}
}

func TestMemoryAndWriter(t *testing.T) {
	m := NewMemory()
	w := NewWriter(m)
	w.Set("room", "a", `"1"`, 0)
	w.Set("room", "b", `"2"`, 0)
	w.Set("room", "a", "", 0)
	if err := w.Flush(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := Load(m, "room"); len(got) != 1 || got["b"] != `"2"` {
		t.Fatalf("%v", got)
	}
}

// flaky is a Hash that fails while down is set.
type flaky struct {
	*Memory
	mu   sync.Mutex
	down bool
}

func (f *flaky) HSet(ctx context.Context, key, field, value string) error {
	f.mu.Lock()
	down := f.down
	f.mu.Unlock()
	if down {
		return errors.New("connection refused")
	}
	return f.Memory.HSet(ctx, key, field, value)
}

func TestAVariableWrittenWhileRedisIsDownIsStoredWhenItComesBack(t *testing.T) {
	redis := &flaky{Memory: NewMemory(), down: true}
	w := NewWriter(redis)
	for i := range 10_000 { // far more writes than any queue would hold: only the last value of a field is kept
		w.Set("room", "score", strconv.Itoa(i), 0)
	}
	w.Set("room", "door", `"open"`, 0)
	time.Sleep(300 * time.Millisecond)
	if n := w.Pending(); n != 2 {
		t.Fatalf("two fields wait for Redis, whatever the number of writes: %d", n)
	}
	redis.mu.Lock()
	redis.down = false
	redis.mu.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := w.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	if got := Load(redis, "room"); got["score"] != "9999" || got["door"] != `"open"` {
		t.Fatalf("the last values are stored, none is lost: %v", got)
	}
}

func TestFlushTellsHowManyWritesAreLost(t *testing.T) {
	w := NewWriter(&flaky{Memory: NewMemory(), down: true})
	w.Set("room", "a", "1", 0)
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	if err := w.Flush(ctx); err == nil {
		t.Fatal("Redis never came back: the write is reported lost")
	}
}

func TestTheUploadersRedisSelectsItsDatabase(t *testing.T) {
	srv := miniredis.RunT(t)
	srv.DB(1).Set("id.txt", "file")
	c := NewRedis(srv.Addr(), "")
	if _, ok, _ := c.Get(context.Background(), "id.txt"); ok {
		t.Fatal("the variables' database 0 does not have the uploader's files")
	}
	v, ok, err := c.WithDB(1).Get(context.Background(), "id.txt")
	if err != nil || !ok || v != "file" {
		t.Fatalf("%q %v %v", v, ok, err)
	}
}

// What a reader gets is the last value written, even while the write still waits for Redis: a room that starts
// again after its players left reads the value set during the outage, not the one stored before it.
func TestAReadSeesTheWritesRedisDidNotStoreYet(t *testing.T) {
	redis := &flaky{Memory: NewMemory()}
	_ = redis.Memory.HSet(context.Background(), "room", "door", `"closed"`)
	_ = redis.Memory.HSet(context.Background(), "room", "light", `"on"`)
	redis.down = true
	w := NewWriter(redis)
	w.Set("room", "door", `"open"`, 0)
	w.Set("room", "light", "", 0) // deleted
	w.Set("other", "x", "1", 0)
	got, _ := w.Read("room")
	if got["door"] != `"open"` || got["light"] != "" || len(got) != 1 {
		t.Fatalf("the pending writes on top of what Redis has: %v", got)
	}
	redis.mu.Lock()
	redis.down = false
	redis.mu.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := w.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	if got, _ := w.Read("room"); got["door"] != `"open"` || len(got) != 1 {
		t.Fatalf("once stored, the same: %v", got)
	}
}
