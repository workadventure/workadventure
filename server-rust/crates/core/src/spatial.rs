//! A uniform grid index, to find who is within a radius without scanning the whole room (same role as
//! `SpatialMap` in shared-utils).

use std::collections::HashMap;
use std::hash::Hash;

use crate::geometry::distance;

pub struct Grid<K> {
    cell: f64,
    cells: HashMap<(i64, i64), Vec<K>>,
    items: HashMap<K, (f64, f64)>,
}

impl<K: Copy + Eq + Hash + Ord> Grid<K> {
    pub fn new(cell: f64) -> Self {
        Self {
            cell: cell.max(1.0),
            cells: HashMap::new(),
            items: HashMap::new(),
        }
    }

    fn cell_of(&self, x: f64, y: f64) -> (i64, i64) {
        ((x / self.cell).floor() as i64, (y / self.cell).floor() as i64)
    }

    pub fn set(&mut self, key: K, x: f64, y: f64) {
        if let Some(&(ox, oy)) = self.items.get(&key) {
            let (old, new) = (self.cell_of(ox, oy), self.cell_of(x, y));
            if old == new {
                self.items.insert(key, (x, y));
                return;
            }
            self.remove(key);
        }
        let c = self.cell_of(x, y);
        self.cells.entry(c).or_default().push(key);
        self.items.insert(key, (x, y));
    }

    pub fn remove(&mut self, key: K) {
        let Some((x, y)) = self.items.remove(&key) else { return };
        let c = self.cell_of(x, y);
        if let Some(v) = self.cells.get_mut(&c) {
            v.retain(|k| *k != key);
            if v.is_empty() {
                self.cells.remove(&c);
            }
        }
    }

    /// Keys within `radius` of (x, y), sorted (deterministic order).
    pub fn query_circle(&self, x: f64, y: f64, radius: f64) -> Vec<K> {
        let (min_i, min_j) = self.cell_of(x - radius, y - radius);
        let (max_i, max_j) = self.cell_of(x + radius, y + radius);
        let mut found = Vec::new();
        for j in min_j..=max_j {
            for i in min_i..=max_i {
                for k in self.cells.get(&(i, j)).into_iter().flatten() {
                    if distance((x, y), self.items[k]) <= radius {
                        found.push(*k);
                    }
                }
            }
        }
        found.sort_unstable();
        found
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_only_what_is_in_the_circle() {
        let mut g = Grid::new(64.0);
        g.set(1, 0.0, 0.0);
        g.set(2, 60.0, 0.0);
        g.set(3, 200.0, 0.0);
        assert_eq!(g.query_circle(0.0, 0.0, 64.0), vec![1, 2]);
        g.set(2, 500.0, 500.0);
        assert_eq!(g.query_circle(0.0, 0.0, 64.0), vec![1]);
        g.remove(1);
        assert!(g.query_circle(0.0, 0.0, 64.0).is_empty());
    }
}
