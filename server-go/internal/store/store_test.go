package store

import (
	"bufio"
	"context"
	"net"
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
	done := make(chan struct{})
	w.enqueue(func(context.Context) error { close(done); return nil })
	<-done
	if got := Load(m, "room"); len(got) != 1 || got["b"] != `"2"` {
		t.Fatalf("%v", got)
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
