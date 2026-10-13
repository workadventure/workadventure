//! Concurrent registries (rooms, spaces, resumable connections). Sharded maps: no global lock, and a shard
//! lock is never held across an `.await`.

use std::hash::Hash;

use dashmap::DashMap;

/// Something with an identity, so a dying owner only unregisters itself and not its successor.
pub trait Identified {
    fn instance_id(&self) -> u64;
}

pub struct Registry<K: Eq + Hash, H> {
    map: DashMap<K, H>,
}

impl<K: Eq + Hash + Clone, H: Clone + Identified> Registry<K, H> {
    pub fn new() -> Self {
        Self { map: DashMap::new() }
    }

    pub fn get(&self, key: &K) -> Option<H> {
        self.map.get(key).map(|h| h.clone())
    }

    /// Returns the handle for `key`, creating it once if needed. `create` runs under the shard lock: it must be
    /// cheap and must not block (spawning a task is fine).
    pub fn get_or_create(&self, key: &K, create: impl FnOnce() -> H) -> H {
        if let Some(h) = self.map.get(key) {
            return h.clone();
        }
        self.map.entry(key.clone()).or_insert_with(create).clone()
    }

    /// Removes `key` only if it still maps to the instance `id`.
    pub fn remove_instance(&self, key: &K, id: u64) -> bool {
        self.map.remove_if(key, |_, h| h.instance_id() == id).is_some()
    }

    pub fn insert(&self, key: K, handle: H) -> Option<H> {
        self.map.insert(key, handle)
    }

    pub fn count(&self) -> usize {
        self.map.len()
    }
}

impl<K: Eq + Hash + Clone, H: Clone + Identified> Default for Registry<K, H> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicU64, Ordering};

    #[derive(Clone)]
    struct H(u64);
    impl Identified for H {
        fn instance_id(&self) -> u64 {
            self.0
        }
    }

    #[test]
    fn concurrent_creations_share_one_instance() {
        let reg = Arc::new(Registry::<String, H>::new());
        let created = Arc::new(AtomicU64::new(0));
        let threads: Vec<_> = (0..16)
            .map(|_| {
                let reg = reg.clone();
                let created = created.clone();
                std::thread::spawn(move || {
                    reg.get_or_create(&"room".to_owned(), || H(created.fetch_add(1, Ordering::SeqCst))).0
                })
            })
            .collect();
        let ids: Vec<u64> = threads.into_iter().map(|t| t.join().unwrap()).collect();
        assert_eq!(created.load(Ordering::SeqCst), 1);
        assert!(ids.iter().all(|&id| id == 0));
    }

    #[test]
    fn a_dying_instance_does_not_remove_its_successor() {
        let reg = Registry::<String, H>::new();
        reg.insert("room".to_owned(), H(2));
        assert!(!reg.remove_instance(&"room".to_owned(), 1));
        assert!(reg.remove_instance(&"room".to_owned(), 2));
        assert_eq!(reg.count(), 0);
    }
}
