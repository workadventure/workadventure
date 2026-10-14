package store

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"
)

// Redis speaks the few commands the variables need (RESP2) over one connection, dialled again after an error.
// ponytail: one connection for the whole server; a pool if variables ever get busy.
type Redis struct {
	addr, password string
	mu             sync.Mutex
	conn           net.Conn
	r              *bufio.Reader
}

func NewRedis(addr, password string) *Redis { return &Redis{addr: addr, password: password} }

func (c *Redis) do(ctx context.Context, args ...string) (any, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == nil {
		if err := c.dial(ctx); err != nil {
			return nil, err
		}
	}
	reply, err := c.roundTrip(ctx, args)
	if err != nil {
		var redisErr replyError
		if !errors.As(err, &redisErr) {
			c.conn.Close()
			c.conn = nil
		}
	}
	return reply, err
}

func (c *Redis) dial(ctx context.Context) error {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", c.addr)
	if err != nil {
		return err
	}
	c.conn, c.r = conn, bufio.NewReader(conn)
	if c.password != "" {
		if _, err := c.roundTrip(ctx, []string{"AUTH", c.password}); err != nil {
			c.conn.Close()
			c.conn = nil
			return err
		}
	}
	return nil
}

func (c *Redis) roundTrip(ctx context.Context, args []string) (any, error) {
	deadline := time.Now().Add(2 * time.Second)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	_ = c.conn.SetDeadline(deadline)
	if _, err := c.conn.Write(command(args)); err != nil {
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
