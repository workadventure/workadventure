package wam

import (
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"strings"
)

// Patch applies a JSON Patch (RFC 6902) to a document decoded from JSON, and returns the new document. A failed
// operation leaves doc untouched only if the caller patches a copy: operations apply in order.
func Patch(doc any, ops []any) (any, error) {
	for i, raw := range ops {
		op, _ := raw.(map[string]any)
		name, _ := op["op"].(string)
		at, ok := op["path"].(string)
		if !ok {
			return nil, fmt.Errorf("operation %d has no path", i)
		}
		var err error
		switch name {
		case "add":
			doc, err = put(doc, at, op["value"], true)
		case "replace":
			doc, err = put(doc, at, op["value"], false)
		case "remove":
			doc, _, err = take(doc, at)
		case "test":
			var v any
			if v, err = get(doc, at); err == nil && !reflect.DeepEqual(v, op["value"]) {
				err = fmt.Errorf("test failed at %s", at)
			}
		case "move", "copy":
			from, _ := op["from"].(string)
			var v any
			if name == "move" {
				doc, v, err = take(doc, from)
			} else {
				v, err = get(doc, from)
			}
			if err == nil {
				doc, err = put(doc, at, v, true)
			}
		default:
			err = fmt.Errorf("unknown operation %q", name)
		}
		if err != nil {
			return nil, err
		}
	}
	return doc, nil
}

func tokens(pointer string) ([]string, error) {
	if pointer == "" {
		return nil, nil
	}
	if !strings.HasPrefix(pointer, "/") {
		return nil, fmt.Errorf("invalid pointer %q", pointer)
	}
	ts := strings.Split(pointer[1:], "/")
	for i, t := range ts {
		ts[i] = strings.ReplaceAll(strings.ReplaceAll(t, "~1", "/"), "~0", "~")
	}
	return ts, nil
}

var errNoPath = errors.New("path not found")

func get(doc any, pointer string) (any, error) {
	ts, err := tokens(pointer)
	if err != nil {
		return nil, err
	}
	for _, t := range ts {
		switch c := doc.(type) {
		case map[string]any:
			v, ok := c[t]
			if !ok {
				return nil, errNoPath
			}
			doc = v
		case []any:
			i, err := strconv.Atoi(t)
			if err != nil || i < 0 || i >= len(c) {
				return nil, errNoPath
			}
			doc = c[i]
		default:
			return nil, errNoPath
		}
	}
	return doc, nil
}

// parent splits a pointer into its container and last token.
func parent(doc any, pointer string) (any, string, error) {
	ts, err := tokens(pointer)
	if err != nil || len(ts) == 0 {
		return nil, "", err
	}
	last := len(ts) - 1
	p := "/" + strings.Join(escapeAll(ts[:last]), "/")
	if last == 0 {
		p = ""
	}
	c, err := get(doc, p)
	return c, ts[last], err
}

func escapeAll(ts []string) []string {
	out := make([]string, len(ts))
	for i, t := range ts {
		out[i] = strings.ReplaceAll(strings.ReplaceAll(t, "~", "~0"), "/", "~1")
	}
	return out
}

// put adds (insert) or replaces (must exist) the value at pointer.
func put(doc any, pointer string, v any, insert bool) (any, error) {
	if pointer == "" {
		return v, nil
	}
	c, t, err := parent(doc, pointer)
	if err != nil {
		return nil, err
	}
	switch c := c.(type) {
	case map[string]any:
		if _, ok := c[t]; !ok && !insert {
			return nil, errNoPath
		}
		c[t] = v
	case []any:
		i := len(c)
		if t != "-" {
			if i, err = strconv.Atoi(t); err != nil || i < 0 || i > len(c) || (!insert && i == len(c)) {
				return nil, errNoPath
			}
		} else if !insert {
			return nil, errNoPath
		}
		if !insert {
			c[i] = v
			return doc, nil
		}
		grown := append(c[:i:i], append([]any{v}, c[i:]...)...)
		return put(doc, pointer[:strings.LastIndex(pointer, "/")], grown, false)
	default:
		return nil, errNoPath
	}
	return doc, nil
}

func take(doc any, pointer string) (any, any, error) {
	v, err := get(doc, pointer)
	if err != nil {
		return nil, nil, err
	}
	c, t, err := parent(doc, pointer)
	if err != nil {
		return nil, nil, err
	}
	switch c := c.(type) {
	case map[string]any:
		delete(c, t)
	case []any:
		i, _ := strconv.Atoi(t)
		shrunk := append(c[:i:i], c[i+1:]...)
		if doc, err = put(doc, pointer[:strings.LastIndex(pointer, "/")], shrunk, false); err != nil {
			return nil, nil, err
		}
	}
	return doc, v, nil
}
