package ws

import (
	"context"
	"net/url"
	"regexp"

	"google.golang.org/protobuf/types/known/structpb"

	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// wamKey is the map a room plays, as stored: /~/maps/empty.wam plays maps/empty.wam.
var wamKey = regexp.MustCompile(`^/~/(.+\.wam)$`)

// editMap applies a command of the map editor to the room's map, then every player gets it, the editor included:
// the front matches it with the command it applied ahead. A refusal goes to the editor alone, with the same id: its
// front then undoes the command. ponytail: areas and megaphone settings only, the commands the J2 specs use.
func (s *Session) editMap(ctx context.Context, m *pb.EditMapCommandMessage) {
	refuse := func(reason string) *pb.SubMessage {
		return editMapSubMessage(m.GetId(), &pb.EditMapMessage{Message: &pb.EditMapMessage_ErrorCommandMessage{ErrorCommandMessage: &pb.ErrorCommandMessage{Reason: reason}}})
	}
	room, _ := url.Parse(s.info.roomID)
	key := wamKey.FindStringSubmatch(room.Path)
	cmd, echo := mapCommand(m.GetEditMapMessage())
	_ = s.room.EditMap(ctx, s, func() (any, any) {
		switch {
		case !s.info.member.CanEdit:
			return nil, refuse("You are not allowed to edit this map")
		case key == nil:
			return nil, refuse("This room has no map to edit")
		case cmd == nil:
			return nil, refuse("This command is not supported by this server yet")
		}
		var area map[string]any
		err := s.srv.maps.Edit(key[1], func(file []byte) ([]byte, error) {
			out, a, err := wam.Edit(file, m.GetId(), cmd)
			area = a
			return out, err
		})
		if err != nil {
			return nil, refuse(err.Error())
		}
		if area != nil {
			echo = modifiedArea(area)
		}
		return editMapSubMessage(m.GetId(), echo), nil
	})
}

func editMapSubMessage(id string, e *pb.EditMapMessage) *pb.SubMessage {
	return &pb.SubMessage{Message: &pb.SubMessage_EditMapCommandMessage{EditMapCommandMessage: &pb.EditMapCommandMessage{Id: id, EditMapMessage: e}}}
}

// mapCommand reads a command the server applies. echo is what to announce when it was applied.
func mapCommand(e *pb.EditMapMessage) (cmd any, echo *pb.EditMapMessage) {
	switch v := e.GetMessage().(type) {
	case *pb.EditMapMessage_CreateAreaMessage:
		c := v.CreateAreaMessage
		return wam.CreateArea{ID: c.GetId(), Name: c.GetName(), X: int64(c.GetX()), Y: int64(c.GetY()), Width: int64(c.GetWidth()),
			Height: int64(c.GetHeight()), Properties: values(c.GetProperties())}, e
	case *pb.EditMapMessage_ModifyAreaMessage:
		c := v.ModifyAreaMessage
		opt := func(set bool, n int64) *int64 {
			if !set {
				return nil
			}
			return &n
		}
		return wam.ModifyArea{ID: c.GetId(), Name: c.Name, X: opt(c.X != nil, int64(c.GetX())), Y: opt(c.Y != nil, int64(c.GetY())),
			Width: opt(c.Width != nil, int64(c.GetWidth())), Height: opt(c.Height != nil, int64(c.GetHeight())),
			Properties: values(c.GetProperties()), ModifyProperties: c.GetModifyProperties()}, e
	case *pb.EditMapMessage_DeleteAreaMessage:
		return wam.DeleteArea{ID: v.DeleteAreaMessage.GetId()}, e
	case *pb.EditMapMessage_UpdateWAMSettingsMessage:
		if mega := v.UpdateWAMSettingsMessage.GetUpdateMegaphoneSettingMessage(); mega != nil {
			settings, _ := fromValue(mega.GetSettings())
			return wam.SetMegaphone{Settings: settings}, e
		}
	}
	return nil, nil
}

// modifiedArea is the area after a modification, as map-storage announces it: whole, properties included.
func modifiedArea(area map[string]any) *pb.EditMapMessage {
	num := func(k string) int64 {
		switch n := area[k].(type) {
		case int64:
			return n
		case float64:
			return int64(n)
		case interface{ Int64() (int64, error) }: // json.Number
			v, _ := n.Int64()
			return v
		}
		return 0
	}
	name, _ := area["name"].(string)
	id, _ := area["id"].(string)
	x, y, w, h := int32(num("x")), int32(num("y")), uint32(num("width")), uint32(num("height"))
	props, _ := area["properties"].([]any)
	pv := make([]*structpb.Value, 0, len(props))
	for _, p := range props {
		if v, err := structpb.NewValue(jsonNumbers(p)); err == nil {
			pv = append(pv, v)
		}
	}
	modify, serverData := true, false
	return &pb.EditMapMessage{Message: &pb.EditMapMessage_ModifyAreaMessage{ModifyAreaMessage: &pb.ModifyAreaMessage{
		Id: id, Name: &name, X: &x, Y: &y, Width: &w, Height: &h, Properties: pv, ModifyProperties: &modify, ModifyServerData: &serverData}}}
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
