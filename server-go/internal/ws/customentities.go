package ws

import (
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"regexp"
	"slices"

	"google.golang.org/protobuf/proto"

	"github.com/workadventure/workadventure/server-go/internal/core"
	pb "github.com/workadventure/workadventure/server-go/internal/pb/messages"
	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// Custom entities: images uploaded from the map editor, listed in a collection the front loads next to the maps
// (CustomEntityCollectionService).
const customCollection = "assets/entities/entities.json"

var (
	imageFile    = regexp.MustCompile(`(?i)\.(jpg|jpeg|png|webp)$`)
	uploadedFile = regexp.MustCompile(`(?i)\.(pdf|jpg|jpeg|png|gif|webp|bmp|svg)$`)
)

// editCollection changes the custom entities collection; f gets its entries.
func (s *Session) editCollection(f func(entries []map[string]any) ([]map[string]any, error)) error {
	return s.srv.maps.Edit(customCollection, func(file []byte) ([]byte, error) {
		c := map[string]any{"version": "1.0", "collection": []any{}, "collectionName": "custom entities", "tags": []any{}}
		if file != nil {
			if err := json.Unmarshal(file, &c); err != nil {
				return nil, err
			}
		}
		raw, _ := c["collection"].([]any)
		entries := make([]map[string]any, 0, len(raw))
		for _, e := range raw {
			if m, ok := e.(map[string]any); ok {
				entries = append(entries, m)
			}
		}
		entries, err := f(entries)
		if err != nil {
			return nil, err
		}
		c["collection"] = entries
		return json.Marshal(c)
	})
}

func (s *Session) uploadEntity(m *pb.UploadEntityMessage) (*pb.EditMapMessage, []core.Area, error) {
	image := path.Base(m.GetImagePath())
	if !imageFile.MatchString(image) {
		return nil, nil, errors.New("File extension is not a supported image")
	}
	entry := map[string]any{"id": m.GetId(), "name": m.GetName(), "tags": orStrings(m.GetTags()), "imagePath": m.GetImagePath(),
		"direction": m.GetDirection().String(), "color": m.GetColor(), "ownerId": s.info.userUUID}
	if g := m.GetCollisionGrid(); g != nil {
		grid, _ := fromValue(g)
		if !isGrid(grid) {
			return nil, nil, errors.New("Invalid collision grid")
		}
		entry["collisionGrid"] = grid
	}
	if m.DepthOffset != nil {
		entry["depthOffset"] = m.GetDepthOffset()
	}
	if err := s.srv.maps.Put("assets/entities/"+image, m.GetFile()); err != nil {
		return nil, nil, err
	}
	err := s.editCollection(func(entries []map[string]any) ([]map[string]any, error) { return append(entries, entry), nil })
	if err != nil {
		return nil, nil, err
	}
	// Everybody learns who owns it; nobody needs the image again.
	echo := proto.Clone(m).(*pb.UploadEntityMessage)
	echo.File, echo.OwnerId = nil, proto.String(s.info.userUUID)
	return &pb.EditMapMessage{Message: &pb.EditMapMessage_UploadEntityMessage{UploadEntityMessage: echo}}, nil, nil
}

func isGrid(v any) bool {
	rows, ok := v.([]any)
	return ok && !slices.ContainsFunc(rows, func(r any) bool {
		cells, ok := r.([]any)
		return !ok || slices.ContainsFunc(cells, func(c any) bool { _, n := c.(float64); return !n })
	})
}

func orStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// mayChangeCustomEntity: map editors, or whoever uploaded it.
func (s *Session) mayChangeCustomEntity(entry map[string]any, verb string) error {
	owner, _ := entry["ownerId"].(string)
	if s.info.member.CanEdit || (owner != "" && owner == s.info.userUUID) {
		return nil
	}
	return fmt.Errorf("User %s is not allowed to %s the custom entity %v: only its creator or a user with map edit rights can.", s.info.userUUID, verb, entry["id"])
}

func (s *Session) modifyCustomEntity(m *pb.ModifyCustomEntityMessage) error {
	return s.editCollection(func(entries []map[string]any) ([]map[string]any, error) {
		i := slices.IndexFunc(entries, func(e map[string]any) bool { return e["id"] == m.GetId() })
		if i < 0 {
			return entries, nil
		}
		if err := s.mayChangeCustomEntity(entries[i], "modify"); err != nil {
			return nil, err
		}
		e := entries[i]
		e["name"], e["tags"] = m.GetName(), orStrings(m.GetTags())
		delete(e, "collisionGrid")
		if g := m.GetCollisionGrid(); g != nil {
			grid, _ := fromValue(g)
			if !isGrid(grid) {
				return nil, errors.New("Invalid collision grid")
			}
			e["collisionGrid"] = grid
		}
		delete(e, "depthOffset")
		if m.DepthOffset != nil {
			e["depthOffset"] = m.GetDepthOffset()
		}
		return entries, nil
	})
}

// deleteCustomEntity removes it from the collection with its image; its copies on the map go with the WAM edit.
func (s *Session) deleteCustomEntity(id string) error {
	var image string
	err := s.editCollection(func(entries []map[string]any) ([]map[string]any, error) {
		i := slices.IndexFunc(entries, func(e map[string]any) bool { return e["id"] == id })
		if i < 0 {
			return entries, nil
		}
		if err := s.mayChangeCustomEntity(entries[i], "delete"); err != nil {
			return nil, err
		}
		image, _ = entries[i]["imagePath"].(string)
		return slices.Delete(entries, i, i+1), nil
	})
	if err == nil && image != "" {
		_ = s.srv.maps.Remove("assets/entities/" + path.Base(image))
	}
	return err
}

// uploadFile stores a file for an openFile property, readable through /private/files with a token.
func (s *Session) uploadFile(m *pb.UploadFileMessage) (*pb.EditMapMessage, []core.Area, error) {
	name := path.Base(m.GetName())
	if !uploadedFile.MatchString(name) {
		return nil, nil, fmt.Errorf("File extension is not a supported format :%s%s", path.Ext(name), name)
	}
	if err := s.srv.maps.Put(wam.PrivateFile(name, m.GetPropertyId()), m.GetFile()); err != nil {
		return nil, nil, err
	}
	echo := proto.Clone(m).(*pb.UploadFileMessage)
	echo.File = nil
	return &pb.EditMapMessage{Message: &pb.EditMapMessage_UploadFileMessage{UploadFileMessage: echo}}, nil, nil
}
