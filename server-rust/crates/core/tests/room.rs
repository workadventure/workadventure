//! Behaviour of a room, ported from back/tests (GameRoom, PositionNotifier) and the pusher's Zone rules.

use wa_core::geometry::{Position, Viewport};
use wa_core::room::{Clock, Event, JoinRequest, Room, RoomConfig, Sink, UserId};
use wa_core::user::{Availability, DetailsChange, Profile};

struct FixedClock;
impl Clock for FixedClock {
    fn now_ms(&self) -> u64 {
        1000
    }
}

/// Records every notification as "recipients: event".
#[derive(Default)]
struct Log(Vec<(Vec<UserId>, String)>);

impl Sink for Log {
    fn emit(&mut self, recipients: &[UserId], event: Event<'_>) {
        let text = match event {
            Event::RoomJoined(u) => format!("roomJoined {}", u.id),
            Event::UserJoined(u) => format!("userJoined {}", u.id),
            Event::UserMoved(u) => format!("userMoved {} {},{}", u.id, u.position.x, u.position.y),
            Event::UserLeft(id) => format!("userLeft {id}"),
            Event::GroupUpdated(g) => format!("groupUpdated {} {:?}", g.id, g.users),
            Event::GroupDeleted(id) => format!("groupDeleted {id}"),
            Event::GroupUsersUpdated(g) => format!("groupUsers {} {:?}", g.id, g.users),
            Event::DetailsUpdated(id, _) => format!("details {id}"),
            Event::JoinGroupSpace(g) => format!("joinSpace {}", g.space_name),
            Event::LeaveGroupSpace(name) => format!("leaveSpace {name}"),
            Event::Emote(id, emote) => format!("emote {id} {emote}"),
        };
        let mut r = recipients.to_vec();
        r.sort_unstable();
        self.0.push((r, text));
    }
}

impl Log {
    fn take(&mut self) -> Vec<(Vec<UserId>, String)> {
        std::mem::take(&mut self.0)
    }
    fn for_user(&self, id: UserId) -> Vec<&str> {
        self.0.iter().filter(|(r, _)| r.contains(&id)).map(|(_, t)| t.as_str()).collect()
    }
}

fn room() -> Room {
    Room::new("http://play/_/global/maps/map.json", RoomConfig::default(), Box::new(FixedClock))
}

fn at(x: i32, y: i32) -> Position {
    Position { x, y, ..Position::default() }
}

fn screen() -> Viewport {
    Viewport { left: 0, top: 0, right: 1000, bottom: 1000 }
}

fn join(room: &mut Room, log: &mut Log, uuid: &str, pos: Position) -> UserId {
    join_with(room, log, uuid, pos, Availability::ONLINE, screen())
}

fn join_with(room: &mut Room, log: &mut Log, uuid: &str, pos: Position, a: Availability, v: Viewport) -> UserId {
    room.join(
        JoinRequest {
            profile: Profile { uuid: uuid.into(), name: uuid.into(), ..Profile::default() },
            position: pos,
            availability: a,
            viewport: v,
            variables: Default::default(),
        },
        log,
    )
    .user_id
}

#[test]
fn a_newcomer_gets_room_joined_first_then_who_is_around() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    log.take();
    let b = join(&mut room, &mut log, "b", at(500, 500));
    let events = log.take();
    assert_eq!(events[0], (vec![b], format!("roomJoined {b}")));
    assert!(events.contains(&(vec![a], format!("userJoined {b}"))));
    assert!(events.contains(&(vec![b], format!("userJoined {a}"))));
    assert!(!events.iter().any(|(r, t)| r.contains(&b) && *t == format!("userJoined {b}")), "never told about itself");
}

#[test]
fn two_players_close_to_each_other_form_a_bubble() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    log.take();
    let b = join(&mut room, &mut log, "b", at(130, 100));
    let space = "http://play/_/global/maps/map.json#1#1000";
    assert!(log.0.contains(&(vec![a], format!("joinSpace {space}"))));
    assert!(log.0.contains(&(vec![b], format!("joinSpace {space}"))));
    assert!(log.0.contains(&(vec![a, b], format!("groupUpdated 1 [{b}, {a}]"))));
    assert_eq!(room.group_count(), 1);
}

