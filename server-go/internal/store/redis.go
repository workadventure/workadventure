package store

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"
	"time"
)

// Redis speaks the few commands the variables need (RESP2) over a small pool of connections: the joins of a room
// read their variables side by side. A connection that fails is closed; the next command dials a new one.
type Redis struct {
	addr, password string
	db             int           // SELECTed on each connection when not 0
	slots          chan struct{} // one per connection in use; at most poolSize
	idle           chan *redisConn
}

// poolSize bounds the connections to Redis. The variable writes come one at a time, in order (Writer).
const poolSize = 8

type redisConn struct {
	net.Conn
	r *bufio.Reader
}

func NewRedis(addr, password string) *Redis {
	return &Redis{addr: addr, password: password, slots: make(chan struct{}, poolSize), idle: make(chan *redisConn, poolSize)}
}

func (c *Redis) do(ctx context.Context, args ...string) (any, error) {
	select {
	case c.slots <- struct{}{}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	defer func() { <-c.slots }()
	var conn *redisConn
	select {
	case conn = <-c.idle:
	default:
		var err error
		if conn, err = c.dial(ctx); err != nil {
			return nil, err
		}
	}
	reply, err := conn.roundTrip(ctx, args)
	var redisErr replyError
	if err != nil && !errors.As(err, &redisErr) {
		conn.Close()
		return nil, err
	}
	c.idle <- conn // never blocks: there are at most poolSize connections
	return reply, err
}

func (c *Redis) dial(ctx context.Context) (*redisConn, error) {
	var d net.Dialer
	nc, err := d.DialContext(ctx, "tcp", c.addr)
	if err != nil {
		return nil, err
	}
	conn := &redisConn{Conn: nc, r: bufio.NewReader(nc)}
	if c.password != "" {
		if _, err := conn.roundTrip(ctx, []string{"AUTH", c.password}); err != nil {
			conn.Close()
			return nil, err
		}
	}
	if c.db != 0 {
		if _, err := conn.roundTrip(ctx, []string{"SELECT", strconv.Itoa(c.db)}); err != nil {
			conn.Close()
			return nil, err
		}
	}
	return conn, nil
}

// WithDB is a client of the same Redis on database db (REDIS_DB_NUMBER of the uploader).
func (c *Redis) WithDB(db int) *Redis {
	r := NewRedis(c.addr, c.password)
	r.db = db
	return r
}

func (c *redisConn) roundTrip(ctx context.Context, args []string) (any, error) {
	deadline := time.Now().Add(2 * time.Second)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	_ = c.SetDeadline(deadline)
	if _, err := c.Write(command(args)); err != nil {
		return nil, err
	}
	return readReply(c.r)
}

func command(args []string) []byte {
	b := []byte("*" + strconv.Itoa(len(args)) + "\r\n")
	for _, a := range args {
		b = append(b, "$"+strconv.Itoa(len(a))+"\r\n"+a+"\r\n"...)
	}
	return b
}

type replyError string

func (e replyError) Error() string { return "redis: " + string(e) }

func readReply(r *bufio.Reader) (any, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return nil, err
	}
	if len(line) < 3 {
		return nil, fmt.Errorf("redis: bad reply %q", line)
	}
	body := line[1 : len(line)-2]
	switch line[0] {
	case '+':
		return body, nil
	case '-':
		return nil, replyError(body)
	case ':':
		return strconv.ParseInt(body, 10, 64)
	case '$':
		n, err := strconv.Atoi(body)
		if err != nil || n < 0 {
			return nil, err
		}
		buf := make([]byte, n+2)
		if _, err := ioReadFull(r, buf); err != nil {
			return nil, err
		}
		return string(buf[:n]), nil
	case '*':
		n, err := strconv.Atoi(body)
		if err != nil || n < 0 {
			return nil, err
		}
		items := make([]any, n)
		for i := range items {
			if items[i], err = readReply(r); err != nil {
				return nil, err
			}
		}
		return items, nil
	}
	return nil, fmt.Errorf("redis: bad reply %q", line)
}

func ioReadFull(r *bufio.Reader, buf []byte) (int, error) {
	n := 0
	for n < len(buf) {
		m, err := r.Read(buf[n:])
		n += m
		if err != nil {
			return n, err
		}
	}
	return n, nil
}

func (c *Redis) HGetAll(ctx context.Context, key string) (map[string]string, error) {
	reply, err := c.do(ctx, "HGETALL", key)
	if err != nil {
		return nil, err
	}
	items, _ := reply.([]any)
	out := make(map[string]string, len(items)/2)
	for i := 0; i+1 < len(items); i += 2 {
		k, _ := items[i].(string)
		v, _ := items[i+1].(string)
		out[k] = v
	}
	return out, nil
}

func (c *Redis) HSet(ctx context.Context, key, field, value string) error {
	_, err := c.do(ctx, "HSET", key, field, value)
	return err
}

func (c *Redis) HDel(ctx context.Context, key, field string) error {
	_, err := c.do(ctx, "HDEL", key, field)
	return err
}

func (c *Redis) Expire(ctx context.Context, key string, d time.Duration) error {
	_, err := c.do(ctx, "EXPIRE", key, strconv.Itoa(int(d.Seconds())))
	return err
}

// Get reads a string key; ok is false when there is none.
func (c *Redis) Get(ctx context.Context, key string) (value string, ok bool, err error) {
	reply, err := c.do(ctx, "GET", key)
	if err != nil || reply == nil {
		return "", false, err
	}
	s, ok := reply.(string)
	return s, ok, nil
}

// Set writes a string key, expiring after ttl unless it is 0.
func (c *Redis) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	args := []string{"SET", key, value}
	if ttl > 0 {
		args = append(args, "EX", strconv.Itoa(max(1, int(ttl.Seconds()))))
	}
	_, err := c.do(ctx, args...)
	return err
}

// SetNX writes a key only if it does not exist, expiring after ttl; ok tells whether it was written.
func (c *Redis) SetNX(ctx context.Context, key, value string, ttl time.Duration) (bool, error) {
	reply, err := c.do(ctx, "SET", key, value, "NX", "EX", strconv.Itoa(max(1, int(ttl.Seconds()))))
	return reply != nil && err == nil, err
}

func (c *Redis) Del(ctx context.Context, key string) error {
	_, err := c.do(ctx, "DEL", key)
	return err
}
