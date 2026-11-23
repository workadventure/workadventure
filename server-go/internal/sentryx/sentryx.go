// Package sentryx reports the server's errors to Sentry, like the back and the pusher did with @sentry/node: every
// log at Error level (the panics the actors and the sessions recover are logged so), and every HTTP answer in 5xx.
// Nothing leaves the process until Init is given a DSN.
package sentryx

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

// Init starts the reporting when dsn is set, and does nothing otherwise. Tracing is left out: a WebSocket request
// lasts as long as a visit, so a transaction per request would measure nothing useful.
func Init(dsn, environment, release string) error {
	if dsn == "" {
		return nil
	}
	return sentry.Init(Options(dsn, environment, release))
}

// Options are the client's options, the scrubbing included. Tests build their own client from them.
func Options(dsn, environment, release string) sentry.ClientOptions {
	return sentry.ClientOptions{Dsn: dsn, Environment: environment, Release: release,
		BeforeSend: func(e *sentry.Event, _ *sentry.EventHint) *sentry.Event { return scrub(e) }}
}

// Handler passes every record to next, and reports those at Error level to Sentry. The attributes that say where
// the error happened become tags, so Sentry can filter on them; the others go to the event's "attributes" context, except those whose
// name says they hold a credential or a personal detail.
func Handler(next slog.Handler) slog.Handler { return &handler{next: next} }

type handler struct {
	next   slog.Handler
	attrs  []slog.Attr // from WithAttrs, their keys already prefixed with their groups
	prefix string      // the groups opened by WithGroup, as "a.b."
}

// tagKeys are the attributes that become tags: where the error happened, and who it happened to by an id only.
var tagKeys = map[string]bool{"actor": true, "room": true, "space": true, "session": true, "user": true,
	"userUuid": true, "world": true, "tab": true, "egress": true, "op": true}

// sensitive is true for an attribute whose name says it may hold a credential, an email or an IP address.
func sensitive(key string) bool {
	k := strings.ToLower(key)
	for _, s := range []string{"token", "jwt", "secret", "password", "authorization", "cookie", "email", "addr"} {
		if strings.Contains(k, s) {
			return true
		}
	}
	return strings.HasSuffix(k, "ip")
}

// Enabled is true for every error, even when next would not print it: Sentry still wants it.
func (h *handler) Enabled(ctx context.Context, l slog.Level) bool {
	return l >= slog.LevelError || h.next.Enabled(ctx, l)
}

func (h *handler) WithAttrs(as []slog.Attr) slog.Handler {
	attrs := append([]slog.Attr(nil), h.attrs...)
	for _, a := range as {
		attrs = append(attrs, slog.Attr{Key: h.prefix + a.Key, Value: a.Value})
	}
	return &handler{next: h.next.WithAttrs(as), attrs: attrs, prefix: h.prefix}
}

func (h *handler) WithGroup(name string) slog.Handler {
	return &handler{next: h.next.WithGroup(name), attrs: h.attrs, prefix: h.prefix + name + "."}
}

func (h *handler) Handle(ctx context.Context, r slog.Record) error {
	if r.Level >= slog.LevelError {
		h.report(ctx, r)
	}
	if !h.next.Enabled(ctx, r.Level) {
		return nil
	}
	return h.next.Handle(ctx, r)
}

func (h *handler) report(ctx context.Context, r slog.Record) {
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	if hub.Client() == nil {
		return
	}
	e := sentry.NewEvent()
	e.Level = sentry.LevelError
	e.Message = r.Message
	// The log message is the issue's title, the error its subtitle: the message is fixed, so Sentry groups on it and
	// on the stack, not on the ids an error value quotes.
	ex := sentry.Exception{Type: r.Message, Stacktrace: stacktrace()}
	attrs := sentry.Context{}
	var add func(prefix string, a slog.Attr)
	add = func(prefix string, a slog.Attr) {
		v := a.Value.Resolve()
		key := prefix + a.Key
		switch {
		case v.Kind() == slog.KindGroup:
			for _, g := range v.Group() {
				add(key+".", g)
			}
			return
		case a.Key == "stack" || sensitive(a.Key): // the stack is the exception's own, as frames
			return
		case a.Key == "panic":
			ex.Value, ex.Mechanism = v.String(), &sentry.Mechanism{Type: "panic", Handled: sentry.Pointer(true)}
		case a.Key == "error" && ex.Value == "":
			ex.Value = v.String()
		}
		if tagKeys[key] {
			e.Tags[key] = truncate(v.String(), 200) // Sentry's limit for a tag value
		} else {
			attrs[key] = v.String()
		}
	}
	for _, a := range h.attrs {
		add("", a)
	}
	r.Attrs(func(a slog.Attr) bool { add(h.prefix, a); return true })
	e.Exception = []sentry.Exception{ex}
	e.Contexts["attributes"] = attrs
	hub.CaptureEvent(e)
}

