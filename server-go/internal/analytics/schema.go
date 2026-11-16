package analytics

//go:generate sh gen.sh

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// catalog.json is the JSON Schema of each event's properties, generated from AnalyticsEventCatalog.ts (gen.sh):
// what the pusher checks with the catalog's zod schemas (envelopeFor, openProperties) before it queues an event.
//
//go:embed catalog.json
var catalogJSON []byte

type eventSchemas struct{ properties, open *jsonschema.Schema }

var schemas = func() map[string]eventSchemas {
	var raw map[string]struct {
		Properties     json.RawMessage `json:"properties"`
		OpenProperties json.RawMessage `json:"openProperties"`
	}
	if err := json.Unmarshal(catalogJSON, &raw); err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	compile := func(id string, doc json.RawMessage) *jsonschema.Schema {
		if len(doc) == 0 {
			return nil
		}
		v, err := jsonschema.UnmarshalJSON(bytes.NewReader(doc))
		if err != nil {
			panic(err)
		}
		if err := c.AddResource(id, v); err != nil {
			panic(err)
		}
		return c.MustCompile(id)
	}
	out := make(map[string]eventSchemas, len(raw))
	for name, s := range raw {
		out[name] = eventSchemas{compile(name+".json", s.Properties), compile(name+".open.json", s.OpenProperties)}
	}
	return out
}()

// ValidProperties checks the properties a client reports for an event against the catalog.
func ValidProperties(name string, properties map[string]any) error {
	return check(schemas[name].properties, name, properties)
}

// ValidOpenProperties checks the properties a client opens a timed event with.
func ValidOpenProperties(name string, properties map[string]any) error {
	return check(schemas[name].open, name, properties)
}

func check(s *jsonschema.Schema, name string, properties map[string]any) error {
	if s == nil {
		return fmt.Errorf("no schema for %q", name)
	}
	b, err := json.Marshal(properties)
	if err != nil {
		return err
	}
	v, err := jsonschema.UnmarshalJSON(bytes.NewReader(b))
	if err != nil {
		return err
	}
	return s.Validate(v)
}
