package core

import "math"

// spatialIndex finds the players or bubbles within a radius without scanning the whole room (SpatialMap of
// libs/shared-utils). Entries are bucketed in square cells; a cell keeps insertion order so that results, and
// therefore who joins whom on a tie, are deterministic.
type spatialIndex[T comparable] struct {
	cellSize float64
	cells    map[[2]int64][]spatialEntry[T]
	where    map[T][2]int64
	pos      map[T][2]float64
}

type spatialEntry[T comparable] struct {
	v    T
	x, y float64
}

func newSpatialIndex[T comparable](cellSize float64) *spatialIndex[T] {
	return &spatialIndex[T]{
		cellSize: math.Max(cellSize, 1),
		cells:    map[[2]int64][]spatialEntry[T]{},
		where:    map[T][2]int64{},
		pos:      map[T][2]float64{},
	}
}

func (s *spatialIndex[T]) cell(x, y float64) [2]int64 {
	return [2]int64{int64(math.Floor(x / s.cellSize)), int64(math.Floor(y / s.cellSize))}
}

// set inserts v or moves it.
func (s *spatialIndex[T]) set(v T, x, y float64) {
	c := s.cell(x, y)
	if old, ok := s.where[v]; ok {
		if old == c {
			entries := s.cells[c]
			for i := range entries {
				if entries[i].v == v {
					entries[i].x, entries[i].y = x, y
				}
			}
			s.pos[v] = [2]float64{x, y}
			return
		}
		s.removeFromCell(v, old)
	}
	s.cells[c] = append(s.cells[c], spatialEntry[T]{v, x, y})
	s.where[v] = c
	s.pos[v] = [2]float64{x, y}
}

func (s *spatialIndex[T]) remove(v T) {
	if c, ok := s.where[v]; ok {
		s.removeFromCell(v, c)
		delete(s.where, v)
		delete(s.pos, v)
	}
}

func (s *spatialIndex[T]) removeFromCell(v T, c [2]int64) {
	entries := s.cells[c]
	for i := range entries {
		if entries[i].v == v {
			entries = append(entries[:i], entries[i+1:]...)
			break
		}
	}
	if len(entries) == 0 {
		delete(s.cells, c)
	} else {
		s.cells[c] = entries
	}
}

// within returns the values whose position is inside the circle, cell by cell (x major), like SpatialMap.
func (s *spatialIndex[T]) within(x, y, radius float64) []T {
	min, max := s.cell(x-radius, y-radius), s.cell(x+radius, y+radius)
	r2 := radius * radius
	var out []T
	for cx := min[0]; cx <= max[0]; cx++ {
		for cy := min[1]; cy <= max[1]; cy++ {
			for _, e := range s.cells[[2]int64{cx, cy}] {
				dx, dy := e.x-x, e.y-y
				if dx*dx+dy*dy <= r2 {
					out = append(out, e.v)
				}
			}
		}
	}
	return out
}
