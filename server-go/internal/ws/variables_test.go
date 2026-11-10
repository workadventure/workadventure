package ws

import (
	"os"
	"testing"
)

func TestDeclaredVariablesOfATiledMap(t *testing.T) {
	tiled, err := os.ReadFile("../../../maps/tests/Variables/empty_with_variable.json")
	if err != nil {
		t.Fatal(err)
	}
	defs, defaults := declaredVariables(tiled)
	if !defs["textField"].Persist || defaults["textField"] != `"default value"` {
		t.Fatalf("%v %v", defs, defaults)
	}
	if isLocal("maps.workadventure.localhost") != true || isLocal("example.com") || !isLocal("10.0.0.4") {
		t.Fatal("local addresses")
	}
}
