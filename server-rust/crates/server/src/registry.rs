//! Concurrent registries of actors (rooms, spaces). Sharded maps: no global lock, and a shard lock is never
//! held across an `.await`.
//!
//! The registry only keeps a weak handle: an actor lives as long as somebody (a session in the room or in
//! the space) holds a strong one, and stops on its own when the last one is dropped, after it has processed
//! every message already in its mailbox. A dead entry is replaced on the next lookup, so a message can never
//! be sent to an actor that is going away.

use dashmap::DashMap;
use dashmap::mapref::entry::Entry;
use tokio::sync::mpsc;

pub struct ActorRegistry<C> {
    map: DashMap<String, mpsc::WeakSender<C>>,
}

impl<C> ActorRegistry<C> {
    pub fn new() -> Self {
        Self { map: DashMap::new() }
    }

    /// The actor for `key`, spawned by `spawn` if there is none alive. `spawn` runs under the shard lock: it
    /// must only create the channel and spawn the task.
    pub fn get_or_spawn(&self, key: &str, spawn: impl FnOnce() -> mpsc::Sender<C>) -> mpsc::Sender<C> {
        if let Some(tx) = self.map.get(key).and_then(|w| w.upgrade()) {
            return tx;
        }
        match self.map.entry(key.to_owned()) {
            Entry::Occupied(mut e) => {
                if let Some(tx) = e.get().upgrade() {
                    return tx;
                }
                let tx = spawn();
                e.insert(tx.downgrade());
                tx
            }
            Entry::Vacant(e) => {
                let tx = spawn();
                e.insert(tx.downgrade());
                tx
            }
        }
    }

    pub fn get(&self, key: &str) -> Option<mpsc::Sender<C>> {
        self.map.get(key).and_then(|w| w.upgrade())
    }

    /// Called by an actor that stopped: forgets its entry unless a successor already took it.
    pub fn forget_dead(&self, key: &str) {
        self.map.remove_if(key, |_, w| w.upgrade().is_none());
    }

    pub fn count(&self) -> usize {
        self.map.len()
    }
}

impl<C> Default for ActorRegistry<C> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicU32, Ordering};

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_lookups_share_one_actor() {
        let reg = Arc::new(ActorRegistry::<u32>::new());
        let spawned = Arc::new(AtomicU32::new(0));
        let mut handles = Vec::new();
        for _ in 0..32 {
            let reg = reg.clone();
            let spawned = spawned.clone();
            handles.push(tokio::spawn(async move {
                reg.get_or_spawn("room", || {
                    spawned.fetch_add(1, Ordering::SeqCst);
                    let (tx, mut rx) = mpsc::channel(8);
                    tokio::spawn(async move { while rx.recv().await.is_some() {} });
                    tx
                })
            }));
        }
        let senders: Vec<_> = futures_util::future::join_all(handles).await.into_iter().map(Result::unwrap).collect();
        assert_eq!(spawned.load(Ordering::SeqCst), 1);
        drop(senders);
    }

    #[test]
    fn a_dead_actor_is_replaced() {
        let reg = ActorRegistry::<u32>::new();
        let (tx, rx) = mpsc::channel(1);
        reg.get_or_spawn("room", || tx);
        // Every strong handle is gone (the one returned was dropped): the next lookup spawns again.
        drop(rx);
        let mut spawned = false;
        let (tx2, _rx2) = mpsc::channel::<u32>(1);
        let _live = reg.get_or_spawn("room", || {
            spawned = true;
            tx2
        });
        assert!(spawned);
        reg.forget_dead("room");
        assert_eq!(reg.count(), 1, "a live successor is kept");
    }
}
