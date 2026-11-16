package store

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

// Redis is the go-redis client behind the few commands the variables, the uploader and the Matrix token need.
type Redis struct {
	opts *redis.Options
	c    *redis.Client
}

// poolSize bounds the connections to Redis: the joins of a room read their variables side by side, the variable
// writes come one at a time, in order (Writer).
const poolSize = 8

func NewRedis(addr, password string) *Redis {
	return newRedis(&redis.Options{Addr: addr, Password: password, PoolSize: poolSize,
		DialTimeout: 2 * time.Second, ReadTimeout: 2 * time.Second, WriteTimeout: 2 * time.Second})
}

func newRedis(o *redis.Options) *Redis { return &Redis{opts: o, c: redis.NewClient(o)} }

// WithDB is a client of the same Redis on database db (REDIS_DB_NUMBER of the uploader).
func (c *Redis) WithDB(db int) *Redis {
	o := *c.opts
	o.DB = db
	return newRedis(&o)
}

func (c *Redis) HGetAll(ctx context.Context, key string) (map[string]string, error) {
	return c.c.HGetAll(ctx, key).Result()
}

func (c *Redis) HSet(ctx context.Context, key, field, value string) error {
	return c.c.HSet(ctx, key, field, value).Err()
}

func (c *Redis) HDel(ctx context.Context, key, field string) error {
	return c.c.HDel(ctx, key, field).Err()
}

func (c *Redis) Expire(ctx context.Context, key string, d time.Duration) error {
	return c.c.Expire(ctx, key, d).Err()
}

// Get reads a string key; ok is false when there is none.
func (c *Redis) Get(ctx context.Context, key string) (value string, ok bool, err error) {
	value, err = c.c.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	}
	return value, err == nil, err
}

// Set writes a string key, expiring after ttl unless it is 0.
func (c *Redis) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	return c.c.Set(ctx, key, value, ttl).Err()
}

// SetNX writes a key only if it does not exist, expiring after ttl; ok tells whether it was written.
func (c *Redis) SetNX(ctx context.Context, key, value string, ttl time.Duration) (bool, error) {
	return c.c.SetNX(ctx, key, value, ttl).Result()
}

func (c *Redis) Del(ctx context.Context, key string) error { return c.c.Del(ctx, key).Err() }
