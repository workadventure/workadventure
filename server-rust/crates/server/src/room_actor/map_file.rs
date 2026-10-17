//! The WAM file of a room: edits in order, I/O in tasks, versioned writes.

use super::*;

/// The WAM file of a map-storage room (back's WamManager + map-storage's MapsManager): edits apply here, in the
/// order they came, and a task of its own writes the newest version to disk. The file I/O an edit needs (custom
/// entities, private files, a reload) runs in a task: the room goes on with moves and the rest meanwhile, and
/// the edits after it wait their turn.
pub(super) struct MapFile {
    pub(super) rel: String,
    pub(super) storage: Arc<Storage>,
    pub(super) wam: Option<Wam>,
    /// The storage generation the file was read at.
    pub(super) generation: u64,
    /// Counts the changes to the WAM; each save carries it, so an older one never lands after a newer one.
    pub(super) revision: u64,
    pub(super) history: History<pb::EditMapCommandMessage>,
    pub(super) saves: tokio::sync::watch::Sender<Option<(u64, u64, Vec<u8>)>>,
    /// Waiting for the I/O in flight to finish, in order.
    pub(super) queue: VecDeque<Pending>,
    /// At most one task: the I/O in flight.
    pub(super) io: JoinSet<Done>,
    /// The `resourceUrl`s of the area properties, told of their changes before the edit applies.
    pub(super) hooks: resource_url::ResourceUrl,
    /// The map's lock, held for the room's life; the map goes back into it when the room ends.
    pub(super) slot: tokio::sync::OwnedMutexGuard<Option<CachedMap>>,
}

// A few at a time per map: not worth boxing the command.
#[allow(clippy::large_enum_variant)]
pub(super) enum Pending {
    Edit {
        session: Arc<Session>,
        command: pb::EditMapCommandMessage,
    },
    /// Files of openFile properties whose link went away.
    Remove(Vec<String>),
    /// The files changed over HTTP: read the WAM again.
    Load,
}

#[allow(clippy::large_enum_variant)]
pub(super) enum Done {
    Edit { session: Arc<Session>, command: pb::EditMapCommandMessage, result: Result<(), String> },
    Removed,
    Loaded { generation: u64, wam: Option<Wam> },
}

/// What the room tells its users.
#[allow(clippy::large_enum_variant)]
pub(super) enum Outcome {
    /// The command for everyone (as map-storage rewrites it), or the reason for its sender.
    Edited {
        session: Arc<Session>,
        id: String,
        result: Result<pb::EditMapCommandMessage, String>,
    },
    Reloaded,
}

impl Drop for MapFile {
    fn drop(&mut self) {
        *self.slot = Some(CachedMap {
            wam: self.wam.take(),
            history: std::mem::take(&mut self.history),
            generation: self.generation,
            revision: self.revision,
        });
    }
}

impl MapFile {
    pub(super) async fn open(storage: Arc<Storage>, rel: String, hooks: resource_url::ResourceUrl) -> Self {
        let (saves, mut pending) = tokio::sync::watch::channel(None::<(u64, u64, Vec<u8>)>);
        let (store, path) = (storage.clone(), rel.clone());
        // Writes the newest version only; ends after the last one once the room is gone.
        tokio::spawn(async move {
            while pending.changed().await.is_ok() {
                let Some((generation, revision, bytes)) = pending.borrow_and_update().clone() else { continue };
                store.save(&path, generation, revision, bytes).await;
            }
        });
        // A room for this map that is still ending gives it back first.
        let slot: MapSlot = storage.map_slot(&rel);
        let mut slot = slot.lock_owned().await;
        let cached = slot.take();
        let mut map = Self {
            rel,
            storage: storage.clone(),
            wam: None,
            generation: 0,
            revision: 0,
            history: History::default(),
            saves,
            queue: VecDeque::new(),
            io: JoinSet::new(),
            hooks,
            slot,
        };
        match cached {
            // Not changed over HTTP since: the copy in memory is the latest, with its recent edits.
            Some(c) if c.generation == storage.generation(&map.rel) => {
                map.wam = c.wam;
                map.history = c.history;
                map.generation = c.generation;
                map.revision = c.revision;
            }
            _ => {
                let generation = storage.generation(&map.rel);
                let wam = storage.read(&map.rel).await.and_then(|b| Wam::parse(&b));
                map.loaded(generation, wam);
            }
        }
        map
    }

    pub(super) fn loaded(&mut self, generation: u64, wam: Option<Wam>) {
        self.generation = generation;
        self.wam = wam;
        self.history.clear();
        self.revision = self.revision.max(self.storage.revision(&self.rel));
    }

    pub(super) fn submit(&mut self, pending: Pending) -> Vec<Outcome> {
        self.queue.push_back(pending);
        self.pump()
    }

