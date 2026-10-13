//! Frames kept for a transport resume (`lastReceivedNonce`), bounded by age, count and bytes.
//!
//! The TypeScript `NoncedMessageStore` was only bounded by age: on 2026-09-08 a pusher grew to 2.2 GB through
//! it. Here the oldest frames are evicted as soon as any budget is exceeded: the store's own (age, frames,
//! bytes) or the one shared by every session, in which case the store that is adding evicts its own oldest
//! frames (the busiest sessions shed first). An evicted frame only costs the client its resume:
//! `can_resume_after` then refuses, and the front opens a fresh connection.

use std::collections::VecDeque;
use std::sync::Arc;
use std::time::{Duration, Instant};

use bytes::Bytes;

use crate::budget::Budget;

#[derive(Debug, Clone, Copy)]
pub struct ResumeLimits {
    pub retention: Duration,
    pub max_frames: usize,
    pub max_bytes: usize,
}

pub struct ResumeStore {
    frames: VecDeque<(u32, Bytes, Instant)>,
    bytes: usize,
    limits: ResumeLimits,
    budget: Arc<Budget>,
    /// Highest nonce ever stored.
    last: u32,
}

impl ResumeStore {
    pub fn new(limits: ResumeLimits, budget: Arc<Budget>) -> Self {
        Self {
            frames: VecDeque::new(),
            bytes: 0,
            limits,
            budget,
            last: 0,
        }
    }

    pub fn add(&mut self, nonce: u32, frame: Bytes, now: Instant) {
        self.bytes += frame.len();
        self.budget.add(frame.len());
        self.frames.push_back((nonce, frame, now));
        self.last = nonce;
        self.prune(now);
    }

    fn prune(&mut self, now: Instant) {
        while let Some((_, frame, at)) = self.frames.front() {
            let too_old = now.duration_since(*at) > self.limits.retention;
            let too_big = self.frames.len() > self.limits.max_frames || self.bytes > self.limits.max_bytes;
            if !too_old && !too_big && !self.budget.exceeded() {
                break;
            }
            self.bytes -= frame.len();
            self.budget.sub(frame.len());
            self.frames.pop_front();
        }
    }

    /// True when every frame after `last_received` is still here, so the client can resume.
    pub fn can_resume_after(&mut self, last_received: u32, now: Instant) -> bool {
        self.prune(now);
        if last_received > self.last {
            return false;
        }
        match self.frames.front() {
            None => last_received == self.last,
            Some((first, _, _)) => *first <= last_received.saturating_add(1),
        }
    }

    pub fn after(&self, last_received: u32) -> impl Iterator<Item = &Bytes> {
        self.frames.iter().filter(move |(n, _, _)| *n > last_received).map(|(_, f, _)| f)
    }

    pub fn bytes(&self) -> usize {
        self.bytes
    }
}

impl Drop for ResumeStore {
    fn drop(&mut self) {
        self.budget.sub(self.bytes);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn limits() -> ResumeLimits {
        ResumeLimits {
            retention: Duration::from_secs(30),
            max_frames: 3,
            max_bytes: 100,
        }
    }

    fn store() -> ResumeStore {
        ResumeStore::new(limits(), Arc::new(Budget::new(usize::MAX)))
    }

    #[test]
    fn the_shared_budget_evicts_the_busy_store_and_is_given_back() {
        let now = Instant::now();
        let budget = Arc::new(Budget::new(50));
        let big = ResumeLimits {
            max_bytes: 1000,
            max_frames: 1000,
            ..limits()
        };
        let mut quiet = ResumeStore::new(big, budget.clone());
        quiet.add(1, Bytes::from(vec![0; 20]), now);
        let mut busy = ResumeStore::new(big, budget.clone());
        for n in 1..=10 {
            busy.add(n, Bytes::from(vec![0; 20]), now);
        }
        assert!(budget.used() <= 50);
        assert_eq!(quiet.bytes(), 20, "the quiet session kept its frame");
        drop(busy);
        drop(quiet);
        assert_eq!(budget.used(), 0);
    }

    #[test]
    fn replays_what_the_client_missed() {
        let now = Instant::now();
        let mut s = store();
        for n in 1..=3 {
            s.add(n, Bytes::from(vec![n as u8]), now);
        }
        assert!(s.can_resume_after(1, now));
        assert_eq!(s.after(1).map(|b| b[0]).collect::<Vec<_>>(), vec![2, 3]);
    }

    #[test]
    fn evicts_by_count_and_then_refuses_an_old_resume() {
        let now = Instant::now();
        let mut s = store();
        for n in 1..=5 {
            s.add(n, Bytes::from_static(b"x"), now);
        }
        assert!(!s.can_resume_after(1, now), "frame 2 was evicted");
        assert!(s.can_resume_after(2, now));
        assert!(s.can_resume_after(5, now), "up to date");
        assert!(!s.can_resume_after(6, now), "the client cannot be ahead of us");
    }

    #[test]
    fn evicts_by_bytes() {
        let now = Instant::now();
        let mut s = store();
        s.add(1, Bytes::from(vec![0; 60]), now);
        s.add(2, Bytes::from(vec![0; 60]), now);
        assert_eq!(s.bytes(), 60);
        assert!(!s.can_resume_after(0, now));
    }

    #[test]
    fn evicts_by_age() {
        let t0 = Instant::now();
        let mut s = store();
        s.add(1, Bytes::from_static(b"x"), t0);
        assert!(!s.can_resume_after(0, t0 + Duration::from_secs(31)));
        // Nothing left to replay, and the client had everything but frame 1.
        assert!(s.can_resume_after(1, t0 + Duration::from_secs(31)));
    }
}
