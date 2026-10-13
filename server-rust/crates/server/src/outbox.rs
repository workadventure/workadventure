//! Per-connection outbound queue, bounded (rule 7).
//!
//! Producers (room and space actors) push already-encoded frames without awaiting: a push takes a short,
//! uncontended lock and never blocks on the network. The connection's writer task drains it.
//!
//! Backpressure policy, in this order:
//! 1. a position update replaces the not-yet-sent one of the same user (it is superseded anyway);
//! 2. when the queue is still over its frame or byte budget, the consumer is too slow: the outbox closes, every
//!    later push is refused, and the writer ends the session;
//! 3. when all the outboxes together hold more than the shared budget, a consumer that is lagging (more than
//!    LAGGING_BYTES queued) is closed too. A consumer that keeps up is never closed for that.
//!
//! The first frame of an empty queue is always accepted, whatever its size: a large broadcast (an uploaded
//! entity carries the file) must not close every session of the room.
//!
//! A replaced move only ever jumps over moves of *other* users, which commute: any other frame is a barrier
//! that stops coalescing, so a move can never overtake the join or leave of the same user.

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use bytes::Bytes;
use parking_lot::Mutex;
use tokio::sync::Notify;

use crate::budget::Budget;

/// Above this, a queue is behind (a 100 ms batch is a few kB).
pub const LAGGING_BYTES: usize = 64 * 1024;

/// A frame waiting to be written.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Frame {
    /// One `SubMessage`, encoded once and shared by every recipient. The writer groups consecutive ones into a
    /// `BatchMessage`.
    Sub(Bytes),
    /// A whole `ServerToClientMessage`, sent as is, right away.
    Direct(Bytes),
}