    /// The I/O in flight finished: what it means, then the next ones in the queue.
    pub(super) fn finish(&mut self, done: Done) -> Vec<Outcome> {
        let mut out = Vec::new();
        match done {
            Done::Edit { session, command, result } => out.push(self.complete(session, command, result)),
            Done::Removed => {}
            Done::Loaded { generation, wam } => {
                self.loaded(generation, wam);
                out.push(Outcome::Reloaded);
            }
        }
        out.extend(self.pump());
        out
    }

    /// Applies what waits, up to the next I/O, which starts.
    pub(super) fn pump(&mut self) -> Vec<Outcome> {
        let mut out = Vec::new();
        while self.io.is_empty()
            && let Some(pending) = self.queue.pop_front()
        {
            let storage = self.storage.clone();
            match pending {
                Pending::Load => {
                    let rel = self.rel.clone();
                    self.io.spawn(async move {
                        let generation = storage.generation(&rel);
                        let wam = storage.read(&rel).await.and_then(|b| Wam::parse(&b));
                        Done::Loaded { generation, wam }
                    });
                }
                Pending::Remove(paths) => {
                    self.io.spawn(async move {
                        for path in paths {
                            storage.remove_asset(&path).await;
                        }
                        Done::Removed
                    });
                }
                Pending::Edit { session, command } => {
                    if let Some(outcome) = self.start(storage, session, command) {
                        out.push(outcome);
                    }
                }
            }
        }
        out
    }

    /// Starts the I/O of an editor command (MapStorageServer.handleEditMapCommandWithKeyMessage), or applies it
    /// at once when it has none.
    pub(super) fn start(
        &mut self,
        storage: Arc<Storage>,
        session: Arc<Session>,
        mut command: pb::EditMapCommandMessage,
    ) -> Option<Outcome> {
        use pb::edit_map_message::Message as M;
        let io = matches!(
            command.edit_map_message.as_ref().and_then(|m| m.message.as_ref()),
            Some(
                M::UploadEntityMessage(_)
                    | M::ModifyCustomEntityMessage(_)
                    | M::DeleteCustomEntityMessage(_)
                    | M::UploadFileMessage(_)
            )
        );
        // UpdateAreaMapStorageCommand and DeleteAreaMapStorageCommand: the property hooks first.
        let old_properties = |wam: &Option<Wam>, id: &str| -> Vec<serde_json::Value> {
            let area = wam.as_ref().and_then(|w| w.areas().iter().find(|a| a["id"] == id).cloned());
            area.and_then(|a| a["properties"].as_array().cloned()).unwrap_or_default()
        };
        let hooks = match command.edit_map_message.as_ref().and_then(|m| m.message.as_ref()) {
            Some(M::ModifyAreaMessage(m)) if m.modify_properties == Some(true) => {
                let new: Vec<serde_json::Value> = m.properties.iter().map(wire::json_from).collect();
                let (added, changed, removed) = resource_url::diff(&old_properties(&self.wam, &m.id), &new);
                (!(added.is_empty() && changed.is_empty() && removed.is_empty()))
                    .then_some((new, added, changed, removed))
            }
            Some(M::DeleteAreaMessage(m)) => {
                let removed = resource_url::diff(&old_properties(&self.wam, &m.id), &[]).2;
                (!removed.is_empty()).then_some((Vec::new(), Vec::new(), Vec::new(), removed))
            }
            _ => None,
        };
        if let Some((mut new, added, changed, removed)) = hooks {
            let hooks = self.hooks.clone();
            let area_id = match command.edit_map_message.as_ref().and_then(|m| m.message.as_ref()) {
                Some(M::ModifyAreaMessage(m)) => m.id.clone(),
                _ => String::new(),
            };
            let area = self.wam.as_ref().and_then(|w| w.areas().iter().find(|a| a["id"] == area_id.as_str()).cloned());
            self.io.spawn(async move {
                for i in added {
                    new[i] = hooks.added(new[i].clone()).await;
                }
                for i in changed {
                    new[i] = hooks.changed(new[i].clone()).await;
                }
                for p in &removed {
                    hooks.removed(p).await;
                }
                if let Some(M::ModifyAreaMessage(m)) =
                    command.edit_map_message.as_mut().and_then(|m| m.message.as_mut())
                {
                    // The sender's editor applies the echo of its own command only with modifyServerData: that
                    // is how it learns the id of the room just made (MapStorageServer).
                    let server_data = |props: &[serde_json::Value]| -> Vec<(serde_json::Value, serde_json::Value)> {
                        props
                            .iter()
                            .filter(|p| !p["serverData"].is_null())
                            .map(|p| (p["id"].clone(), p["serverData"].clone()))
                            .collect()
                    };
                    let before: Vec<serde_json::Value> = m.properties.iter().map(wire::json_from).collect();
                    m.modify_server_data = Some(server_data(&before) != server_data(&new));
                    // The whole area, as map-storage sends it back.
                    if let Some(a) = &area {
                        let int = |k: &str| a[k].as_i64();
                        m.name = m.name.take().or_else(|| a["name"].as_str().map(str::to_owned));
                        m.x = m.x.or(int("x").map(|v| v as i32));
                        m.y = m.y.or(int("y").map(|v| v as i32));
                        m.width = m.width.or(int("width").map(|v| v as u32));
                        m.height = m.height.or(int("height").map(|v| v as u32));
                    }
                    m.properties = new.iter().map(wire::json_to).collect();
                }
                Done::Edit { session, command, result: Ok(()) }
            });
            return None;
        }
        if !io || self.wam.is_none() {
            return Some(self.complete(session, command, Ok(())));
        }
        self.io.spawn(async move {
            let info = &session.info;
            let editor = Editor { uuid: &info.user_uuid, tags: &info.tags, can_edit: info.can_edit };
            let result = match command.edit_map_message.as_mut().and_then(|m| m.message.as_mut()) {
                Some(M::UploadEntityMessage(m)) => {
                    m.owner_id = Some(info.user_uuid.clone());
                    custom_entities::upload(&storage, m).await
                }
                Some(M::ModifyCustomEntityMessage(m)) => custom_entities::modify(&storage, m, editor).await,
                Some(M::DeleteCustomEntityMessage(m)) => custom_entities::delete(&storage, &m.id, editor).await,
                Some(M::UploadFileMessage(m)) => {
                    let uploaded = custom_entities::upload_file(&storage, m).await;
                    m.file.clear();
                    uploaded
                }
                _ => Ok(()),
            };
            Done::Edit { session, command, result }
        });
        None
    }

