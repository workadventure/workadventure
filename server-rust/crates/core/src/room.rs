//! A room: who is where, who sees whom, and the proximity bubbles.
//!
//! This merges what used to be split in two processes: the back's GameRoom/PositionNotifier/Zone (who is in
//! which zone, bubbles) and the pusher's PositionDispatcher/Zone (which connection watches which zone). With
//! one owner for both, a move is turned into notifications in one pass, without the zone-message relay.
//!
//! The room is plain synchronous state. It is driven by one owner (an actor in the server) and tells the
//! outside world what happened through the `Sink` port: an event plus the list of recipients, so the adapter
//! can encode each event once and fan it out.

use std::collections::{HashMap, HashSet};

use crate::geometry::{Position, Viewport, ZoneKey, ZoneRect, distance, viewport_zones, zone_of};
use crate::spatial::Grid;
use crate::user::{Appearance, Availability, DetailsChange, Profile};

pub type UserId = i32;
pub type GroupId = i32;

/// Time source, for the bubble space names.
pub trait Clock: Send {
    fn now_ms(&self) -> u64;
}

#[derive(Debug, Clone, Copy)]
pub struct RoomConfig {
    /// MINIMUM_DISTANCE: two players closer than this start a bubble.
    pub minimum_distance: f64,
    /// GROUP_RADIUS: a player closer than this to the center of a bubble joins it.
    pub group_radius: f64,
    /// MAX_PER_GROUP.
    pub max_per_group: usize,
}

impl Default for RoomConfig {
    fn default() -> Self {
        Self {
            minimum_distance: 64.0,
            group_radius: 48.0,
            max_per_group: 4,
        }
    }
}

#[derive(Debug)]
pub struct User {
    pub id: UserId,
    pub profile: Profile,
    pub position: Position,
    pub appearance: Appearance,
    pub group: Option<GroupId>,
    zone: ZoneKey,
    watched: Option<ZoneRect>,
}

impl User {
    fn xy(&self) -> (f64, f64) {
        (f64::from(self.position.x), f64::from(self.position.y))
    }
}

#[derive(Debug)]
pub struct Group {
    pub id: GroupId,
    /// In joining order.
    pub users: Vec<UserId>,
    pub x: f64,
    pub y: f64,
    pub locked: bool,
    /// The space the members join for audio/video.
    pub space_name: String,
    zone: ZoneKey,
}

#[derive(Debug, Default)]
struct Zone {
    users: HashSet<UserId>,
    groups: HashSet<GroupId>,
    watchers: HashSet<UserId>,
}

impl Zone {
    fn is_unused(&self) -> bool {
        self.users.is_empty() && self.groups.is_empty() && self.watchers.is_empty()
    }
}

