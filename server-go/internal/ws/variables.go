package ws

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/netguard"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// mapClient reads the maps of the rooms; a room URL names any domain, so without STORE_VARIABLES_FOR_LOCAL_MAPS
// only public addresses are reached (a name resolving to a private one included).
var mapClient, localMapClient = netguard.Client(10 * time.Second), &http.Client{Timeout: 10 * time.Second}

// errLocalMap: a map on the local network is not read unless STORE_VARIABLES_FOR_LOCAL_MAPS (MapFetcher).
var errLocalMap = errors.New("the map is on a local address")

// TiledMap reads the Tiled map a room plays: from the map storage for a WAM map, over HTTP otherwise.
func (srv *Server) TiledMap(ctx context.Context, roomURL string) ([]byte, error) {
	room, err := url.Parse(roomURL)
	if err != nil {
		return nil, err
	}
	rm := srv.roomMap(roomURL)
	mapURL := rm.mapURL
	if key := rm.key; key != "" {
		file, err := srv.maps.Read(key)
		if err != nil {
			return nil, err
		}
		doc, err := wam.Parse(file)
		if err != nil {
			return nil, err
		}
		rel, _ := doc["mapUrl"].(string)
		u, err := url.Parse(rm.wamURL)
		if err != nil {
			return nil, err
		}
		ref, err := u.Parse(rel)
		if err != nil {
			return nil, err
		}
		if ref.Host == u.Host { // next to the WAM file: in the store too
			if inStore := srv.storageKey(ref.String()); inStore != "" {
				return srv.maps.Read(inStore)
			}
		}
		mapURL = ref.String()
	} else if mapURL == "" {
		return nil, fmt.Errorf("no map for %s", room)
	}
	u, err := url.Parse(mapURL)
	if err != nil {
		return nil, err
	}
	if !srv.cfg.StoreVariablesForLocalMaps && isLocal(u.Hostname()) {
		return nil, errLocalMap
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mapURL, nil)
	if err != nil {
		return nil, err
	}
	client := mapClient
	if srv.cfg.StoreVariablesForLocalMaps {
		client = localMapClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("%s: %s", mapURL, resp.Status)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 50<<20))
}

func isLocal(host string) bool {
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast())
}

// RoomVariables is roomVariables, for the Room API.
func (srv *Server) RoomVariables(roomURL string) core.RoomVariables {
	return srv.roomVariables(roomURL)
}

// roomVariables reads the variables a room's map declares, with their stored values. When the map cannot be read,
// every variable is accepted and none is kept (VariablesManager without a map).
func (srv *Server) roomVariables(roomURL string) core.RoomVariables {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	v := core.RoomVariables{Values: map[string]string{}, Save: func(name, value string) { srv.varWriter.Set(roomURL, name, value, 0) }}
	tiled, err := srv.TiledMap(ctx, roomURL)
	if err != nil {
		return v
	}
	defs, defaults := declaredVariables(tiled)
	v.Defs = defs
	for name, value := range defaults {
		v.Values[name] = value
	}
	stored, err := srv.varWriter.Read(roomURL)
	for name, value := range stored {
		if defs[name].Persist {
			v.Values[name] = value
		}
	}
	if err != nil {
		v.Reload = func() (map[string]string, bool) {
			m, err := srv.varWriter.Read(roomURL)
			return m, err == nil
		}
	}
	return v
}

type tiledLayer struct {
	Type    string       `json:"type"`
	Layers  []tiledLayer `json:"layers"`
	Objects []struct {
		Name       string          `json:"name"`
		Class      string          `json:"class"`
		Type       string          `json:"type"`
		Template   string          `json:"template"`
		Properties []tiledProperty `json:"properties"`
	} `json:"objects"`
}

type tiledProperty struct {
	Name  string          `json:"name"`
	Value json.RawMessage `json:"value"`
}

