package store

import (
	"bufio"
	"context"
	"errors"
	"net"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeRedis answers HGETALL with one field, and +OK to anything else.
func fakeRedis(t *testing.T) string { return slowRedis(t, 0) }

// slowRedis is fakeRedis taking delay to answer each HGETALL.
func slowRedis(t *testing.T, delay time.Duration) string {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func() {
				r := bufio.NewReader(conn)
				for {
					v, err := readReply(r)
					if err != nil {
						return
					}
					args := v.([]any)
					if args[0] == "HGETALL" {
						time.Sleep(delay)
						_, _ = conn.Write([]byte("*2\r\n$6\r\nfield1\r\n$11\r\n\"some json\"\r\n"))
					} else {
						_, _ = conn.Write([]byte("+OK\r\n"))
					}
				}
			}()
		}
	}()
	return ln.Addr().String()
}

func TestRedisSpeaksRESP(t *testing.T) {
	c := NewRedis(fakeRedis(t), "secret")
	m, err := c.HGetAll(context.Background(), "http://play/_/global/maps/m.json")
	if err != nil || m["field1"] != `"some json"` {
		t.Fatalf("%v %v", m, err)
	}
	if err := c.HSet(context.Background(), "k", "f", "v"); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(command([]string{"HSET", "k", "f", "v"})), "*4\r\n$4\r\nHSET\r\n") {
		t.Fatal("command encoding")
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

func TestPlayersJoiningTogetherReadTheirVariablesSideBySide(t *testing.T) {
	c := NewRedis(slowRedis(t, 200*time.Millisecond), "")
	start := time.Now()
	var wg sync.WaitGroup
	for range poolSize {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := c.HGetAll(context.Background(), "room"); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if d := time.Since(start); d > time.Second {
		t.Fatalf("%d reads of 200 ms took %v: they waited for each other", poolSize, d)
	}
}
