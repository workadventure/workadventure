package ws

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"regexp"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// wamKey is the map a room plays, as stored: /~/maps/empty.wam plays maps/empty.wam.
var wamKey = regexp.MustCompile(`^/~/(.+\.wam)$`)

// mapKey returns the stored map of a room URL, or "" for a room that plays no WAM file.
func mapKey(roomURL string) string {
	u, err := url.Parse(roomURL)
	if err != nil {
		return ""
	}
	if m := wamKey.FindStringSubmatch(u.Path); m != nil {
		return m[1]
	}
	return ""
}

// connectToRoom registers the session with its room, which answers RoomConnectedMessage with the edits of the map
// the client may have missed since its copy (lastCommandId), and from then on sends it every edit.
func (s *Session) connectToRoom() {
	key := mapKey(s.info.roomID)
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
		return roomAreas(doc)
	}
	connected := func() any {
		var missed []*pb.EditMapCommandMessage
		if key != "" {
			for _, e := range s.srv.maps.Since(key, s.info.lastCommandID) {
				missed = append(missed, e.(*pb.EditMapCommandMessage))
			}
		}
		return &pb.ServerToClientMessage{Message: &pb.ServerToClientMessage_RoomConnectedMessage{RoomConnectedMessage: &pb.RoomConnectedMessage{
			EditMapCommandsArrayMessage: &pb.EditMapCommandsArrayMessage{EditMapCommands: missed}, Tag: s.info.member.Tags}}}
	}
	_ = s.room.Connect(s.ctx, s, load, connected)
}

// editMap applies a command of the map editor, then every connection to the room gets it, the editor included: the
// front matches it with the command it applied ahead. A refusal goes to the editor alone, with the same id: its
// front then undoes the command.
func (s *Session) editMap(ctx context.Context, m *pb.EditMapCommandMessage) {
	key := mapKey(s.info.roomID)
	_ = s.room.EditMap(ctx, s, func() (any, any, []core.Area) {
		echo, areas, err := s.applyEdit(key, m)
		if err != nil {
			return nil, editMapSubMessage(m.GetId(), &pb.EditMapMessage{Message: &pb.EditMapMessage_ErrorCommandMessage{
				ErrorCommandMessage: &pb.ErrorCommandMessage{Reason: err.Error()}}}), nil
		}
		done := &pb.EditMapCommandMessage{Id: m.GetId(), EditMapMessage: echo}
		s.srv.maps.Record(key, m.GetId(), done)
		return &pb.SubMessage{Message: &pb.SubMessage_EditMapCommandMessage{EditMapCommandMessage: done}}, nil, areas
	})
}

func editMapSubMessage(id string, e *pb.EditMapMessage) *pb.SubMessage {
	return &pb.SubMessage{Message: &pb.SubMessage_EditMapCommandMessage{EditMapCommandMessage: &pb.EditMapCommandMessage{Id: id, EditMapMessage: e}}}
}

var errNotEditor = errors.New("You are not allowed to edit this map")

