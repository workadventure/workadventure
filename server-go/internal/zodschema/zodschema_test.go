package zodschema

import "testing"

// zod counts a string's length in UTF-16 code units, JSON Schema in code points: an emoji outside the BMP is 1 code
// point and 2 units. The exported schema says minLengthUTF16/maxLengthUTF16, so Go decides as the front does.
func TestStringLengthsCountUTF16CodeUnitsAsZodDoes(t *testing.T) {
	s := Compile([]byte(`{"definitions": {"Name": {"type": "string", "minLengthUTF16": 2, "maxLengthUTF16": 3}}}`), "Name")["Name"]
	for _, c := range []struct {
		v  string
		ok bool
	}{
		{"a", false},  // 1 unit
		{"😀", true},   // 1 code point, 2 units: JSON Schema's minLength 2 would refuse it, zod accepts
		{"a😀", true},  // 3 units
		{"😀😀", false}, // 2 code points, 4 units: JSON Schema's maxLength 3 would accept it, zod refuses
	} {
		if err := Validate(s, c.v); (err == nil) != c.ok {
			t.Errorf("%q: %v, want ok %v", c.v, err, c.ok)
		}
	}
}
