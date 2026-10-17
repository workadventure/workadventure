package httpapi

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// The world's colors as CSS variables (GenerateCustomColors.ts): chroma.scale(["white", hex, "black"]).colors(12),
// read as HSL. Same interpolation (linear RGB), same roundings: the values are the TS ones to the digit.

type rgb struct{ r, g, b float64 }

func parseHex(s string) (rgb, bool) {
	s = strings.TrimPrefix(strings.TrimSpace(s), "#")
	if len(s) == 3 {
		s = string([]byte{s[0], s[0], s[1], s[1], s[2], s[2]})
	}
	if len(s) != 6 {
		return rgb{}, false
	}
	v, err := strconv.ParseUint(s, 16, 32)
	if err != nil {
		return rgb{}, false
	}
	return rgb{float64(v >> 16 & 0xff), float64(v >> 8 & 0xff), float64(v & 0xff)}, true
}

// hsl is chroma's rgb2hsl, rounded like getHslColor (hue 0 for a grey).
func (c rgb) hsl() string {
	r, g, b := c.r/255, c.g/255, c.b/255
	mx, mn := math.Max(r, math.Max(g, b)), math.Min(r, math.Min(g, b))
	l := (mx + mn) / 2
	var h, s float64
	if mx != mn {
		if l < 0.5 {
			s = (mx - mn) / (mx + mn)
		} else {
			s = (mx - mn) / (2 - mx - mn)
		}
		switch mx {
		case r:
			h = (g - b) / (mx - mn)
		case g:
			h = 2 + (b-r)/(mx-mn)
		default:
			h = 4 + (r-g)/(mx-mn)
		}
		h *= 60
		if h < 0 {
			h += 360
		}
	}
	return fmt.Sprintf("%d %d%% %d%%", int(math.Round(h)), int(math.Round(s*100)), int(math.Round(l*100)))
}

// scaleColor is the color at t of white -> c -> black, rounded to integers like chroma's .hex().
func scaleColor(c rgb, t float64) rgb {
	lerp := func(a, b, f float64) float64 { return math.Round(a + (b-a)*f) }
	if t <= 0.5 {
		f := t / 0.5
		return rgb{lerp(255, c.r, f), lerp(255, c.g, f), lerp(255, c.b, f)}
	}
	f := (t - 0.5) / 0.5
	return rgb{lerp(c.r, 0, f), lerp(c.g, 0, f), lerp(c.b, 0, f)}
}

// stringPalette is getStringPalette: "" without a color.
func stringPalette(hex, prefix string) string {
	c, ok := parseHex(hex)
	if !ok {
		return ""
	}
	color := func(i int) string { return scaleColor(c, float64(i)/11).hsl() }
	var b strings.Builder
	fmt.Fprintf(&b, "--%s-50: %s;\n", prefix, color(1))
	// The TS loops i += 0.1 while i < 0.9: the float sum reaches 0.8999…, so it runs nine times (-100 … -900).
	for i := 1; i <= 9; i++ {
		code := "-" + strconv.Itoa(i*100)
		if i == 5 {
			code = ""
		}
		fmt.Fprintf(&b, "--%s%s: %s;\n", prefix, code, color(i))
	}
	return b.String()
}

// cssOverride is wrapWithStyleTag of the secondary (primaryColor) and contrast (backgroundColor) palettes.
func cssOverride(primary, background string) string {
	secondary, contrast := stringPalette(primary, "secondary"), stringPalette(background, "contrast")
	if secondary == "" && contrast == "" {
		return ""
	}
	return "<style>\n\n        :root {\n\n            " + secondary + "\n" + contrast + "\n            }\n\n        </style>"
}