#[test]
fn moving_players_do_not_start_a_bubble_until_they_stop() {
    let mut room = room();
    let mut log = Log::default();
    join(&mut room, &mut log, "a", at(100, 100));
    let b = join(&mut room, &mut log, "b", at(400, 100));
    room.move_user(b, Position { moving: true, ..at(120, 100) }, &mut log);
    assert_eq!(room.group_count(), 0);
    room.move_user(b, at(120, 100), &mut log);
    assert_eq!(room.group_count(), 1);
}

#[test]
fn walking_away_destroys_a_bubble_of_two() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    let b = join(&mut room, &mut log, "b", at(130, 100));
    log.take();
    room.move_user(b, at(300, 100), &mut log);
    assert_eq!(room.group_count(), 0);
    assert!(log.for_user(a).contains(&"groupDeleted 1"));
    assert!(log.for_user(a).iter().any(|t| t.starts_with("leaveSpace")));
    assert!(log.for_user(b).iter().any(|t| t.starts_with("leaveSpace")));
}

#[test]
fn a_third_player_joins_the_existing_bubble() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    let b = join(&mut room, &mut log, "b", at(130, 100));
    log.take();
    let c = join(&mut room, &mut log, "c", at(115, 120));
    assert_eq!(room.group_count(), 1);
    assert_eq!(room.group(1).unwrap().users, vec![b, a, c]);
    assert!(log.0.contains(&(vec![a, b, c], format!("groupUsers 1 [{b}, {a}, {c}]"))));
}

#[test]
fn a_full_bubble_lets_nobody_in() {
    let mut room = Room::new("r", RoomConfig { max_per_group: 2, ..RoomConfig::default() }, Box::new(FixedClock));
    let mut log = Log::default();
    join(&mut room, &mut log, "a", at(100, 100));
    join(&mut room, &mut log, "b", at(130, 100));
    let c = join(&mut room, &mut log, "c", at(115, 120));
    assert_eq!(room.user(c).unwrap().group, None);
}

#[test]
fn a_silent_player_stays_out_and_leaves_when_going_silent() {
    let mut room = room();
    let mut log = Log::default();
    join(&mut room, &mut log, "a", at(100, 100));
    let b = join_with(&mut room, &mut log, "b", at(130, 100), Availability::DO_NOT_DISTURB, screen());
    assert_eq!(room.group_count(), 0);

    // Back online: joins without moving.
    room.update_details(b, DetailsChange { availability: Availability::ONLINE, ..DetailsChange::default() }, &mut log);
    assert_eq!(room.group_count(), 1);

    room.update_details(b, DetailsChange { availability: Availability::BUSY, ..DetailsChange::default() }, &mut log);
    assert_eq!(room.group_count(), 1, "busy is not silent");
    room.update_details(
        b,
        DetailsChange { availability: Availability::BACK_IN_A_MOMENT, ..DetailsChange::default() },
        &mut log,
    );
    assert_eq!(room.group_count(), 0);
}

#[test]
fn crossing_a_zone_border_is_a_move_for_who_sees_both_zones() {
    let mut room = room();
    let mut log = Log::default();
    // Watches zones (0,0) and (1,0).
    let both = join(&mut room, &mut log, "both", at(5000, 5000));
    room.set_viewport(both, Viewport { left: 0, top: 0, right: 639, bottom: 10 }, &mut log);
    // Watches zone (0,0) only.
    let left_only = join_with(
        &mut room,
        &mut log,
        "left",
        at(6000, 6000),
        Availability::ONLINE,
        Viewport { left: 0, top: 0, right: 10, bottom: 10 },
    );
    // Watches zone (1,0) only.
    let right_only = join_with(
        &mut room,
        &mut log,
        "right",
        at(7000, 7000),
        Availability::ONLINE,
        Viewport { left: 330, top: 0, right: 340, bottom: 10 },
    );
    let mover = join_with(
        &mut room,
        &mut log,
        "mover",
        at(300, 5),
        Availability::ONLINE,
        Viewport { left: 9000, top: 9000, right: 9001, bottom: 9001 },
    );
    log.take();
    room.move_user(mover, at(330, 5), &mut log);
    assert_eq!(log.for_user(both), vec![format!("userMoved {mover} 330,5")]);
    assert_eq!(log.for_user(left_only), vec![format!("userLeft {mover}")]);
    assert_eq!(log.for_user(right_only), vec![format!("userJoined {mover}")]);
    assert!(log.for_user(mover).is_empty());
}

