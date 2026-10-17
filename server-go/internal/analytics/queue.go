// Package analytics sends the analytics events to the admin, in batches (A22, POST /api/analytics/events-batch):
// the transport of libs/shared-utils/src/AnalyticsEventsQueue.ts, for the events of the pusher and of the back.
package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Event is a stored event (analyticsStoredEvent).
type Event struct {
	EventName        string         `json:"eventName"`
	Source           string         `json:"source"`
	ClientEventTime  string         `json:"clientEventTime"`
	PusherReceivedAt string         `json:"pusherReceivedAt"`
	EventID          string         `json:"eventId"`
	UserUUID         string         `json:"userUuid"`
	UserID           *int32         `json:"userId"`
	SpaceUserID      string         `json:"spaceUserId"`
	ClientIP         *string        `json:"clientIp"`
	World            string         `json:"world"`
	RoomID           string         `json:"roomId"`
	TabID            *string        `json:"tabId"`
	Tags             []string       `json:"tags,omitempty"`
	Properties       map[string]any `json:"properties"`
}

// Time formats an instant like Date.toISOString.
func Time(t time.Time) string { return t.UTC().Format("2006-01-02T15:04:05.000Z") }

type Config struct {
	AdminURL, Token, InstanceID string
	FlushInterval, Timeout      time.Duration
	MaxQueue, MaxBatch          int
}

const maxAttempts = 4

var (
	errInvalid  = errors.New("invalid batch (422)")
	errRejected = errors.New("rejected")
)

type Queue struct {
	cfg      Config
	client   *http.Client
	mu       sync.Mutex
	events   []Event
	enabled  bool
	flushing sync.Mutex
	dropped  int // on overflow, invalid, or after a failed send
}

// New returns a queue that sends nothing until SetEnabled(true), nor ever without an admin URL and token.
func New(cfg Config) *Queue {
	return &Queue{cfg: cfg, client: &http.Client{}}
}

func (q *Queue) canSend() bool {
	return q != nil && q.enabled && q.cfg.AdminURL != "" && q.cfg.Token != "" && q.cfg.MaxQueue > 0 && q.cfg.MaxBatch > 0
}

// SetEnabled turns the queue on or off; off forgets what waits.
func (q *Queue) SetEnabled(on bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.enabled = on
	if !on {
		q.events = nil
	}
}

// Enqueue adds an event; a full queue drops its oldest one.
func (q *Queue) Enqueue(e Event) {
	if q == nil {
		return
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	if !q.canSend() {
		return
	}
	if len(q.events) >= q.cfg.MaxQueue {
		q.events = q.events[1:]
		q.dropped++
	}
	q.events = append(q.events, e)
}

// Run flushes every FlushInterval until ctx ends.
func (q *Queue) Run(ctx context.Context) {
	if q == nil || q.cfg.FlushInterval <= 0 {
		return
	}
	t := time.NewTicker(q.cfg.FlushInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			q.Flush(ctx)
		}
	}
}

// Drain sends what waits, until timeout.
func (q *Queue) Drain(timeout time.Duration) {
	if q == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	for n := q.pending(); n > 0 && ctx.Err() == nil; n = q.pending() {
		q.Flush(ctx)
		if q.pending() == n { // another flush is sending
			time.Sleep(50 * time.Millisecond)
		}
	}
}

func (q *Queue) pending() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.events)
}

// Flush sends one batch of at most MaxBatch events.
func (q *Queue) Flush(ctx context.Context) {
	if !q.flushing.TryLock() {
		return
	}
	defer q.flushing.Unlock()
	q.mu.Lock()
	if !q.canSend() || len(q.events) == 0 {
		q.mu.Unlock()
		return
	}
	n := min(len(q.events), q.cfg.MaxBatch)
	batch := q.events[:n:n]
	q.events = q.events[n:]
	q.mu.Unlock()

	err := q.send(ctx, batch)
	if errors.Is(err, errInvalid) && len(batch) > 1 { // keep the valid ones
		for i, e := range batch {
			if err = q.send(ctx, []Event{e}); errors.Is(err, errInvalid) {
				q.drop(1, err)
			} else if err != nil {
				q.drop(len(batch)-i, err)
				return
			}
		}
		return
	}
	if err != nil {
		q.drop(len(batch), err)
	}
}

func (q *Queue) drop(n int, err error) {
	q.mu.Lock()
	q.dropped += n
	q.mu.Unlock()
	slog.Warn("analytics events lost", "count", n, "error", err)
}

// send posts one batch, trying again on a network error, a 5xx, a 408 or a 429.
func (q *Queue) send(ctx context.Context, events []Event) error {
	body, err := json.Marshal(map[string]any{"schemaVersion": 1, "sentAt": Time(time.Now()), "pusherInstanceId": q.cfg.InstanceID, "events": events})
	if err != nil {
		return err
	}
	url := strings.TrimRight(q.cfg.AdminURL, "/") + "/api/analytics/events-batch"
	for attempt := 0; ; attempt++ {
		status, err := q.post(ctx, url, body)
		switch {
		case err == nil && status/100 == 2:
			return nil
		case err == nil && status == http.StatusUnprocessableEntity:
			return errInvalid
		case err == nil && status/100 == 4 && status != http.StatusRequestTimeout && status != http.StatusTooManyRequests:
			return fmt.Errorf("%w: HTTP %d", errRejected, status)
		case err == nil:
			err = fmt.Errorf("HTTP %d", status)
		}
		if attempt == maxAttempts-1 {
			return err
		}
		wait := min(250*time.Millisecond<<attempt, 5*time.Second) + time.Duration(50+rand.IntN(201))*time.Millisecond
		if d, ok := ctx.Deadline(); ok && time.Until(d) < wait {
			return err // the drain's deadline comes first
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}
	}
}

func (q *Queue) post(ctx context.Context, url string, body []byte) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, q.cfg.Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+q.cfg.Token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := q.client.Do(req)
	if err != nil {
		return 0, err
	}
	resp.Body.Close()
	return resp.StatusCode, nil
}
