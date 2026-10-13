//! Memory budgets shared by every session. A bound per connection is not enough: 400 connections that each
//! keep 4 MiB for a resume already make 1.6 GB (measured: the server was OOM-killed at 1 GB in a 400-player
//! room). A budget caps the sum.

use std::sync::atomic::{AtomicUsize, Ordering};

#[derive(Debug)]
pub struct Budget {
    used: AtomicUsize,
    max: usize,
}

impl Budget {
    pub fn new(max: usize) -> Self {
        Self {
            used: AtomicUsize::new(0),
            max,
        }
    }

    pub fn add(&self, n: usize) {
        self.used.fetch_add(n, Ordering::Relaxed);
    }

    pub fn sub(&self, n: usize) {
        self.used.fetch_sub(n, Ordering::Relaxed);
    }

    pub fn used(&self) -> usize {
        self.used.load(Ordering::Relaxed)
    }

    pub fn exceeded(&self) -> bool {
        self.used() > self.max
    }

    /// Would `n` more bytes go over the budget?
    pub fn would_exceed(&self, n: usize) -> bool {
        self.used() + n > self.max
    }
}