#[test]
fn a_viewport_change_sends_what_appears_and_what_disappears() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    let far = join(&mut room, &mut log, "far", at(2000, 2000));
    log.take();
    room.set_viewport(a, Viewport { left: 1900, top: 1900, right: 2100, bottom: 2100 }, &mut log);
    assert_eq!(log.for_user(a), vec![format!("userJoined {far}")]);
    log.take();
    room.set_viewport(a, screen(), &mut log);
    assert_eq!(log.for_user(a), vec![format!("userLeft {far}")]);
    log.take();
    room.set_viewport(a, screen(), &mut log);
    assert!(log.0.is_empty(), "same viewport: nothing to do");
}

#[test]
fn leaving_tells_the_watchers_and_frees_the_zones() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    let b = join(&mut room, &mut log, "b", at(500, 500));
    log.take();
    room.leave(b, &mut log);
    assert_eq!(log.0, vec![(vec![a], format!("userLeft {b}"))]);
    room.leave(a, &mut log);
    assert!(room.is_empty());
}

#[test]
fn a_new_connection_from_the_same_tab_replaces_the_old_one() {
    let mut room = room();
    let mut log = Log::default();
    let req = |tab: &str| JoinRequest {
        profile: Profile { uuid: "same".into(), tab_id: Some(tab.into()), ..Profile::default() },
        position: at(0, 0),
        availability: Availability::ONLINE,
        viewport: screen(),
        variables: Default::default(),
    };
    let first = room.join(req("t1"), &mut log);
    assert!(!first.duplicate);
    let other_tab = room.join(req("t2"), &mut log);
    assert!(other_tab.duplicate);
    let again = room.join(req("t1"), &mut log);
    assert_eq!(again.replaced, Some(first.user_id));
    assert_eq!(room.user_count(), 2);
}

#[test]
fn a_player_is_found_by_uuid_and_by_connection() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "alice", at(10, 20));
    assert_eq!(room.find("alice", None).map(|u| u.id), Some(a));
    assert_eq!(room.find("alice", Some(999)).map(|u| u.position.y), Some(20), "unknown id: any connection");
    assert!(room.find("bob", None).is_none());
}

#[test]
fn hundreds_of_players_in_one_room_stay_consistent() {
    let mut room = room();
    let mut log = Log::default();
    let ids: Vec<UserId> =
        (0..500).map(|n| join(&mut room, &mut log, &format!("u{n}"), at((n % 25) * 40, (n / 25) * 40))).collect();
    for (step, id) in ids.iter().enumerate().cycle().take(5000) {
        let n = step as i32;
        room.move_user(*id, at((n * 37) % 1000, (n * 53) % 1000), &mut log);
    }
    for g in 1..=room.groups_created() as i32 {
        if let Some(group) = room.group(g) {
            assert!(group.users.len() >= 2 && group.users.len() <= 4, "{:?}", group.users);
            for u in &group.users {
                assert_eq!(room.user(*u).unwrap().group, Some(g));
            }
        }
    }
    for id in ids {
        room.leave(id, &mut log);
    }
    assert!(room.is_empty());
    assert_eq!(room.group_count(), 0);
}

#[test]
fn an_emote_reaches_who_sees_the_player_but_not_the_player() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    let b = join(&mut room, &mut log, "b", at(400, 100));
    log.take();
    room.emote(a, "👋", &mut log);
    assert_eq!(log.take(), [(vec![b], format!("emote {a} 👋"))]);
}

#[test]
fn a_locked_bubble_lets_nobody_in_until_it_is_unlocked() {
    let mut room = room();
    let mut log = Log::default();
    let a = join(&mut room, &mut log, "a", at(100, 100));
    let b = join(&mut room, &mut log, "b", at(130, 100));
    log.take();
    room.lock_group(b, true, &mut log);
    assert!(log.take().iter().any(|(to, t)| to.contains(&a) && to.contains(&b) && t.starts_with("groupUpdated")));
    assert_eq!(room.group_members(a), room.group_members(b));
    let c = join(&mut room, &mut log, "c", at(115, 120));
    assert_eq!(room.user(c).unwrap().group, None);
    room.lock_group(a, false, &mut log);
    room.move_user(c, at(116, 120), &mut log);
    assert!(room.user(c).unwrap().group.is_some());
    // Outside a bubble, there is nothing to lock.
    let d = join(&mut room, &mut log, "d", at(3000, 3000));
    log.take();
    room.lock_group(d, true, &mut log);
    assert!(log.take().is_empty());
}