const self = "github.com/workadventure/workadventure/server-go/internal/sentryx"

// stacktrace is the stack of the code that logged, without the frames of slog and of this package. When the log
// comes from a recover, the SDK cuts the stack at the panic, so the frames are those of the code that panicked.
func stacktrace() *sentry.Stacktrace {
	st := sentry.NewStacktrace()
	for st != nil && len(st.Frames) > 0 {
		if m := st.Frames[len(st.Frames)-1].Module; m != "log/slog" && m != self {
			break
		}
		st.Frames = st.Frames[:len(st.Frames)-1]
	}
	return st
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// Middleware reports the panics of next (then panics again, so net/http still drops the connection) and its answers
// in 5xx. Without Sentry, it is next itself. The request goes with the event without its body, which the SDK never
// reads.
func Middleware(next http.Handler) http.Handler {
	if sentry.CurrentHub().Client() == nil {
		return next
	}
	return sentryhttp.New(sentryhttp.Options{Repanic: true}).Handle(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)
		if sw.status < http.StatusInternalServerError {
			return
		}
		hub := sentry.GetHubFromContext(r.Context())
		hub.WithScope(func(s *sentry.Scope) {
			s.SetTag("status", strconv.Itoa(sw.status))
			// The route, not the path: a path holds ids, and one issue per id would bury the others.
			hub.CaptureMessage(r.Method + " " + r.Pattern + " answered " + strconv.Itoa(sw.status))
		})
	}))
}

// statusWriter remembers the status. Unwrap lets the WebSocket upgrade reach the connection's Hijacker.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	if w.status == 0 {
		w.status = code
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

func (w *statusWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }

var (
	jwtPattern   = regexp.MustCompile(`eyJ[\w-]*\.[\w-]*\.[\w-]*`)
	emailPattern = regexp.MustCompile(`[\w.+-]+@[\w-]+(\.[\w-]+)+`)
	ipv4Pattern  = regexp.MustCompile(`\b\d{1,3}(\.\d{1,3}){3}\b`)
)

// redact hides what looks like a JWT, an email or an IPv4 address, wherever a value comes from: an error message can
// quote a URL with its token, or the address of the peer that failed.
func redact(s string) string {
	s = jwtPattern.ReplaceAllString(s, "[jwt]")
	s = emailPattern.ReplaceAllString(s, "[email]")
	return ipv4Pattern.ReplaceAllString(s, "[ip]")
}

// scrub is the last pass before an event leaves: the credentials of the request go, and every string is redacted.
func scrub(e *sentry.Event) *sentry.Event {
	e.Message = redact(e.Message)
	for i := range e.Exception {
		e.Exception[i].Type, e.Exception[i].Value = redact(e.Exception[i].Type), redact(e.Exception[i].Value)
	}
	for k, v := range e.Tags {
		e.Tags[k] = redact(v)
	}
	for _, c := range e.Contexts {
		for k, v := range c {
			if s, ok := v.(string); ok {
				c[k] = redact(s)
			}
		}
	}
	for _, b := range e.Breadcrumbs {
		b.Message = redact(b.Message)
	}
	if r := e.Request; r != nil {
		r.Cookies, r.Env, r.Data = "", nil, ""
		for k, v := range r.Headers {
			switch strings.ToLower(k) {
			case "authorization", "cookie", "x-forwarded-for", "x-real-ip", "forwarded", "sec-websocket-protocol":
				delete(r.Headers, k)
			default:
				r.Headers[k] = redact(v)
			}
		}
		if q, err := url.ParseQuery(r.QueryString); err == nil {
			q.Del("token")
			q.Del("jwt")
			r.QueryString = q.Encode()
		}
		r.URL, r.QueryString = redact(r.URL), redact(r.QueryString)
	}
	return e
}
