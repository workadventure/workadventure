package ws

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"time"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/admin"
	"github.com/workadventure/workadventure/server-go/internal/core"
	"github.com/workadventure/workadventure/server-go/internal/mapedit"
	"github.com/workadventure/workadventure/server-go/internal/mapstorage"
	"github.com/workadventure/workadventure/server-go/internal/metrics"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// roomMap is the map a room plays, as the admin describes it (/api/map; derived from the room URL without an admin).
type roomMap struct {
	key    string // the WAM file in the map storage, "" for a room without one
	wamURL string
	mapURL string // a Tiled map served elsewhere
	// thirdParty is what the admin gives of the room's Jitsi and BBB (MapThirdPartyData), never sent on.
	thirdParty map[string]any
	at         time.Time
}

// roomMapKept is how long the server trusts what the admin said of a room's map.
const roomMapKept = time.Minute

func (srv *Server) roomMap(roomURL string) roomMap {
	if v, ok := srv.roomMaps.Load(roomURL); ok {
		if rm := v.(roomMap); time.Since(rm.at) < roomMapKept {
			return rm
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	rm := roomMap{at: time.Now()}
	details, err := srv.admin.MapDetails(ctx, admin.MapQuery{PlayURI: roomURL})
	if err != nil {
		return rm
	}
	if w := details.WamURL; w != "" {
		rm.key, rm.wamURL = srv.storageKey(w), w
	}
	rm.mapURL, rm.thirdParty = details.MapURL, details.ThirdParty
	srv.roomMaps.Store(roomURL, rm)
	return rm
}

// mapKey is the stored WAM file of a room, or "" for a room that plays none.
func (srv *Server) mapKey(roomURL string) string { return srv.roomMap(roomURL).key }

// storageKey is where a WAM URL is stored (mapPathUsingUrl): its path without PATH_PREFIX (or the path of
// PUBLIC_MAP_STORAGE_URL), in the folder of its host with USE_DOMAIN_NAME_IN_PATH.
func (srv *Server) storageKey(wamURL string) string {
	u, err := url.Parse(wamURL)
	if err != nil {
		return ""
	}
	p := u.Path
	if prefix := strings.TrimRight(srv.cfg.MapStorage.PathPrefix, "/"); prefix != "" {
		p = strings.TrimPrefix(p, prefix)
	} else if pub, err := url.Parse(srv.cfg.PublicMapStorageURL); err == nil && pub.Host == u.Host {
		p = strings.TrimPrefix(p, strings.TrimRight(pub.Path, "/"))
	}
	p = strings.TrimPrefix(p, "/")
	if p == "" || strings.Contains(p, "..") {
		return ""
	}
	if srv.cfg.MapStorage.UseDomainNameInPath {
		return strings.ToLower(u.Hostname()) + "/" + p
	}
	return p
}

// connectToRoom registers the session with its room, which answers RoomConnectedMessage with the edits of the map
// the client may have missed since its copy (lastCommandId), and from then on sends it every edit.
func (s *Session) connectToRoom() {
	key := s.srv.mapKey(s.info.roomID)
	// ponytail: the room parses its map on its goroutine, once, when its first connection arrives.
	load := func() []core.Area {
		if key == "" {
			return nil
		}
		file, err := s.srv.maps.Read(key)
		if err != nil {
			return nil
		}
		doc, err := wam.Parse(file)
		if err != nil {
			return nil
		}
		return mapedit.RoomAreas(doc)
	}
	connected := func() core.Event {
		var missed []*pb.EditMapCommandMessage
		if key != "" {
			for _, e := range s.srv.maps.Since(key, s.info.lastCommandID) {
				missed = append(missed, e.(*pb.EditMapCommandMessage))
			}
		}
		// CanEdit: the front keeps a player out of the areas it may not enter, unless it edits the map (93fe50b5d7).
		return core.External{Value: &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_RoomConnectedMessage{RoomConnectedMessage: &pb.RoomConnectedMessage{
			EditMapCommandsArrayMessage: &pb.EditMapCommandsArrayMessage{EditMapCommands: missed}, Tag: s.info.member.Tags,
			CanEdit: s.info.member.CanEdit}}}}
	}
	metrics.Ignore("room.Connect", s.room.Connect(s.ctx, s, load, connected))
}

// editMap queues a command of the map editor behind the other edits of its map (mapedit.Queue): it is stored off
// the room's goroutine. Then every connection to the room gets it, the editor included: the front matches it with
// the command it applied ahead. A refusal goes to the editor alone, with the same id: its front then undoes the
// command.
func (s *Session) editMap(m *pb.EditMapCommandMessage) {
	key, roomURL := s.srv.mapKey(s.info.roomID), s.info.roomID
	ed := mapedit.Editor{UUID: s.info.userUUID, Tags: s.info.member.Tags, CanEdit: s.info.member.CanEdit}
	refuse := func(err error) {
		s.Send(core.NewMsg(mapEdit(&pb.EditMapCommandMessage{Id: m.GetId(), EditMapMessage: &pb.EditMapMessage{Message: &pb.EditMapMessage_ErrorCommandMessage{
			ErrorCommandMessage: &pb.ErrorCommandMessage{Reason: err.Error()}}}}), true))
	}
	cmd, err := command(m.GetEditMapMessage())
	if err != nil {
		refuse(err)
		return
	}
	maps, mapKey := mapedit.Maps(s.srv.maps), key
	if s.srv.cfg.MapStorage.UseDomainNameInPath {
		folder, rest, _ := strings.Cut(key, "/")
		maps, mapKey = worldMaps{store: s.srv.maps, folder: folder}, rest
	}
	err = s.srv.edits.Run(key, func() {
		cmd, after := mapedit.Resources(maps, mapKey, ed, cmd, s.srv.resource)
		res, err := mapedit.Apply(maps, mapKey, ed, m.GetId(), cmd)
		if err != nil {
			refuse(err)
			return
		}
		after()
		done := &pb.EditMapCommandMessage{Id: m.GetId(), EditMapMessage: echo(m.GetEditMapMessage(), res, ed)}
		// The room is held for the announcement: the editor may have left meanwhile.
		room := s.srv.rooms.Acquire(roomURL)
		defer s.srv.rooms.Release(roomURL)
		metrics.Ignore("room.MapEdited", room.MapEdited(context.Background(), mapEdit(done),
			res.Areas, func() { s.srv.maps.Record(key, m.GetId(), done) }))
	})
	if err != nil {
		refuse(err)
	}
}

// worldMaps is the store as the map editor sees it with USE_DOMAIN_NAME_IN_PATH: the folder of the map's world, where
// map-storage keeps the files uploaded from the editor and the custom entities (mapPathUsingDomainWithPrefix with the
// map's host), next to the map.
type worldMaps struct {
	store  *mapstorage.Store
	folder string
}

func (w worldMaps) Read(key string) ([]byte, error)   { return w.store.Read(w.folder + "/" + key) }
func (w worldMaps) Put(key string, data []byte) error { return w.store.Put(w.folder+"/"+key, data) }
func (w worldMaps) Remove(key string) error           { return w.store.Remove(w.folder + "/" + key) }
func (w worldMaps) Edit(key string, change func([]byte) ([]byte, error)) error {
	return w.store.Edit(w.folder+"/"+key, change)
}

// mapEdit is an edit of the map as the core carries it, encoded once.
func mapEdit(cmd *pb.EditMapCommandMessage) core.MapEdit {
	b, err := proto.Marshal(cmd)
	if err != nil {
		panic(err)
	}
	return core.MapEdit{Command: b}
}

// command turns a message of the map editor into the command it asks for.
func command(e *pb.EditMapMessage) (any, error) {
	switch v := e.GetMessage().(type) {
	case *pb.EditMapMessage_CreateAreaMessage:
		c := v.CreateAreaMessage
		return wam.CreateArea{ID: c.GetId(), Name: c.GetName(), X: int64(c.GetX()), Y: int64(c.GetY()), Width: int64(c.GetWidth()),
			Height: int64(c.GetHeight()), Properties: values(c.GetProperties())}, nil
	case *pb.EditMapMessage_ModifyAreaMessage:
		c := v.ModifyAreaMessage
		return wam.ModifyArea{ID: c.GetId(), Name: c.Name, X: opt64(c.X), Y: opt64(c.Y), Width: optU64(c.Width), Height: optU64(c.Height),
			Properties: values(c.GetProperties()), ModifyProperties: c.GetModifyProperties()}, nil
	case *pb.EditMapMessage_DeleteAreaMessage:
		return wam.DeleteArea{ID: v.DeleteAreaMessage.GetId()}, nil
	case *pb.EditMapMessage_CreateEntityMessage:
		c := v.CreateEntityMessage
		return wam.CreateEntity{ID: c.GetId(), PrefabID: c.GetPrefabId(), CollectionName: c.GetCollectionName(), X: int64(c.GetX()), Y: int64(c.GetY()),
			Width: int64(c.GetWidth()), Height: int64(c.GetHeight()), Name: c.Name, Properties: values(c.GetProperties())}, nil
	case *pb.EditMapMessage_ModifyEntityMessage:
		c := v.ModifyEntityMessage
		return wam.ModifyEntity{ID: c.GetId(), X: int64(c.GetX()), Y: int64(c.GetY()), Width: int64(c.GetWidth()), Height: int64(c.GetHeight()),
			Name: c.Name, Properties: values(c.GetProperties()), ModifyProperties: c.GetModifyProperties()}, nil
	case *pb.EditMapMessage_DeleteEntityMessage:
		return wam.DeleteEntity{ID: v.DeleteEntityMessage.GetId()}, nil
	case *pb.EditMapMessage_UpdateWAMSettingsMessage:
		switch w := v.UpdateWAMSettingsMessage.GetMessage().(type) {
		case *pb.UpdateWAMSettingsMessage_UpdateMegaphoneSettingMessage:
			settings, _ := fromValue(w.UpdateMegaphoneSettingMessage.GetSettings())
			return wam.SetMegaphone{Settings: settings}, nil
		case *pb.UpdateWAMSettingsMessage_UpdateRecordingSettingMessage:
			settings, _ := fromValue(w.UpdateRecordingSettingMessage.GetSettings())
			return wam.SetRecording{Settings: settings}, nil
		}
	case *pb.EditMapMessage_ModifiyWAMMetadataMessage:
		c := v.ModifiyWAMMetadataMessage
		return wam.SetMetadata{Name: c.GetName(), Description: c.Description, Copyright: c.Copyright, Thumbnail: c.Thumbnail, Tags: c.Tags}, nil
	case *pb.EditMapMessage_UploadEntityMessage:
		c := v.UploadEntityMessage
		return mapedit.UploadEntity{ID: c.GetId(), Name: c.GetName(), ImagePath: c.GetImagePath(), Direction: c.GetDirection().String(),
			Color: c.GetColor(), Tags: c.GetTags(), CollisionGrid: grid(c.GetCollisionGrid()), DepthOffset: c.DepthOffset, File: c.GetFile()}, nil
	case *pb.EditMapMessage_ModifyCustomEntityMessage:
		c := v.ModifyCustomEntityMessage
		return mapedit.ModifyCustomEntity{ID: c.GetId(), Name: c.GetName(), Tags: c.GetTags(), CollisionGrid: grid(c.GetCollisionGrid()),
			DepthOffset: c.DepthOffset}, nil
	case *pb.EditMapMessage_DeleteCustomEntityMessage:
		return mapedit.DeleteCustomEntity{ID: v.DeleteCustomEntityMessage.GetId()}, nil
	case *pb.EditMapMessage_UploadFileMessage:
		c := v.UploadFileMessage
		return mapedit.UploadFile{Name: c.GetName(), PropertyID: c.GetPropertyId(), File: c.GetFile()}, nil
	}
	return nil, errors.New("This command is not supported")
}

// grid is a collision grid as sent, or nil.
func grid(g *structpb.Value) any {
	if g == nil {
		return nil
	}
	v, _ := fromValue(g)
	return v
}

// echo is what the room is told of an applied command.
func echo(e *pb.EditMapMessage, res mapedit.Result, ed mapedit.Editor) *pb.EditMapMessage {
	switch v := e.GetMessage().(type) {
	case *pb.EditMapMessage_ModifyAreaMessage:
		if res.Area != nil {
			m := modifiedArea(res.Area)
			// The editor takes the area as stored only when a resource (Matrix) changed its serverData.
			props, _ := res.Area["properties"].([]any)
			m.GetModifyAreaMessage().ModifyServerData = proto.Bool(serverDataOf(values(v.ModifyAreaMessage.GetProperties())) != serverDataOf(props))
			return m
		}
	case *pb.EditMapMessage_UploadEntityMessage:
		// Everybody learns who owns it; nobody needs the image again.
		c := proto.Clone(v.UploadEntityMessage).(*pb.UploadEntityMessage)
		c.File, c.OwnerId = nil, proto.String(ed.UUID)
		return &pb.EditMapMessage{Message: &pb.EditMapMessage_UploadEntityMessage{UploadEntityMessage: c}}
	case *pb.EditMapMessage_UploadFileMessage:
		c := proto.Clone(v.UploadFileMessage).(*pb.UploadFileMessage)
		c.File = nil
		return &pb.EditMapMessage{Message: &pb.EditMapMessage_UploadFileMessage{UploadFileMessage: c}}
	}
	return e
}

func opt64(v *int32) *int64 {
	if v == nil {
		return nil
	}
	n := int64(*v)
	return &n
}

func optU64(v *uint32) *int64 {
	if v == nil {
		return nil
	}
	n := int64(*v)
	return &n
}

// float reads a number of a decoded document (json.Number, float64 or int64).
func float(v any) float64 {
	switch n := jsonNumbers(v).(type) {
	case float64:
		return n
	}
	return 0
}

// modifiedArea is the area after a modification, as map-storage announces it: whole, properties included.
func modifiedArea(area map[string]any) *pb.EditMapMessage {
	name, _ := area["name"].(string)
	id, _ := area["id"].(string)
	x, y, w, h := int32(float(area["x"])), int32(float(area["y"])), uint32(float(area["width"])), uint32(float(area["height"]))
	props, _ := area["properties"].([]any)
	pv := make([]*structpb.Value, 0, len(props))
	for _, p := range props {
		if v, err := structpb.NewValue(jsonNumbers(p)); err == nil {
			pv = append(pv, v)
		}
	}
	return &pb.EditMapMessage{Message: &pb.EditMapMessage_ModifyAreaMessage{ModifyAreaMessage: &pb.ModifyAreaMessage{
		Id: id, Name: &name, X: &x, Y: &y, Width: &w, Height: &h, Properties: pv, ModifyProperties: proto.Bool(true), ModifyServerData: proto.Bool(false)}}}
}

// serverDataOf is the serverData of each property, by id, as JSON: what tells MapStorageServer's modifyServerData.
func serverDataOf(props []any) string {
	out := map[string]any{}
	for _, p := range props {
		if m, _ := jsonNumbers(p).(map[string]any); m != nil && m["serverData"] != nil {
			id, _ := m["id"].(string)
			out[id] = m["serverData"]
		}
	}
	b, _ := json.Marshal(out)
	return string(b)
}

// jsonNumbers turns the json.Number of a document read from disk into float64, which structpb takes.
func jsonNumbers(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, e := range x {
			out[k] = jsonNumbers(e)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, e := range x {
			out[i] = jsonNumbers(e)
		}
		return out
	case interface{ Float64() (float64, error) }:
		f, _ := x.Float64()
		return f
	case int64:
		return float64(x)
	}
	return v
}

func values(vs []*structpb.Value) []any {
	out := make([]any, 0, len(vs))
	for _, v := range vs {
		if x, ok := fromValue(v); ok {
			out = append(out, x)
		}
	}
	return out
}

// fromValue is AsInterface, except that a Value without kind (ts-proto's undefined) is left out of objects instead
// of becoming null, as the TS unwrap does.
func fromValue(v *structpb.Value) (any, bool) {
	switch k := v.GetKind().(type) {
	case nil:
		return nil, false
	case *structpb.Value_StructValue:
		m := make(map[string]any, len(k.StructValue.GetFields()))
		for key, f := range k.StructValue.GetFields() {
			if x, ok := fromValue(f); ok {
				m[key] = x
			}
		}
		return m, true
	case *structpb.Value_ListValue:
		s := make([]any, 0, len(k.ListValue.GetValues()))
		for _, f := range k.ListValue.GetValues() {
			x, _ := fromValue(f) // JSON.stringify writes an undefined item as null
			s = append(s, x)
		}
		return s, true
	}
	return v.AsInterface(), true
}

// MapChanged tells the rooms playing a map that its file was replaced or deleted from map-storage's HTTP API.
func (srv *Server) MapChanged(key string, deleted bool) {
	for _, roomURL := range srv.rooms.Keys() {
		if srv.mapKey(roomURL) != key {
			continue
		}
		room := srv.rooms.Acquire(roomURL)
		metrics.Ignore("room.MapChanged", room.MapChanged(context.Background(), deleted))
		srv.rooms.Release(roomURL)
	}
}