    /// The WAM side of a command whose I/O, if any, went through: the command as the room gets it back.
    pub(super) fn complete(
        &mut self,
        session: Arc<Session>,
        command: pb::EditMapCommandMessage,
        io: Result<(), String>,
    ) -> Outcome {
        let id = command.id.clone();
        let result = io.and_then(|()| self.apply(command, &session.info));
        Outcome::Edited { session, id, result }
    }

    pub(super) fn apply(
        &mut self,
        command: pb::EditMapCommandMessage,
        info: &SessionInfo,
    ) -> Result<pb::EditMapCommandMessage, String> {
        use pb::edit_map_message::Message as M;
        let editor = Editor { uuid: &info.user_uuid, tags: &info.tags, can_edit: info.can_edit };
        let wam = self.wam.as_mut().ok_or("This map cannot be edited")?;
        let wam_changed = match command.edit_map_message.as_ref().and_then(|m| m.message.as_ref()) {
            // Done by the I/O: the custom entity collection and the private files are not in the WAM.
            Some(M::UploadEntityMessage(_) | M::ModifyCustomEntityMessage(_) | M::UploadFileMessage(_)) => false,
            Some(M::DeleteCustomEntityMessage(m)) => {
                wam.apply(&command.id, Edit::DeleteCustomEntity(m.id.clone()), editor)?;
                true
            }
            Some(other) => {
                let edit = wire::edit_from(other).ok_or("This map edit is not supported by this server yet")?;
                let dropped: Vec<String> = wam
                    .apply(&command.id, edit, editor)?
                    .dropped_files
                    .iter()
                    .map(|link| custom_entities::link_path(link))
                    .filter(|path| path.starts_with("/private/files/"))
                    .collect();
                if !dropped.is_empty() {
                    // Before the commands after this one: one of them may upload a file of the same name.
                    self.queue.push_front(Pending::Remove(dropped));
                }
                true
            }
            None => return Err("Empty map edit".into()),
        };
        self.history.push(SystemClock.now_ms(), command.id.clone(), command.clone());
        if wam_changed {
            self.revision += 1;
            self.saves.send_replace(Some((self.generation, self.revision, wam.to_json())));
        }
        Ok(command)
    }

    /// The I/O in flight, or never.
    pub(super) async fn next_done(map: &mut Option<MapFile>) -> Done {
        loop {
            match map.as_mut().filter(|m| !m.io.is_empty()) {
                Some(m) => match m.io.join_next().await {
                    Some(Ok(done)) => return done,
                    Some(Err(e)) => tracing::error!(error = %e, "map file task failed"),
                    None => {}
                },
                None => std::future::pending().await,
            }
        }
    }

    /// The room is ending: whatever is queued still applies and saves (nobody is left to tell).
    pub(super) async fn drain(&mut self) {
        let _ = self.pump();
        while let Some(done) = self.io.join_next().await {
            if let Ok(done) = done {
                let _ = self.finish(done);
            }
        }
    }
}