// applyEdit applies one command. It returns what to announce, and the areas of the map when they may have changed.
// Who may do what is map-storage's: map editors anything; the others only entities where they may write, their own
// custom entities and files, and claiming a personal area (COMMANDS_ACCESSIBLE_WITHOUT_CAN_EDIT).
func (s *Session) applyEdit(key string, m *pb.EditMapCommandMessage) (*pb.EditMapMessage, []core.Area, error) {
	if key == "" {
		return nil, nil, errors.New("This room has no map to edit")
	}
	mb := s.info.member
	echo := m.GetEditMapMessage()
	var cmd any
	switch v := echo.GetMessage().(type) {
	case *pb.EditMapMessage_CreateAreaMessage:
		c := v.CreateAreaMessage
		cmd = wam.CreateArea{ID: c.GetId(), Name: c.GetName(), X: int64(c.GetX()), Y: int64(c.GetY()), Width: int64(c.GetWidth()),
			Height: int64(c.GetHeight()), Properties: values(c.GetProperties())}
	case *pb.EditMapMessage_ModifyAreaMessage:
		c := v.ModifyAreaMessage
		mod := wam.ModifyArea{ID: c.GetId(), Name: c.Name, X: opt64(c.X), Y: opt64(c.Y), Width: optU64(c.Width), Height: optU64(c.Height),
			Properties: values(c.GetProperties()), ModifyProperties: c.GetModifyProperties()}
		if !mb.CanEdit {
			file, err := s.srv.maps.Read(key)
			claimed, ok := wam.Claim(file, mod, s.info.userUUID)
			if err != nil || !ok {
				return nil, nil, fmt.Errorf("User %s is not allowed to edit the map and this modification is not a valid claim or revoke on map %s", s.info.userUUID, key)
			}
			mod = claimed
		}
		cmd = mod
	case *pb.EditMapMessage_DeleteAreaMessage:
		cmd = wam.DeleteArea{ID: v.DeleteAreaMessage.GetId()}
	case *pb.EditMapMessage_CreateEntityMessage:
		c := v.CreateEntityMessage
		if err := s.mayEditEntityAt(key, c.GetX(), c.GetY(), c.GetWidth(), c.GetHeight()); err != nil {
			return nil, nil, err
		}
		cmd = wam.CreateEntity{ID: c.GetId(), PrefabID: c.GetPrefabId(), CollectionName: c.GetCollectionName(), X: int64(c.GetX()), Y: int64(c.GetY()),
			Name: c.Name, Properties: values(c.GetProperties())}
	case *pb.EditMapMessage_ModifyEntityMessage:
		c := v.ModifyEntityMessage
		if err := s.mayEditEntityAt(key, c.GetX(), c.GetY(), c.GetWidth(), c.GetHeight()); err != nil {
			return nil, nil, err
		}
		cmd = wam.ModifyEntity{ID: c.GetId(), X: int64(c.GetX()), Y: int64(c.GetY()), Name: c.Name, Properties: values(c.GetProperties()),
			ModifyProperties: c.GetModifyProperties()}
	case *pb.EditMapMessage_DeleteEntityMessage:
		// ponytail: like map-storage, anyone in the room may delete an entity.
		cmd = wam.DeleteEntity{ID: v.DeleteEntityMessage.GetId()}
	case *pb.EditMapMessage_UpdateWAMSettingsMessage:
		switch w := v.UpdateWAMSettingsMessage.GetMessage().(type) {
		case *pb.UpdateWAMSettingsMessage_UpdateMegaphoneSettingMessage:
			settings, _ := fromValue(w.UpdateMegaphoneSettingMessage.GetSettings())
			cmd = wam.SetMegaphone{Settings: settings}
		case *pb.UpdateWAMSettingsMessage_UpdateRecordingSettingMessage:
			settings, _ := fromValue(w.UpdateRecordingSettingMessage.GetSettings())
			cmd = wam.SetRecording{Settings: settings}
		}
	case *pb.EditMapMessage_ModifiyWAMMetadataMessage:
		c := v.ModifiyWAMMetadataMessage
		cmd = wam.SetMetadata{Name: c.GetName(), Description: c.Description, Copyright: c.Copyright, Thumbnail: c.Thumbnail, Tags: c.Tags}
	case *pb.EditMapMessage_UploadEntityMessage:
		return s.uploadEntity(v.UploadEntityMessage)
	case *pb.EditMapMessage_ModifyCustomEntityMessage:
		return echo, nil, s.modifyCustomEntity(v.ModifyCustomEntityMessage)
	case *pb.EditMapMessage_DeleteCustomEntityMessage:
		id := v.DeleteCustomEntityMessage.GetId()
		if err := s.deleteCustomEntity(id); err != nil {
			return nil, nil, err
		}
		cmd = wam.DeleteEntitiesOf{PrefabID: id}
	case *pb.EditMapMessage_UploadFileMessage:
		return s.uploadFile(v.UploadFileMessage)
	}
	if cmd == nil {
		return nil, nil, errors.New("This command is not supported")
	}
	switch cmd.(type) {
	case wam.CreateArea, wam.DeleteArea, wam.SetMegaphone, wam.SetRecording, wam.SetMetadata:
		if !mb.CanEdit {
			return nil, nil, errNotEditor
		}
	}
	var res wam.Result
	err := s.srv.maps.Edit(key, func(file []byte) ([]byte, error) {
		out, r, err := wam.Edit(file, m.GetId(), cmd)
		res = r
		return out, err
	})
	if err != nil {
		return nil, nil, err
	}
	for _, f := range res.Removed {
		if err := s.srv.maps.Remove(f); err != nil {
			slog.Warn("cannot remove a file no property links to", "file", f, "error", err)
		}
	}
	if res.Area != nil {
		echo = modifiedArea(res.Area)
	}
	return echo, roomAreas(res.Doc), nil
}

// mayEditEntityAt checks that a user who may not edit the map places or changes an entity where it may write.
func (s *Session) mayEditEntityAt(key string, x, y int32, width, height uint32) error {
	if s.info.member.CanEdit {
		return nil
	}
	file, err := s.srv.maps.Read(key)
	if err == nil && wam.CanEditAt(file, float64(x)+float64(width)/2, float64(y)+float64(height)/2, s.info.member.Tags, s.info.userUUID) {
		return nil
	}
	return fmt.Errorf("User %s is not allowed to edit this entity on map %s", s.info.userUUID, key)
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

// roomAreas is what the room needs of the map's areas: where they are, and their lock and capacity.
func roomAreas(doc map[string]any) []core.Area {
	list, _ := doc["areas"].([]any)
	areas := make([]core.Area, 0, len(list))
	for _, a := range list {
		m, _ := a.(map[string]any)
		id, _ := m["id"].(string)
		area := core.Area{ID: id, X: float(m["x"]), Y: float(m["y"]), Width: float(m["width"]), Height: float(m["height"])}
		props, _ := m["properties"].([]any)
		for _, p := range props {
			pm, _ := p.(map[string]any)
			pid, _ := pm["id"].(string)
			typ, _ := pm["type"].(string)
			prop := core.AreaProperty{ID: pid, Type: typ}
			if tags, ok := pm["allowedTags"].([]any); ok {
				for _, t := range tags {
					if str, ok := t.(string); ok {
						prop.AllowedTags = append(prop.AllowedTags, str)
					}
				}
			}
			if n, ok := pm["maxUsers"]; ok && n != nil {
				v := int(float(n))
				prop.MaxUsers = &v
			}
			area.Properties = append(area.Properties, prop)
		}
		areas = append(areas, area)
	}
	return areas
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
		if mapKey(roomURL) != key {
			continue
		}
		room := srv.rooms.Acquire(roomURL)
		_ = room.MapChanged(context.Background(), deleted)
		srv.rooms.Release(roomURL)
	}
}
