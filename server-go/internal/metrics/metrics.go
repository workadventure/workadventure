// Package metrics exposes /metrics with the gauges the WorkAdventure dashboards read, under the same names as the
// TS pusher and back. The Node.js runtime metrics (nodejs_*) are replaced by the Go ones (go_*, process_*).
package metrics

import (
	"net/http"
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
)

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
		if token != "" {
			h := r.Header.Get("Authorization")
			switch {
			case h == "":
				http.Error(w, "Undefined authorization header", http.StatusUnauthorized)
				return
			case len(h) < 7 || h[:7] != "Bearer ":
				http.Error(w, `Authorization header should start with "Bearer"`, http.StatusUnauthorized)
				return
			case h[7:] != token:
				http.Error(w, "Incorrect authorization header sent.", http.StatusUnauthorized)
				return
			}
		}
		metrics.ServeHTTP(w, r)
	})
}
