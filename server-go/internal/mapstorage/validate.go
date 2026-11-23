package mapstorage

import (
	"encoding/json"
	"fmt"
	"path"
	"strings"

	"github.com/workadventure/workadventure/server-go/internal/wam"
)

// issue is one problem found in an uploaded file, as map-storage reports it.
type issue struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Details string `json:"details"`
	Link    string `json:"link,omitempty"`
}

// report groups the issues of a file by section: map, layers, tilesets.
type report map[string][]issue

const rulesLink = "https://workadventu.re/map-building/wa-maps.md#workadventure-maps-rules"

func errorIn(section, message string) report {
	return report{section: {{Type: "error", Message: message}}}
}

// looksLikeTiledMap is the ITiledMap shape: layers, tilesets, tiledversion and type "map".
func looksLikeTiledMap(m map[string]any) bool {
	_, layers := m["layers"].([]any)
	_, tilesets := m["tilesets"].([]any)
	_, version := m["tiledversion"].(string)
	return layers && tilesets && version && m["type"] == "map"
}

// validateFile checks an uploaded file by its extension (UploadController: .json, .wam, .tmj); nil when fine.
// exists says whether a path relative to the file's directory is part of the upload.
func validateFile(name string, content []byte, exists func(string) bool) report {
	switch path.Ext(name) {
	case ".json":
		var m map[string]any
		if json.Unmarshal(content, &m) == nil && looksLikeTiledMap(m) {
			return errorIn("map", `Invalid file extension. Maps should end with the ".tmj" extension.`)
		}
	case ".wam":
		doc, err := wam.Parse(content)
		if err == nil {
			wam.Migrate(doc)
			err = wam.Validate(doc)
		}
		if err != nil {
			return report{"map": {{Type: "error", Message: "Invalid WAM file format.", Details: err.Error()}}}
		}
	case ".tmj":
		return validateTiled(content, exists)
	}
	return nil
}

// validateTiled is the error level of MapValidator. exists is nil when the referenced files cannot be checked.
func validateTiled(content []byte, exists func(string) bool) report {
	var m map[string]any
	if err := json.Unmarshal(content, &m); err != nil {
		return errorIn("map", "The provided map is not in a valid JSON format.")
	}
	if m["infinite"] == true {
		return errorIn("map", "Infinite map size is not supported. Please use a fixed map size.")
	}
	if !looksLikeTiledMap(m) {
		return errorIn("map", "Your map file contains an invalid JSON structure.")
	}
	r := report{}
	if m["orientation"] != "orthogonal" {
		r["map"] = append(r["map"], issue{Type: "error", Message: "The orientation of your map must be orthogonal."})
	}
	floor := false
	for _, l := range m["layers"].([]any) {
		layer, _ := l.(map[string]any)
		floor = floor || (layer["name"] == "floorLayer" && layer["type"] == "objectgroup")
	}
	if !floor {
		r["layers"] = append(r["layers"], issue{Type: "error", Message: `Your map must have a layer named "floorLayer" of type "Object Layer".`, Link: rulesLink})
	}
	var external []string
	for _, t := range m["tilesets"].([]any) {
		tileset, _ := t.(map[string]any)
		name, _ := tileset["name"].(string)
		if source, ok := tileset["source"].(string); ok {
			external = append(external, fmt.Sprintf("%q", source))
			continue
		}
		image, ok := tileset["image"].(string)
		switch {
		case !ok:
			r["tilesets"] = append(r["tilesets"], issue{Type: "error", Message: fmt.Sprintf("The tileset %q is a collection of images. Collection of images are not supported.", name)})
		case exists != nil && !exists(image):
			r["tilesets"] = append(r["tilesets"], issue{Type: "error", Message: fmt.Sprintf("Image of the tileset %q: %q is not loadable.", name, image)})
		}
	}
	if len(external) > 0 {
		r["tilesets"] = append(r["tilesets"], issue{Type: "error", Message: "Tilesets in TSX/TSJ format are not supported. You must embed the tilesets in the map directly.",
			Details: "We detected the following tileset(s): " + strings.Join(external, ", ") + ".", Link: rulesLink})
	}
	if len(r) == 0 {
		return nil
	}
	return r
}