/// What happened, for whom. Borrowed from the room state: the sink must encode it before returning.
#[derive(Debug)]
pub enum Event<'a> {
    /// Sent to the joining player only, before anything else about the room.
    RoomJoined(&'a User),
    UserJoined(&'a User),
    UserMoved(&'a User),
    UserLeft(UserId),
    GroupUpdated(&'a Group),
    GroupDeleted(GroupId),
    GroupUsersUpdated(&'a Group),
    DetailsUpdated(UserId, &'a DetailsChange),
    /// The recipient entered a bubble and must join its space.
    JoinGroupSpace(&'a Group),
    /// The recipient left a bubble and must leave its space.
    LeaveGroupSpace(&'a str),
}

/// Outbound port.
pub trait Sink {
    fn emit(&mut self, recipients: &[UserId], event: Event<'_>);
}

pub struct JoinRequest {
    pub profile: Profile,
    pub position: Position,
    pub availability: Availability,
    pub viewport: Viewport,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Joined {
    pub user_id: UserId,
    /// A previous connection of the same browser tab, removed from the room: its connection must be closed.
    pub replaced: Option<UserId>,
    /// The same user (uuid) was already connected from elsewhere.
    pub duplicate: bool,
}

pub struct Room {
    url: String,
    config: RoomConfig,
    clock: Box<dyn Clock>,
    users: HashMap<UserId, User>,
    users_by_uuid: HashMap<String, HashSet<UserId>>,
    users_by_tab: HashMap<(String, String), UserId>,
    groups: HashMap<GroupId, Group>,
    zones: HashMap<ZoneKey, Zone>,
    user_grid: Grid<UserId>,
    group_grid: Grid<GroupId>,
    next_user_id: UserId,
    next_group_id: GroupId,
    groups_created: u64,
}

fn emit(sink: &mut impl Sink, to: &[UserId], event: Event<'_>) {
    if !to.is_empty() {
        sink.emit(to, event);
    }
}

impl Room {
    pub fn new(url: impl Into<String>, config: RoomConfig, clock: Box<dyn Clock>) -> Self {
        let cell = config.minimum_distance.max(config.group_radius);
        Self {
            url: url.into(),
            config,
            clock,
            users: HashMap::new(),
            users_by_uuid: HashMap::new(),
            users_by_tab: HashMap::new(),
            groups: HashMap::new(),
            zones: HashMap::new(),
            user_grid: Grid::new(cell),
            group_grid: Grid::new(cell),
            next_user_id: 1,
            next_group_id: 0,
            groups_created: 0,
        }
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    pub fn user(&self, id: UserId) -> Option<&User> {
        self.users.get(&id)
    }

    pub fn group(&self, id: GroupId) -> Option<&Group> {
        self.groups.get(&id)
    }

    /// A player by uuid; `id` picks one connection when the same user is connected twice (askPositionMessage).
    pub fn find(&self, uuid: &str, id: Option<UserId>) -> Option<&User> {
        let ids = self.users_by_uuid.get(uuid)?;
        let id = id.filter(|i| ids.contains(i)).or_else(|| ids.iter().min().copied())?;
        self.users.get(&id)
    }

    pub fn user_count(&self) -> usize {
        self.users.len()
    }

    pub fn group_count(&self) -> usize {
        self.groups.len()
    }

    pub fn groups_created(&self) -> u64 {
        self.groups_created
    }

    pub fn is_empty(&self) -> bool {
        self.users.is_empty()
    }

    /// A player enters the room. They get `RoomJoined`, then what their viewport shows, then their bubble.
    pub fn join(&mut self, req: JoinRequest, sink: &mut impl Sink) -> Joined {
        let tab_key = req.profile.tab_id.clone().map(|tab| (req.profile.uuid.clone(), tab));
        let replaced = tab_key.as_ref().and_then(|k| self.users_by_tab.get(k).copied());
        if let Some(old) = replaced {
            self.leave(old, sink);
        }
        let duplicate = self.users_by_uuid.get(&req.profile.uuid).is_some_and(|s| !s.is_empty());

        // Ids start at 2, like the back.
        self.next_user_id += 1;
        let id = self.next_user_id;
        let zone = zone_of(f64::from(req.position.x), f64::from(req.position.y));
        let user = User {
            id,
            profile: req.profile,
            position: req.position,
            appearance: Appearance {
                availability: req.availability,
                ..Appearance::default()
            },
            group: None,
            zone,
            watched: None,
        };
        self.users_by_uuid.entry(user.profile.uuid.clone()).or_default().insert(id);
        if let Some(k) = tab_key {
            self.users_by_tab.insert(k, id);
        }
        self.user_grid.set(id, f64::from(user.position.x), f64::from(user.position.y));
        self.users.insert(id, user);
        self.zones.entry(zone).or_default().users.insert(id);

        emit(sink, &[id], Event::RoomJoined(&self.users[&id]));
        self.notify_user_entered(id, None, sink);
        self.set_viewport(id, req.viewport, sink);
        self.update_user_group(id, sink);
        Joined {
            user_id: id,
            replaced,
            duplicate,
        }
    }

    pub fn leave(&mut self, id: UserId, sink: &mut impl Sink) {
        if !self.users.contains_key(&id) {
            return;
        }
        if self.users[&id].group.is_some() {
            self.leave_group(id, sink);
        }
        let user = self.users.remove(&id).expect("checked above");
        self.user_grid.remove(id);
        if let Some(set) = self.users_by_uuid.get_mut(&user.profile.uuid) {
            set.remove(&id);
            if set.is_empty() {
                self.users_by_uuid.remove(&user.profile.uuid);
            }
        }
        if let Some(tab) = &user.profile.tab_id {
            let key = (user.profile.uuid.clone(), tab.clone());
            if self.users_by_tab.get(&key) == Some(&id) {
                self.users_by_tab.remove(&key);
            }
        }
        if let Some(zone) = self.zones.get_mut(&user.zone) {
            zone.users.remove(&id);
            let to: Vec<UserId> = zone.watchers.iter().copied().filter(|w| *w != id).collect();
            emit(sink, &to, Event::UserLeft(id));
        }
        self.release_zone(user.zone);
        if let Some(rect) = user.watched {
            for z in rect.zones() {
                if let Some(zone) = self.zones.get_mut(&z) {
                    zone.watchers.remove(&id);
                }
                self.release_zone(z);
            }
        }
    }

    pub fn move_user(&mut self, id: UserId, position: Position, sink: &mut impl Sink) {
        let Some(user) = self.users.get_mut(&id) else { return };
        let old_zone = user.zone;
        user.position = position;
        let new_zone = zone_of(f64::from(position.x), f64::from(position.y));
        self.user_grid.set(id, f64::from(position.x), f64::from(position.y));
        if new_zone == old_zone {
            let user = &self.users[&id];
            if let Some(zone) = self.zones.get(&new_zone) {
                let to: Vec<UserId> = zone.watchers.iter().copied().filter(|w| *w != id).collect();
                emit(sink, &to, Event::UserMoved(user));
            }
        } else {
            self.users.get_mut(&id).expect("checked above").zone = new_zone;
            if let Some(zone) = self.zones.get_mut(&old_zone) {
                zone.users.remove(&id);
            }
            self.zones.entry(new_zone).or_default().users.insert(id);
            self.notify_user_left_zone(id, old_zone, new_zone, sink);
            self.notify_user_entered(id, Some(old_zone), sink);
            self.release_zone(old_zone);
        }
        self.update_user_group(id, sink);
    }

    /// Changes what a player watches. Returns false for an invalid viewport (ignored).
    pub fn set_viewport(&mut self, id: UserId, viewport: Viewport, sink: &mut impl Sink) -> bool {
        let Some((rect, _cropped)) = viewport_zones(&viewport) else { return false };
        let Some(user) = self.users.get_mut(&id) else { return false };
        let old = user.watched.replace(rect);
        if old == Some(rect) {
            return true;
        }
        for z in rect.zones() {
            if old.is_some_and(|o| o.contains(z)) {
                continue;
            }
            let zone = self.zones.entry(z).or_default();
            zone.watchers.insert(id);
            let zone = &self.zones[&z];
            for u in &zone.users {
                if *u != id {
                    emit(sink, &[id], Event::UserJoined(&self.users[u]));
                }
            }
            for g in &zone.groups {
                emit(sink, &[id], Event::GroupUpdated(&self.groups[g]));
            }
        }
        if let Some(old) = old {
            for z in old.zones() {
                if rect.contains(z) {
                    continue;
                }
                let Some(zone) = self.zones.get_mut(&z) else { continue };
                zone.watchers.remove(&id);
                let zone = &self.zones[&z];
                for u in &zone.users {
                    if *u != id {
                        emit(sink, &[id], Event::UserLeft(*u));
                    }
                }
                for g in &zone.groups {
                    emit(sink, &[id], Event::GroupDeleted(*g));
                }
                self.release_zone(z);
            }
        }
        true
    }

    pub fn update_details(&mut self, id: UserId, change: DetailsChange, sink: &mut impl Sink) {
        let Some(user) = self.users.get_mut(&id) else { return };
        let was_silent = user.appearance.availability.is_silent();
        let a = &mut user.appearance;
        if change.remove_outline_color == Some(true) {
            a.outline_color = None;
        } else if let Some(color) = change.outline_color {
            a.outline_color = Some(color);
        }
        if change.availability != Availability::UNCHANGED {
            a.availability = change.availability;
        }
        if let Some(chat_id) = &change.chat_id {
            a.chat_id = Some(chat_id.clone());
        }
        if let Some(say) = &change.say {
            a.say = (!say.message.is_empty()).then(|| say.clone());
        }
        if let Some(v) = &change.variable
            && v.public
        {
            a.variables.insert(v.name.clone(), v.value.clone());
        }
        let is_silent = a.availability.is_silent();
        // A private variable is never shown to others (the back drops the whole message).
        if change.variable.as_ref().is_none_or(|v| v.public) {
            let zone = &self.zones[&self.users[&id].zone];
            let to: Vec<UserId> = zone.watchers.iter().copied().filter(|w| *w != id).collect();
            emit(sink, &to, Event::DetailsUpdated(id, &change));
        }
        if self.users[&id].group.is_some() && is_silent {
            self.leave_group(id, sink);
        } else if was_silent && !is_silent {
            // Back from a silent status: join whoever is next to us without waiting for a move.
            self.update_user_group(id, sink);
        }
    }

    // ---------------------------------------------------------------- zones

    fn watchers(&self, z: ZoneKey) -> impl Iterator<Item = UserId> + '_ {
        self.zones.get(&z).into_iter().flat_map(|zone| zone.watchers.iter().copied())
    }

    fn is_watching(&self, watcher: UserId, z: ZoneKey) -> bool {
        self.zones.get(&z).is_some_and(|zone| zone.watchers.contains(&watcher))
    }

    fn release_zone(&mut self, z: ZoneKey) {
        if self.zones.get(&z).is_some_and(Zone::is_unused) {
            self.zones.remove(&z);
        }
    }

    /// The user is now in its zone (coming from `from`): watchers who also saw the old zone see a move, the
    /// others a newcomer.
    fn notify_user_entered(&self, id: UserId, from: Option<ZoneKey>, sink: &mut impl Sink) {
        let user = &self.users[&id];
        let (moved, joined): (Vec<UserId>, Vec<UserId>) = self
            .watchers(user.zone)
            .filter(|w| *w != id)
            .partition(|w| from.is_some_and(|f| self.is_watching(*w, f)));
        emit(sink, &moved, Event::UserMoved(user));
        emit(sink, &joined, Event::UserJoined(user));
    }

    fn notify_user_left_zone(&self, id: UserId, from: ZoneKey, to: ZoneKey, sink: &mut impl Sink) {
        let left: Vec<UserId> = self.watchers(from).filter(|w| *w != id && !self.is_watching(*w, to)).collect();
        emit(sink, &left, Event::UserLeft(id));
    }

    // ---------------------------------------------------------------- bubbles

    fn silent(&self, id: UserId) -> bool {
        self.users[&id].appearance.availability.is_silent()
    }

    /// GameRoom.updateUserGroup, without the follow mode.
    fn update_user_group(&mut self, id: UserId, sink: &mut impl Sink) {
        if self.silent(id) {
            return;
        }
        match self.users[&id].group {
            None => {
                if self.users[&id].position.moving {
                    return;
                }
                match self.closest_available(id) {
                    Some(Closest::Group(g)) => self.group_join(g, id, sink),
                    Some(Closest::User(other)) => self.create_group(vec![id, other], sink),
                    None => {}
                }
            }
            Some(g) => {
                let center = self.group_center(g);
                let radius = self.config.group_radius;
                let kicked_out_someone = self.groups[&g]
                    .users
                    .iter()
                    .any(|u| distance(self.users[u].xy(), center) > radius);
                if kicked_out_someone && distance(self.users[&id].xy(), center) > radius {
                    self.leave_group(id, sink);
                }
            }
        }
        if let Some(g) = self.users[&id].group {
            self.group_update_position(g, sink);
            self.search_for_nearby_users(g, sink);
        }
    }

    fn closest_available(&self, id: UserId) -> Option<Closest> {
        let me = self.users[&id].xy();
        let mut best = self.config.minimum_distance.max(self.config.group_radius);
        let mut found = None;
        for other in self.user_grid.query_circle(me.0, me.1, self.config.minimum_distance) {
            let u = &self.users[&other];
            if other == id || u.group.is_some() || u.appearance.availability.is_silent() {
                continue;
            }
            let d = distance(me, u.xy());
            if d <= best && d <= self.config.minimum_distance {
                best = d;
                found = Some(Closest::User(other));
            }
        }
        for g in self.group_grid.query_circle(me.0, me.1, self.config.group_radius) {
            let group = &self.groups[&g];
            if group.users.len() >= self.config.max_per_group || group.locked {
                continue;
            }
            let d = distance(me, (group.x, group.y));
            if d <= best && d <= self.config.group_radius {
                best = d;
                found = Some(Closest::Group(g));
            }
        }
        found
    }

    fn group_center(&self, g: GroupId) -> (f64, f64) {
        let users = &self.groups[&g].users;
        let n = users.len() as f64;
        let (sx, sy) = users.iter().fold((0.0, 0.0), |(sx, sy), u| {
            let (x, y) = self.users[u].xy();
            (sx + x, sy + y)
        });
        (sx / n, sy / n)
    }

    fn create_group(&mut self, members: Vec<UserId>, sink: &mut impl Sink) {
        self.next_group_id += 1;
        self.groups_created += 1;
        let id = self.next_group_id;
        let space_name = format!("{}#{}#{}", self.url, id, self.clock.now_ms());
        self.groups.insert(
            id,
            Group {
                id,
                users: Vec::new(),
                x: 0.0,
                y: 0.0,
                locked: false,
                space_name,
                zone: ZoneKey { i: 0, j: 0 },
            },
        );
        // The group has no position yet: unlike a later join, nobody is told about its members now (the back's
        // groupUsersUpdate went to a NaN zone). GroupUpdated below carries them.
        for u in members {
            self.groups.get_mut(&id).expect("just inserted").users.push(u);
            self.users.get_mut(&u).expect("member exists").group = Some(id);
            emit(sink, &[u], Event::JoinGroupSpace(&self.groups[&id]));
        }
        let (x, y) = self.group_center(id);
        let zone = zone_of(x, y);
        let group = self.groups.get_mut(&id).expect("just inserted");
        (group.x, group.y, group.zone) = (x, y, zone);
        self.group_grid.set(id, x, y);
        self.zones.entry(zone).or_default().groups.insert(id);
        let to: Vec<UserId> = self.watchers(zone).collect();
        emit(sink, &to, Event::GroupUpdated(&self.groups[&id]));
    }

    fn group_join(&mut self, g: GroupId, id: UserId, sink: &mut impl Sink) {
        self.groups.get_mut(&g).expect("group exists").users.push(id);
        self.users.get_mut(&id).expect("user exists").group = Some(g);
        let group = &self.groups[&g];
        emit(sink, &[id], Event::JoinGroupSpace(group));
        let to: Vec<UserId> = self.watchers(group.zone).collect();
        emit(sink, &to, Event::GroupUsersUpdated(group));
    }

    /// Group.leave: `destroying` is set while the group empties itself.
    fn group_leave(&mut self, g: GroupId, id: UserId, destroying: bool, sink: &mut impl Sink) {
        self.groups.get_mut(&g).expect("group exists").users.retain(|u| *u != id);
        self.users.get_mut(&id).expect("user exists").group = None;
        if !self.groups[&g].users.is_empty() {
            self.group_update_position(g, sink);
        }
        let group = &self.groups[&g];
        emit(sink, &[id], Event::LeaveGroupSpace(&group.space_name));
        if !destroying {
            let to: Vec<UserId> = self.watchers(group.zone).collect();
            emit(sink, &to, Event::GroupUsersUpdated(group));
        }
    }

    /// GameRoom.leaveGroup: a bubble of one is destroyed.
    fn leave_group(&mut self, id: UserId, sink: &mut impl Sink) {
        let Some(g) = self.users[&id].group else { return };
        self.group_leave(g, id, false, sink);
        if self.groups[&g].users.len() <= 1 {
            let zone = self.groups[&g].zone;
            if let Some(z) = self.zones.get_mut(&zone) {
                z.groups.remove(&g);
            }
            let to: Vec<UserId> = self.watchers(zone).collect();
            emit(sink, &to, Event::GroupDeleted(g));
            for u in self.groups[&g].users.clone() {
                self.group_leave(g, u, true, sink);
            }
            self.groups.remove(&g);
            self.group_grid.remove(g);
            self.release_zone(zone);
        } else {
            self.group_update_position(g, sink);
        }
    }

    fn group_update_position(&mut self, g: GroupId, sink: &mut impl Sink) {
        let (x, y) = self.group_center(g);
        let new_zone = zone_of(x, y);
        let group = self.groups.get_mut(&g).expect("group exists");
        let old_zone = group.zone;
        (group.x, group.y, group.zone) = (x, y, new_zone);
        self.group_grid.set(g, x, y);
        if new_zone != old_zone {
            if let Some(z) = self.zones.get_mut(&old_zone) {
                z.groups.remove(&g);
            }
            self.zones.entry(new_zone).or_default().groups.insert(g);
            let gone: Vec<UserId> = self.watchers(old_zone).filter(|w| !self.is_watching(*w, new_zone)).collect();
            emit(sink, &gone, Event::GroupDeleted(g));
            self.release_zone(old_zone);
        }
        let to: Vec<UserId> = self.watchers(new_zone).collect();
        emit(sink, &to, Event::GroupUpdated(&self.groups[&g]));
    }

    /// Group.searchForNearbyUsers. The back searched the 3x3 zones around zone (i/320, j/320), i.e. always
    /// around the top-left corner of the map (a unit mix-up); this searches the players actually around the
    /// bubble.
    fn search_for_nearby_users(&mut self, g: GroupId, sink: &mut impl Sink) {
        if self.groups[&g].locked {
            return;
        }
        let (x, y) = (self.groups[&g].x, self.groups[&g].y);
        for u in self.user_grid.query_circle(x, y, self.config.group_radius) {
            if self.groups[&g].users.len() >= self.config.max_per_group {
                return;
            }
            let user = &self.users[&u];
            if user.appearance.availability.is_silent() || user.group.is_some() || user.position.moving {
                continue;
            }
            let center = (self.groups[&g].x, self.groups[&g].y);
            if distance(user.xy(), center) < self.config.group_radius {
                self.group_join(g, u, sink);
                self.group_update_position(g, sink);
            }
        }
    }
}

enum Closest {
    User(UserId),
    Group(GroupId),
}
