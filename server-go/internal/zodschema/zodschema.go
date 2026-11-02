// Package zodschema validates Go values against the JSON Schemas exported from zod (server-go/schemas), with zod's
// semantics where JSON Schema's differ: a string's minLength and maxLength count UTF-16 code units (JavaScript's
// String.length), not code points. The exporter writes them as minLengthUTF16 and maxLengthUTF16, which this
// package's vocabulary checks.
package zodschema

import (
	"bytes"
	"encoding/json"
	"strings"
	"unicode/utf16"

	"github.com/santhosh-tekuri/jsonschema/v6"
	"golang.org/x/text/message"
)

// Compile compiles doc, an exported schema, and returns the schema of each named definition.
func Compile(doc []byte, defs ...string) map[string]*jsonschema.Schema {
	v, err := jsonschema.UnmarshalJSON(bytes.NewReader(doc))
	if err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	c.RegisterVocabulary(utf16Vocab())
	c.AssertVocabs()
	if err := c.AddResource("doc.json", v); err != nil {
		panic(err)
	}
	out := make(map[string]*jsonschema.Schema, len(defs))
	for _, d := range defs {
		out[d] = c.MustCompile("doc.json#/definitions/" + d)
	}
	return out
}

// Validate checks v, as it encodes to JSON, against s.
func Validate(s *jsonschema.Schema, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(b))
	if err != nil {
		return err
	}
	return s.Validate(inst)
}

// JSLength is String.prototype.length: UTF-16 code units.
func JSLength(s string) int { return len(utf16.Encode([]rune(s))) }

const vocabURL = "https://workadventu.re/schemas/zod-utf16"

type lengths struct{ min, max *int }

func (l *lengths) Validate(ctx *jsonschema.ValidatorContext, v any) {
	s, ok := v.(string)
	if !ok {
		return
	}
	if n := JSLength(s); l.min != nil && n < *l.min {
		ctx.AddError(&lengthError{"minLengthUTF16", n, *l.min})
	} else if l.max != nil && n > *l.max {
		ctx.AddError(&lengthError{"maxLengthUTF16", n, *l.max})
	}
}

type lengthError struct {
	keyword   string
	got, want int
}

func (e *lengthError) KeywordPath() []string { return []string{e.keyword} }
func (e *lengthError) LocalizedString(p *message.Printer) string {
	return p.Sprintf("%s: length %d in UTF-16 code units, want %d", e.keyword, e.got, e.want)
}

func utf16Vocab() *jsonschema.Vocabulary {
	meta, err := jsonschema.UnmarshalJSON(strings.NewReader(`{"properties": {
		"minLengthUTF16": {"type": "integer", "minimum": 0}, "maxLengthUTF16": {"type": "integer", "minimum": 0}}}`))
	if err != nil {
		panic(err)
	}
	c := jsonschema.NewCompiler()
	if err := c.AddResource(vocabURL, meta); err != nil {
		panic(err)
	}
	return &jsonschema.Vocabulary{URL: vocabURL, Schema: c.MustCompile(vocabURL), Compile: func(_ *jsonschema.CompilerContext, obj map[string]any) (jsonschema.SchemaExt, error) {
		l := &lengths{min: intOf(obj["minLengthUTF16"]), max: intOf(obj["maxLengthUTF16"])}
		if l.min == nil && l.max == nil {
			return nil, nil
		}
		return l, nil
	}}
}

func intOf(v any) *int {
	n, ok := v.(json.Number)
	if !ok {
		return nil
	}
	i, err := n.Int64()
	if err != nil {
		return nil
	}
	x := int(i)
	return &x
}
