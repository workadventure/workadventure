package wam

import (
	"bytes"
	"encoding/json"

	jsonpatch "github.com/evanphx/json-patch/v5"
)

// patchOptions match fast-json-patch's applyPatch(doc, ops, validateOperation=true), which map-storage's PATCH
// route calls: a negative array index is refused (evanphx accepts it by default, fast-json-patch does not), and a
// remove or an add whose parent is missing fails instead of being ignored or creating the path.
var patchOptions = func() *jsonpatch.ApplyOptions {
	o := jsonpatch.NewApplyOptions()
	o.SupportNegativeIndices = false
	o.AllowMissingPathOnRemove = false
	o.EnsurePathExistsOnAdd = false
	return o
}()

// Patch applies a JSON Patch (RFC 6902) to a document decoded from JSON, and returns the new document; doc itself is
// never modified, the patch works on a serialised copy. Numbers come back as json.Number, as the callers decode them.
func Patch(doc any, ops []any) (any, error) {
	raw, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}
	rawOps, err := json.Marshal(ops)
	if err != nil {
		return nil, err
	}
	patch, err := jsonpatch.DecodePatch(rawOps)
	if err != nil {
		return nil, err
	}
	out, err := patch.ApplyWithOptions(raw, patchOptions)
	if err != nil {
		return nil, err
	}
	dec := json.NewDecoder(bytes.NewReader(out))
	dec.UseNumber()
	var patched any
	if err := dec.Decode(&patched); err != nil {
		return nil, err
	}
	return patched, nil
}