impl Frame {
    fn len(&self) -> usize {
        match self {
            Frame::Sub(b) | Frame::Direct(b) => b.len(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CloseReason {
    /// The consumer did not keep up: frames were lost, the session cannot be resumed.
    SlowConsumer,
    /// The session ended for another reason (left, kicked, replaced...).
    Ended,
}

#[derive(Debug, Clone, Copy)]
pub struct Limits {
    pub max_frames: usize,
    pub max_bytes: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            max_frames: 4096,
            max_bytes: 2 * 1024 * 1024,
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct Closed;

#[derive(Default)]
struct State {
    frames: VecDeque<Frame>,
    bytes: usize,
    /// Sequence number of `frames[0]`.
    head_seq: u64,
    /// Pending position update of each mover since the last barrier, by sequence number.
    moves: HashMap<i32, u64>,
    has_direct: bool,
    closed: Option<CloseReason>,
}

pub struct Outbox {
    state: Mutex<State>,
    notify: Notify,
    limits: Limits,
    budget: Arc<Budget>,
}

/// What the writer took out of the outbox.
pub struct Drained {
    pub frames: VecDeque<Frame>,
    pub closed: Option<CloseReason>,
}

impl Outbox {
    pub fn new(limits: Limits, budget: Arc<Budget>) -> Self {
        Self {
            state: Mutex::new(State::default()),
            notify: Notify::new(),
            limits,
            budget,
        }
    }

    pub fn push(&self, frame: Frame) -> Result<(), Closed> {
        let mut st = self.state.lock();
        if st.closed.is_some() {
            return Err(Closed);
        }
        st.moves.clear();
        let direct = matches!(frame, Frame::Direct(_));
        st.has_direct |= direct;
        let wake = direct || st.frames.is_empty();
        self.append(&mut st, frame)?;
        drop(st);
        if wake {
            self.notify.notify_one();
        }
        Ok(())
    }

    /// Pushes the position update of `mover`, replacing its previous one if it is still queued.
    pub fn push_move(&self, mover: i32, bytes: Bytes) -> Result<(), Closed> {
        let mut st = self.state.lock();
        if st.closed.is_some() {
            return Err(Closed);
        }
        if let Some(&seq) = st.moves.get(&mover)
            && let Some(idx) = seq.checked_sub(st.head_seq)
            && let Some(slot) = st.frames.get_mut(idx as usize)
        {
            let old_len = slot.len();
            let new_len = bytes.len();
            *slot = Frame::Sub(bytes);
            st.bytes = st.bytes - old_len + new_len;
            self.budget.sub(old_len);
            self.budget.add(new_len);
            return Ok(());
        }
        let wake = st.frames.is_empty();
        let seq = st.head_seq + st.frames.len() as u64;
        self.append(&mut st, Frame::Sub(bytes))?;
        st.moves.insert(mover, seq);
        drop(st);
        if wake {
            self.notify.notify_one();
        }
        Ok(())
    }

    fn append(&self, st: &mut State, frame: Frame) -> Result<(), Closed> {
        let len = frame.len();
        let over_own = st.frames.len() >= self.limits.max_frames || st.bytes + len > self.limits.max_bytes;
        let over_shared = st.bytes > LAGGING_BYTES && self.budget.would_exceed(len);
        if !st.frames.is_empty() && (over_own || over_shared) {
            self.close_locked(st, CloseReason::SlowConsumer);
            self.notify.notify_one();
            return Err(Closed);
        }
        st.bytes += len;
        self.budget.add(len);
        st.frames.push_back(frame);
        Ok(())
    }

    fn close_locked(&self, st: &mut State, reason: CloseReason) {
        if st.closed.is_none() {
            st.closed = Some(reason);
        }
        // Whatever is queued will never be written: free it now.
        st.head_seq += st.frames.len() as u64;
        st.frames = VecDeque::new();
        self.budget.sub(st.bytes);
        st.bytes = 0;
        st.moves = HashMap::new();
    }

    pub fn close(&self, reason: CloseReason) {
        self.close_locked(&mut self.state.lock(), reason);
        self.notify.notify_one();
    }

    pub fn is_closed(&self) -> bool {
        self.state.lock().closed.is_some()
    }

    /// True when a frame that must go out immediately is waiting.
    pub fn has_direct(&self) -> bool {
        self.state.lock().has_direct
    }

    /// Waits until something was pushed (or the outbox closed). Does not take anything.
    pub async fn wait(&self) {
        self.notify.notified().await;
    }

    /// Takes everything queued so far.
    pub fn drain(&self) -> Drained {
        let mut st = self.state.lock();
        st.head_seq += st.frames.len() as u64;
        self.budget.sub(st.bytes);
        st.bytes = 0;
        st.moves.clear();
        st.has_direct = false;
        Drained {
            frames: std::mem::take(&mut st.frames),
            closed: st.closed,
        }
    }

    pub fn queued(&self) -> usize {
        self.state.lock().frames.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn b(s: &'static str) -> Bytes {
        Bytes::from_static(s.as_bytes())
    }

    fn outbox(limits: Limits) -> Outbox {
        Outbox::new(limits, Arc::new(Budget::new(usize::MAX)))
    }

    #[test]
    fn a_newer_move_replaces_the_queued_one_in_place() {
        let o = outbox(Limits::default());
        o.push_move(1, b("u1@a")).unwrap();
        o.push_move(2, b("u2@a")).unwrap();
        o.push_move(1, b("u1@b")).unwrap();
        let d = o.drain();
        assert_eq!(d.frames, vec![Frame::Sub(b("u1@b")), Frame::Sub(b("u2@a"))]);
    }

    #[test]
    fn a_move_never_jumps_over_another_frame() {
        let o = outbox(Limits::default());
        o.push_move(1, b("u1@a")).unwrap();
        o.push(Frame::Sub(b("u1 left"))).unwrap();
        o.push_move(1, b("u1@b")).unwrap();
        let d = o.drain();
        assert_eq!(
            d.frames,
            vec![Frame::Sub(b("u1@a")), Frame::Sub(b("u1 left")), Frame::Sub(b("u1@b"))]
        );
    }

    #[test]
    fn coalescing_restarts_after_a_drain() {
        let o = outbox(Limits::default());
        o.push_move(1, b("u1@a")).unwrap();
        assert_eq!(o.drain().frames.len(), 1);
        o.push_move(1, b("u1@b")).unwrap();
        o.push_move(1, b("u1@c")).unwrap();
        assert_eq!(o.drain().frames, vec![Frame::Sub(b("u1@c"))]);
    }

    #[test]
    fn a_slow_consumer_is_closed_and_its_queue_freed() {
        let o = outbox(Limits {
            max_frames: 3,
            max_bytes: 1 << 20,
        });
        for _ in 0..3 {
            o.push(Frame::Sub(b("x"))).unwrap();
        }
        // The 4th frame overflows: the session is closed, not the frame dropped.
        for _ in 0..100 {
            o.push_move(7, b("m")).unwrap_err();
        }
        assert!(o.is_closed());
        assert_eq!(o.queued(), 0);
        assert_eq!(o.push(Frame::Direct(b("late"))), Err(Closed));
        assert_eq!(o.drain().closed, Some(CloseReason::SlowConsumer));
    }

    #[test]
    fn coalesced_moves_do_not_count_against_the_budget() {
        let o = outbox(Limits {
            max_frames: 2,
            max_bytes: 1 << 20,
        });
        o.push(Frame::Sub(b("x"))).unwrap();
        for _ in 0..1000 {
            o.push_move(7, b("m")).unwrap();
        }
        assert!(!o.is_closed());
        assert_eq!(o.queued(), 2);
    }

    #[test]
    fn the_byte_budget_is_enforced_but_one_big_frame_fits() {
        let o = outbox(Limits {
            max_frames: 100,
            max_bytes: 10,
        });
        o.push(Frame::Direct(Bytes::from(vec![0; 50]))).unwrap();
        assert_eq!(o.push(Frame::Sub(Bytes::from(vec![0; 8]))), Err(Closed));
        assert!(o.is_closed());
    }

    #[test]
    fn the_shared_budget_closes_lagging_consumers_only() {
        let budget = Arc::new(Budget::new(LAGGING_BYTES * 2));
        let limits = Limits {
            max_frames: 1 << 20,
            max_bytes: 1 << 30,
        };
        let lagging = Outbox::new(limits, budget.clone());
        let fresh = Outbox::new(limits, budget.clone());
        let chunk = || Frame::Sub(Bytes::from(vec![0; 1024]));
        while lagging.push(chunk()).is_ok() {}
        assert!(lagging.is_closed());
        assert_eq!(budget.used(), 0, "a closed outbox gives its bytes back");
        // The budget was full, yet a consumer that keeps up can always get the next frames.
        for _ in 0..10 {
            fresh.push(chunk()).unwrap();
            fresh.drain();
        }
        assert!(!fresh.is_closed());
    }
}