// declaredVariables reads the objects of type "variable" of a Tiled map (VariablesManager): their declaration and
// their default value (JSON).
func declaredVariables(tiled []byte) (map[string]core.VarDef, map[string]string) {
	var m struct {
		Layers []tiledLayer `json:"layers"`
	}
	defs, defaults := map[string]core.VarDef{}, map[string]string{}
	if json.Unmarshal(tiled, &m) != nil {
		return defs, defaults
	}
	var walk func([]tiledLayer)
	walk = func(layers []tiledLayer) {
		for _, l := range layers {
			if l.Type == "group" {
				walk(l.Layers)
				continue
			}
			for _, o := range l.Objects {
				if (o.Class != "variable" && o.Type != "variable") || o.Template != "" {
					continue
				}
				var def core.VarDef
				for _, p := range o.Properties {
					switch p.Name {
					case "default":
						defaults[o.Name] = string(p.Value)
					case "persist":
						_ = json.Unmarshal(p.Value, &def.Persist)
					case "readableBy":
						_ = json.Unmarshal(p.Value, &def.ReadableBy)
					case "writableBy":
						_ = json.Unmarshal(p.Value, &def.WritableBy)
					}
				}
				defs[o.Name] = def
			}
		}
	}
	walk(m.Layers)
	return defs, defaults
}

// setVariable is VariableMessage. When the room's map does not declare the variable and was read a while ago, the
// map is read again, on this reader (rare: a script that writes a variable the map just got).
func (s *Session) setVariable(ctx context.Context, v core.Variable) {
	stale := make(chan bool, 1)
	if s.room.SetVariable(ctx, s, v, s.info.member.Tags, true, func(st bool) { stale <- st }) != nil {
		return
	}
	select {
	case st := <-stale:
		if !st {
			return
		}
	case <-ctx.Done():
		return
	}
	if s.room.Redeclare(ctx, s.srv.roomVariables(s.info.roomID)) == nil {
		_ = s.room.SetVariable(ctx, s, v, s.info.member.Tags, false, func(bool) {})
	}
}

// Players' variables are stored for logged players only, as "<expiry ms>:<public 1|0>:<json>" under
// pr_<uuid>_|@|_<room> (PlayerVariables of the back; without an admin there is no world, so WORLD is the room).
func playerKey(uuid, roomURL string) string { return "pr_" + uuid + "_|@|_" + roomURL }

// storedPlayerVariables reads a logged player's variables before it joins; expired ones are removed.
func (s *Session) storedPlayerVariables() []core.StoredVariable {
	if !s.info.isLogged {
		return nil
	}
	key := playerKey(s.info.userUUID, s.info.roomID)
	var out []core.StoredVariable
	now := time.Now().UnixMilli()
	stored, _ := s.srv.varWriter.Read(key)
	for name, raw := range stored {
		expiry, rest, ok1 := strings.Cut(raw, ":")
		public, value, ok2 := strings.Cut(rest, ":")
		if !ok1 || !ok2 {
			continue
		}
		if e, err := strconv.ParseInt(expiry, 10, 64); err == nil && e < now {
			s.srv.varWriter.Set(key, name, "", 0)
			continue
		}
		out = append(out, core.StoredVariable{Name: name, Value: value, Public: public == "1"})
	}
	return out
}

// storePlayerVariable keeps a persistent variable of a logged player. ponytail: the key itself gets no EXPIRE (an
// expired field is dropped when read), so the key of a player who never comes back stays in Redis.
func (s *Session) storePlayerVariable(v *core.PlayerVariable) {
	if !v.Persist || !s.info.isLogged {
		return
	}
	key := playerKey(s.info.userUUID, s.info.roomID)
	if v.Value == "" {
		s.srv.varWriter.Set(key, v.Name, "", 0)
		return
	}
	expiry := ""
	if v.TTL != nil {
		ttl := int64(*v.TTL)
		if max := s.srv.cfg.PlayerVariablesMaxTTL; max >= 0 && ttl > max {
			ttl = max // the back takes the larger of the two, which defeats the maximum
		}
		expiry = strconv.FormatInt(time.Now().UnixMilli()+ttl*1000, 10)
	}
	public := "0"
	if v.Public {
		public = "1"
	}
	s.srv.varWriter.Set(key, v.Name, expiry+":"+public+":"+v.Value, 0)
}
