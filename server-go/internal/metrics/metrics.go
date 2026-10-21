// Package metrics exposes /metrics with the gauges the WorkAdventure dashboards read, under the same names as the
// TS pusher and back. The Node.js runtime metrics (nodejs_*) are replaced by the Go ones (go_*, process_*).
package metrics

import (
	"context"
	"crypto/subtle"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	Sockets = promauto.NewGauge(prometheus.GaugeOpts{Name: "workadventure_nb_sockets", Help: "Number of connected sockets"})
	Rooms   = promauto.NewGauge(prometheus.GaugeOpts{Name: "workadventure_nb_rooms", Help: "Number of active rooms"})
	Spaces  = promauto.NewGauge(prometheus.GaugeOpts{Name: "workadventure_nb_spaces", Help: "Number of active spaces"})

	clientsPerRoom = promauto.NewGaugeVec(prometheus.GaugeOpts{Name: "workadventure_nb_clients_per_room", Help: "Number of clients per room"}, []string{"room"})

	// Position merging and backpressure (new: the TS services had neither).
	CoalescedPositions = promauto.NewCounter(prometheus.CounterOpts{Name: "workadventure_coalesced_position_updates_total", Help: "Position updates replaced by a newer one of the same player before being sent"})
	SlowConsumers      = promauto.NewCounter(prometheus.CounterOpts{Name: "workadventure_slow_consumers_closed_total", Help: "Connections closed because their outbound queue stayed full"})

	unhandledMessages = promauto.NewCounterVec(prometheus.CounterOpts{Name: "server_unhandled_messages_total", Help: "Client messages of a type the server does not handle, dropped"}, []string{"type"})
	unhandledLogged   sync.Map // type → struct{}: the types already logged

	// ResumeBufferBytes is what the sessions keep for a transport resume, under RESUME_BUFFER_BUDGET_BYTES.
	ResumeBufferBytes = promauto.NewGauge(prometheus.GaugeOpts{Name: "server_resume_buffer_bytes", Help: "Bytes of the frames kept for a transport resume"})

	// ActorPanics counts the panics an actor recovered, by kind of actor (room, space).
	ActorPanics = promauto.NewCounterVec(prometheus.CounterOpts{Name: "server_actor_panics_total", Help: "Panics recovered in an actor, whose state was then discarded"}, []string{"kind"})

	ignoredErrors = promauto.NewCounterVec(prometheus.CounterOpts{Name: "server_ignored_errors_total", Help: "Errors nobody could act on, that should not have happened"}, []string{"op"})
)

// Unhandled counts a client message of a type the server drops. The first of each type is logged at Warn, once per
// process: a front newer than the server would otherwise flood the logs. type is the name of a field of the message
// oneof, a bounded set.
func Unhandled(typ string) {
	unhandledMessages.WithLabelValues(typ).Inc()
	if _, logged := unhandledLogged.LoadOrStore(typ, struct{}{}); !logged {
		slog.Warn("client message not handled, dropped", "type", typ)
	}
}

// Ignore is for an error its caller cannot act on (nobody waits for an answer) but which should not happen: it is
// logged at Warn and counted under op, a fixed name, never a value of the request. A cancelled context is the
// caller going away (a closed connection, a shutdown), not a failure: it is neither logged nor counted.
func Ignore(op string, err error) {
	if err == nil || errors.Is(err, context.Canceled) {
		return
	}
	ignoredErrors.WithLabelValues(op).Inc()
	slog.Warn("error ignored", "op", op, "error", err)
}

var (
	roomCountsMu sync.Mutex
	roomCounts   = map[string]int{}
)

// ClientJoined and ClientLeft keep workadventure_nb_clients_per_room, removing the label of an empty room.
func ClientJoined(room string) { addClient(room, 1) }
func ClientLeft(room string)   { addClient(room, -1) }

func addClient(room string, d int) {
	roomCountsMu.Lock()
	defer roomCountsMu.Unlock()
	n := roomCounts[room] + d
	if n <= 0 {
		delete(roomCounts, room)
		clientsPerRoom.DeleteLabelValues(room)
		return
	}
	roomCounts[room] = n
	clientsPerRoom.WithLabelValues(room).Set(float64(n))
}

// Handler serves /metrics with the access rules of the TS PrometheusController: disabled (501) without a
// dedicated port or a token; when a token is set, a matching "Bearer" header is required.
func Handler(dedicatedPort bool, token string) http.Handler {
	metrics := promhttp.Handler()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !dedicatedPort && token == "" {
			http.Error(w, "Prometheus endpoint is disabled.", http.StatusNotImplemented)
			return
		}
		if authorized(w, r, token) {
			metrics.ServeHTTP(w, r)
		}
	})
}

// Guard requires the metrics token before h (the profiler of the metrics port). Without a token, h is off: the
// metrics of a dedicated port may stay open as in the TS, not the profiler, which shows the server's internals.
func Guard(token string, h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if token == "" {
			http.NotFound(w, r)
			return
		}
		if authorized(w, r, token) {
			h(w, r)
		}
	}
}

// authorized checks the "Bearer" header against token, answering 401 when it does not match.
func authorized(w http.ResponseWriter, r *http.Request, token string) bool {
	if token == "" {
		return true
	}
	h := r.Header.Get("Authorization")
	switch {
	case h == "":
		http.Error(w, "Undefined authorization header", http.StatusUnauthorized)
	case !strings.HasPrefix(h, "Bearer "):
		http.Error(w, `Authorization header should start with "Bearer"`, http.StatusUnauthorized)
	case subtle.ConstantTimeCompare([]byte(h[7:]), []byte(token)) != 1:
		http.Error(w, "Incorrect authorization header sent.", http.StatusUnauthorized)
	default:
		return true
	}
	return false
}
