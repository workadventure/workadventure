//! Space state rules (raise hand, floor, polls, questions) and who sees whom in a space with feedback.

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use wa_core::room::Clock;
use wa_core::space::{Comm, FilterType, MediaConfig, Space, SpaceEvent, SpaceSink, SpaceUser};
use wa_core::space_state::{SpaceState, StateQuery};

#[derive(Default)]
struct Rec {
    /// (recipients, event) in order.
    events: Vec<(Vec<String>, String)>,
    /// The last state patched.
    state: Option<SpaceState>,
}

impl SpaceSink for Rec {
    fn emit(&mut self, to: &[&str], event: SpaceEvent<'_>) {
        let mut to: Vec<String> = to.iter().map(|s| s.to_string()).collect();
        to.sort();
        let what = match event {
            SpaceEvent::UserAdded(u) => format!("add {}", u.space_user_id),
            SpaceEvent::UserUpdated(u, _) => format!("update {}", u.space_user_id),
            SpaceEvent::UserRemoved(id) => format!("remove {id}"),
            SpaceEvent::InitUsers(users, _) => {
                let ids: Vec<&str> = users.iter().map(|u| u.space_user_id.as_str()).collect();
                format!("init {}", ids.join(","))
            }
            SpaceEvent::StatePatch { after, .. } => {
                self.state = Some(after.clone());
                "patch".to_owned()
            }
            SpaceEvent::Switch(_, c) => format!("switch {}", c.name()),
            SpaceEvent::FinalizeSwitch(_, c) => format!("finalize {}", c.name()),
            SpaceEvent::LivekitRoom(open) => format!("room {}", if open { "open" } else { "close" }),
            other => format!("{other:?}").split(['(', ' ']).next().unwrap_or_default().to_owned(),
        };
        self.events.push((to, what));
    }
}

impl Rec {
    fn take(&mut self) -> Vec<(Vec<String>, String)> {
        std::mem::take(&mut self.events)
    }
}

fn user(id: &str) -> SpaceUser {
    SpaceUser {
        space_user_id: id.into(),
        name: format!("name of {id}"),
        uuid: format!("uuid-{id}"),
        ..SpaceUser::default()
    }
}

fn space(filter: FilterType) -> Space {
    Space::new("s".into(), filter, vec![], "i".into())
}

fn query(space: &mut Space, sink: &mut Rec, sender: &str, q: StateQuery) -> Result<(), String> {
    let mut n = 0;
    space.state_query(
        sender,
        q,
        1_000,
        &mut || {
            n += 1;
            format!("id{n}")
        },
        sink,
    )
}

fn to(ids: &[&str]) -> Vec<String> {
    ids.iter().map(|s| s.to_string()).collect()
}

#[test]
fn the_hand_queue_keeps_its_order_and_forgets_who_leaves() {
    let mut s = space(FilterType::AllUsers);
    let mut r = Rec::default();
    for id in ["a", "b", "c"] {
        s.join(FilterType::AllUsers, user(id), &mut r).unwrap();
    }
    for id in ["b", "a", "b"] {
        query(&mut s, &mut r, id, StateQuery::RaiseHand(true)).unwrap();
    }
    let hands: Vec<&str> = s.state().raised_hands.iter().map(|e| e.space_user_id.as_str()).collect();
    assert_eq!(hands, ["b", "a"]);
    // Raising twice changed nothing, so it sent nothing; every member got the two real changes.
    let patches: Vec<_> = r.take().into_iter().filter(|(_, e)| e == "patch").collect();
    assert_eq!(patches, vec![(to(&["a", "b", "c"]), "patch".to_owned()); 2]);

    s.leave("b", &mut r);
    assert_eq!(r.take().last().unwrap(), &(to(&["a", "c"]), "patch".to_owned()));
    assert_eq!(s.state().raised_hands.len(), 1);
}

#[test]
fn only_speakers_and_admins_manage_the_floor_of_a_broadcast() {
    let f = FilterType::LiveStreamingUsers;
    let mut s = space(f);
    let mut r = Rec::default();
    let mut speaker = user("speaker");
    speaker.megaphone_state = true;
    let mut admin = user("admin");
    admin.tags = vec!["admin".into()];
    for u in [speaker, admin, user("guest"), user("other")] {
        s.join(f, u, &mut r).unwrap();
    }
    query(&mut s, &mut r, "guest", StateQuery::RaiseHand(true)).unwrap();
    let refused = query(&mut s, &mut r, "other", StateQuery::LowerHand("guest".into()));
    assert_eq!(refused.unwrap_err(), "Only a speaker or an admin can manage the floor");

    query(&mut s, &mut r, "speaker", StateQuery::GiveFloor("guest".into())).unwrap();
    assert!(s.state().raised_hands.is_empty());
    assert_eq!(s.state().floor_holders[0].space_user_id.as_str(), "guest");
    assert_eq!(s.state().floor_holders[0].name, "name of guest");

    // On stage, the promoted guest still cannot hand the floor around, but may give it back.
    let mut on_air = user("guest");
    on_air.megaphone_state = true;
    s.update_from_client("guest", &on_air, &["megaphoneState".into()], &mut r);
    assert!(query(&mut s, &mut r, "guest", StateQuery::GiveFloor("other".into())).is_err());
    assert!(query(&mut s, &mut r, "admin", StateQuery::GiveFloor("nobody".into())).is_err());

    // Leaving the stage ends the floor.
    s.update_from_client("guest", &user("guest"), &["megaphoneState".into()], &mut r);
    assert!(s.state().floor_holders.is_empty());
}

#[test]
fn in_a_proximity_space_anyone_moderates_and_nobody_holds_the_floor() {
    let mut s = space(FilterType::AllUsers);
    let mut r = Rec::default();
    s.join(FilterType::AllUsers, user("a"), &mut r).unwrap();
    s.join(FilterType::AllUsers, user("b"), &mut r).unwrap();
    query(&mut s, &mut r, "b", StateQuery::RaiseHand(true)).unwrap();
    query(&mut s, &mut r, "a", StateQuery::GiveFloor("b".into())).unwrap();
    assert!(s.state().raised_hands.is_empty() && s.state().floor_holders.is_empty());
}

#[test]
fn polls_belong_to_their_creator_and_close_once() {
    let mut s = space(FilterType::AllUsers);
    let mut r = Rec::default();
    s.join(FilterType::AllUsers, user("a"), &mut r).unwrap();
    s.join(FilterType::AllUsers, user("b"), &mut r).unwrap();
    let poll = |max| StateQuery::CreatePoll {
        question: "Lunch?".into(),
        kind: "open".into(),
        answers: vec!["yes".into(), "no".into()],
        max_selections: max,
    };
    assert!(query(&mut s, &mut r, "a", poll(3)).is_err());
    assert!(query(&mut s, &mut r, "a", poll(0)).is_err());
    r.take();
    query(&mut s, &mut r, "a", poll(1)).unwrap();
    let p = s.state().polls.values().next().unwrap().clone();
    assert_eq!(p.sender_id.as_str(), "uuid-a");
    let (id, yes) = (p.id.to_string(), p.answers[0].id.to_string());

    let vote = |ids: Vec<String>| StateQuery::VotePoll { poll_id: id.clone(), answer_ids: ids };
    assert!(query(&mut s, &mut r, "b", vote(vec!["nope".into()])).is_err());
    assert!(query(&mut s, &mut r, "b", vote(vec![yes.clone(), yes.clone()])).is_err());
    query(&mut s, &mut r, "b", vote(vec![yes.clone()])).unwrap();
    assert_eq!(s.state().polls[&id].votes["uuid-b"].answer_ids[0].as_str(), yes);
    query(&mut s, &mut r, "b", vote(vec![])).unwrap();
    assert!(s.state().polls[&id].votes.is_empty());

    let close = |who: &str, s: &mut Space, r: &mut Rec| {
        let q = StateQuery::ClosePoll { poll_id: id.clone(), closing_message: Some("thanks".into()) };
        query(s, r, who, q)
    };
    assert_eq!(close("b", &mut s, &mut r).unwrap_err(), "Only poll creators can close a poll");
    close("a", &mut s, &mut r).unwrap();
    let closed_at = s.state().polls[&id].end.clone();
    close("a", &mut s, &mut r).unwrap();
    assert_eq!(s.state().polls[&id].end, closed_at);
    assert_eq!(query(&mut s, &mut r, "b", vote(vec![yes])).unwrap_err(), "This poll is closed");

    assert!(query(&mut s, &mut r, "b", StateQuery::DeletePoll(id.clone())).is_err());
    query(&mut s, &mut r, "a", StateQuery::DeletePoll(id)).unwrap();
    assert!(s.state().polls.is_empty());
    // Refused and idle queries sent nothing: create, vote, unvote, close, delete.
    assert_eq!(r.take().len(), 5);
}

#[test]
fn questions_are_upvoted_by_others_and_answered_by_moderators() {
    let mut s = space(FilterType::AllUsers);
    let mut r = Rec::default();
    let mut admin = user("admin");
    admin.tags = vec!["admin".into()];
    for u in [user("a"), user("b"), admin] {
        s.join(FilterType::AllUsers, u, &mut r).unwrap();
    }
    assert!(query(&mut s, &mut r, "a", StateQuery::AskQuestion(String::new())).is_err());
    assert!(query(&mut s, &mut r, "a", StateQuery::AskQuestion("x".repeat(501))).is_err());
    query(&mut s, &mut r, "a", StateQuery::AskQuestion("Why?".into())).unwrap();
    let id = s.state().questions.keys().next().unwrap().clone();
    let upvote = |up| StateQuery::UpvoteQuestion { question_id: id.clone(), upvoted: up };
    assert!(query(&mut s, &mut r, "a", upvote(true)).is_err());
    query(&mut s, &mut r, "b", upvote(true)).unwrap();
    assert_eq!(s.state().questions[&id].upvotes["uuid-b"], 1_000);

    assert!(query(&mut s, &mut r, "b", StateQuery::AnswerQuestion(id.clone())).is_err());
    query(&mut s, &mut r, "admin", StateQuery::AnswerQuestion(id.clone())).unwrap();
    assert_eq!(s.state().questions[&id].answer.as_ref().unwrap().moderator_id.as_str(), "uuid-admin");
    assert!(query(&mut s, &mut r, "b", upvote(false)).is_err());

    assert!(query(&mut s, &mut r, "b", StateQuery::DeleteQuestion(id.clone())).is_err());
    query(&mut s, &mut r, "admin", StateQuery::DeleteQuestion(id)).unwrap();
    assert!(s.state().questions.is_empty());
}

#[test]
fn the_kind_is_checked_against_the_schema() {
    let mut s = space(FilterType::AllUsers);
    let mut r = Rec::default();
    s.join(FilterType::AllUsers, user("a"), &mut r).unwrap();
    assert!(query(&mut s, &mut r, "a", StateQuery::SetKind("party".into())).is_err());
    query(&mut s, &mut r, "a", StateQuery::SetKind("area".into())).unwrap();
    assert_eq!(s.state().kind.map(|k| k.to_string()).as_deref(), Some("area"));
    assert!(query(&mut s, &mut r, "ghost", StateQuery::RaiseHand(true)).is_err());
}

#[test]
fn with_feedback_the_audience_only_sees_the_speakers() {
    let f = FilterType::LiveStreamingUsersWithFeedback;
    let mut s = space(f);
    let mut r = Rec::default();
    let mut speaker = user("s");
    speaker.megaphone_state = true;
    let mut l1 = user("l1");
    l1.attendees_state = true;
    let mut l2 = user("l2");
    l2.attendees_state = true;
    for u in [speaker, l1, l2.clone(), user("off")] {
        s.join(f, u, &mut r).unwrap();
    }
    for id in ["s", "l1", "l2", "off"] {
        s.watch(id, &mut r);
    }
    let inits: Vec<_> = r.take().into_iter().filter(|(_, e)| e.starts_with("init")).collect();
    assert_eq!(
        inits,
        vec![
            (to(&["s"]), "init s,l1,l2".to_owned()),
            (to(&["l1"]), "init s".to_owned()),
            (to(&["l2"]), "init s".to_owned()),
            (to(&["off"]), "init s".to_owned()),
        ]
    );

    // l2 goes on stage: everyone now sees it, and it now sees the audience. About itself it gets an update: like
    // the pusher, the change is judged with the watcher's role as it is now.
    l2.megaphone_state = true;
    s.update_from_client("l2", &l2, &["megaphoneState".into()], &mut r);
    assert_eq!(
        r.take(),
        vec![
            (to(&["l2", "s"]), "update l2".to_owned()),
            (to(&["l1", "off"]), "add l2".to_owned()),
            (to(&["l2"]), "add l1".to_owned()),
        ]
    );

    // A listener leaving is only news to the speakers.
    s.leave("l1", &mut r);
    assert_eq!(r.take(), vec![(to(&["l2", "s"]), "remove l1".to_owned())]);
}

#[test]
fn the_audience_is_connected_to_a_speaker_only_while_on_stage() {
    let f = FilterType::LiveStreamingUsers;
    let mut s = Space::new("s".into(), f, vec!["cameraState".into(), "screenSharingState".into()], "i".into());
    let mut r = Rec::default();
    let mut speaker = user("a");
    speaker.megaphone_state = true;
    let mut other_speaker = user("c");
    other_speaker.megaphone_state = true;
    for u in [speaker.clone(), other_speaker, user("d")] {
        s.join(f, u, &mut r).unwrap();
    }
    for id in ["a", "c", "d"] {
        s.watch(id, &mut r);
    }
    let p2p = |r: &mut Rec| -> Vec<(Vec<String>, String)> {
        r.take().into_iter().filter(|(_, e)| e.starts_with("WebRtc")).collect()
    };
    // Every watcher is linked to each speaker: a-c, d-a, d-c, each announced to both ends.
    assert_eq!(p2p(&mut r).len(), 6);

    // a leaves the stage: its link to the listener closes, the one to the other speaker stays.
    speaker.megaphone_state = false;
    s.update_from_client("a", &speaker, &["megaphoneState".into()], &mut r);
    assert_eq!(
        p2p(&mut r),
        vec![(to(&["d"]), "WebRtcDisconnect".to_owned()), (to(&["a"]), "WebRtcDisconnect".to_owned())]
    );
    // Back on stage: a new link to the listener, and the one the other speaker dropped (a had left its list)
    // is restarted.
    speaker.megaphone_state = true;
    s.update_from_client("a", &speaker, &["megaphoneState".into()], &mut r);
    assert_eq!(
        p2p(&mut r),
        vec![
            (to(&["a"]), "WebRtcDisconnect".to_owned()),
            (to(&["c"]), "WebRtcDisconnect".to_owned()),
            (to(&["a"]), "WebRtcStart".to_owned()),
            (to(&["c"]), "WebRtcStart".to_owned()),
            (to(&["a"]), "WebRtcStart".to_owned()),
            (to(&["d"]), "WebRtcStart".to_owned()),
        ]
    );
}

#[test]
fn a_member_back_in_a_list_gets_a_new_link_since_the_front_closed_the_old_one() {
    let f = FilterType::LiveStreamingUsersWithFeedback;
    let mut s = Space::new("s".into(), f, vec!["cameraState".into(), "screenSharingState".into()], "i".into());
    let mut r = Rec::default();
    let mut a = user("a");
    a.megaphone_state = true;
    a.attendees_state = true;
    let mut bob = user("bob");
    bob.attendees_state = true;
    for u in [a.clone(), bob] {
        s.join(f, u, &mut r).unwrap();
    }
    s.watch("a", &mut r);
    s.watch("bob", &mut r);
    r.take();

    // a leaves the stage but stays in the audience: bob no longer lists it and its front drops the link,
    // so nothing is sent about the connection...
    a.megaphone_state = false;
    s.update_from_client("a", &a, &["megaphoneState".into()], &mut r);
    let events = r.take();
    assert!(events.iter().any(|(to, e)| e == "remove a" && to.contains(&"bob".to_owned())), "{events:?}");
    assert!(!events.iter().any(|(_, e)| e.starts_with("WebRtc")), "{events:?}");
    // ...and back on stage, the link is restarted on both sides, once.
    a.megaphone_state = true;
    s.update_from_client("a", &a, &["megaphoneState".into()], &mut r);
    let p2p: Vec<_> = r.take().into_iter().filter(|(_, e)| e.starts_with("WebRtc")).collect();
    assert_eq!(
        p2p,
        vec![
            (to(&["a"]), "WebRtcDisconnect".to_owned()),
            (to(&["bob"]), "WebRtcDisconnect".to_owned()),
            (to(&["a"]), "WebRtcStart".to_owned()),
            (to(&["bob"]), "WebRtcStart".to_owned()),
        ]
    );
}

#[derive(Clone, Default)]
struct TestClock(Arc<AtomicU64>);
impl Clock for TestClock {
    fn now_ms(&self) -> u64 {
        self.0.load(Ordering::SeqCst)
    }
}

/// A bubble with LiveKit available above 4 users, its clock, and its members joined and watching.
fn bubble(ids: &[&str]) -> (Space, Rec, TestClock) {
    let f = FilterType::AllUsers;
    let mut s = Space::new("s".into(), f, vec!["cameraState".into(), "microphoneState".into()], "i".into());
    let clock = TestClock::default();
    s.configure_media(MediaConfig { max_webrtc: 4, livekit: true, switch_on_cpu: true }, Box::new(clock.clone()));
    let mut r = Rec::default();
    for id in ids {
        enter(&mut s, &mut r, id);
    }
    (s, r, clock)
}

fn enter(s: &mut Space, r: &mut Rec, id: &str) {
    s.join(FilterType::AllUsers, user(id), r).unwrap();
    s.after_join(id, r);
    s.watch(id, r);
}

fn kinds(r: &mut Rec, prefix: &str) -> Vec<(Vec<String>, String)> {
    r.take().into_iter().filter(|(_, e)| e.starts_with(prefix)).collect()
}

#[test]
fn a_fifth_user_moves_the_bubble_to_livekit_and_it_comes_back_after_a_quiet_delay() {
    let (mut s, mut r, clock) = bubble(&["a", "b", "c", "d"]);
    assert_eq!(s.comm(), Comm::WebRtc);
    r.take();

    // The fifth: everyone is told, the room opens, everyone is invited.
    enter(&mut s, &mut r, "e");
    let events = r.take();
    let switches: Vec<_> = events.iter().filter(|(_, e)| e == "switch LIVEKIT").collect();
    assert_eq!(switches.len(), 5);
    assert!(events.iter().any(|(_, e)| e == "room open"));
    assert_eq!(events.iter().filter(|(_, e)| e == "LivekitInvite").count(), 5);
    assert!(events.iter().all(|(_, e)| e != "switch WEBRTC"), "the joiner is told once");
    // 5 s later the clients drop their peer-to-peer links.
    clock.0.store(5_000, Ordering::SeqCst);
    s.tick(&mut r);
    assert_eq!(kinds(&mut r, "finalize").len(), 5);

    // Two leave: still LiveKit for 20 s, and each change restarts the delay.
    s.leave("e", &mut r);
    clock.0.store(15_000, Ordering::SeqCst);
    s.leave("d", &mut r);
    assert_eq!(s.next_deadline(), Some(35_000));
    clock.0.store(34_999, Ordering::SeqCst);
    s.tick(&mut r);
    assert_eq!(s.comm(), Comm::Livekit);
    clock.0.store(35_000, Ordering::SeqCst);
    s.tick(&mut r);
    assert_eq!(s.comm(), Comm::WebRtc);
    let events = r.take();
    assert_eq!(events.iter().filter(|(_, e)| e == "switch WEBRTC").count(), 3);
    // a-b, a-c, b-c, each announced to both ends.
    assert_eq!(events.iter().filter(|(_, e)| e == "WebRtcStart").count(), 6);
    clock.0.store(40_000, Ordering::SeqCst);
    s.tick(&mut r);
    let events = r.take();
    assert_eq!(events.iter().filter(|(_, e)| e == "finalize LIVEKIT").count(), 3);
    assert!(events.iter().any(|(_, e)| e == "room close"));
}

#[test]
fn a_recording_or_a_slow_computer_keeps_livekit() {
    let (mut s, mut r, clock) = bubble(&["a", "b", "c"]);
    // A CPU-limited member in a bubble of 3: LiveKit.
    let mut a = user("a");
    a.cpu_limited = true;
    s.update_from_client("a", &a, &["cpuLimited".into()], &mut r);
    assert_eq!(s.comm(), Comm::Livekit);
    // Recording: the space stays on LiveKit whatever happens.
    s.recording = true;
    a.cpu_limited = false;
    s.update_from_client("a", &a, &["cpuLimited".into()], &mut r);
    assert_eq!(s.next_deadline(), Some(5_000), "only the finalize timer");
    clock.0.store(60_000, Ordering::SeqCst);
    s.tick(&mut r);
    assert_eq!(s.comm(), Comm::Livekit);
}

#[test]
fn a_livekit_room_opens_with_its_first_publisher_and_closes_with_its_last() {
    let f = FilterType::LiveStreamingUsers;
    let mut s = Space::new("s".into(), f, vec!["cameraState".into()], "i".into());
    s.configure_media(
        MediaConfig { max_webrtc: 1, livekit: true, switch_on_cpu: true },
        Box::new(TestClock::default()),
    );
    let mut r = Rec::default();
    for id in ["l1", "l2"] {
        s.join(f, user(id), &mut r).unwrap();
        s.after_join(id, &mut r);
        s.watch(id, &mut r);
    }
    assert_eq!(s.comm(), Comm::Livekit);
    // Only listeners: no room, nobody invited.
    assert!(r.take().iter().all(|(_, e)| e != "room open" && e != "LivekitInvite"));
    let mut speaker = user("sp");
    speaker.megaphone_state = true;
    s.join(f, speaker, &mut r).unwrap();
    s.after_join("sp", &mut r);
    let events = r.take();
    assert!(events.iter().any(|(_, e)| e == "room open"));
    assert_eq!(events.iter().filter(|(_, e)| e == "LivekitInvite").count(), 3);
    // The speaker leaves: the listeners are disconnected and the room closes.
    s.leave("sp", &mut r);
    let events = r.take();
    assert_eq!(events.iter().filter(|(_, e)| e == "LivekitDisconnect").count(), 2);
    assert!(events.iter().any(|(_, e)| e == "room close"));
}

#[test]
fn a_recording_moves_to_livekit_follows_its_egress_and_only_its_recorder_stops_it() {
    let (mut s, mut r, _clock) = bubble(&["a", "b"]);
    let status = |s: &Space| s.state().recording.status;
    use wa_core::space_state::RecordingStatus as St;

    // Starting: LiveKit at once (the room opens with the publishers), state "starting".
    let plan = s.start_recording("a", "rec-1".into(), &mut r).unwrap().unwrap();
    assert_eq!(plan.recorder_uuid, "uuid-a");
    assert_eq!(s.comm(), Comm::Livekit);
    assert_eq!(status(&s), St::Starting);
    assert_eq!(s.start_recording("b", "rec-2".into(), &mut r).unwrap_err(), "Recording is already starting");
    s.egress_started("rec-1", Ok("EG_1".into()), &mut r);
    // LiveKit says it started: "recording".
    assert_eq!(s.webhook_started("rec-1", "EG_1", &mut r), None);
    assert_eq!(status(&s), St::Recording);
    assert!(s.state().recording.recording);
    // Only the recorder stops it; the end comes with the webhook.
    assert_eq!(s.stop_recording("b", &mut r).unwrap_err(), "User is not the one recording");
    assert_eq!(s.stop_recording("a", &mut r).unwrap(), Some("EG_1".to_owned()));
    assert_eq!(status(&s), St::Stopping);
    r.take();
    s.webhook_ended("rec-1", &mut r);
    assert_eq!(status(&s), St::Idle);
    assert!(r.take().iter().all(|(_, e)| e != "RecordingUnexpectedlyStopped"), "it was asked");

    // A recording that ends by itself warns its recorder; one whose recorder leaves is stopped by the server.
    s.start_recording("a", "rec-3".into(), &mut r).unwrap();
    s.webhook_started("rec-3", "EG_3", &mut r);
    r.take();
    s.webhook_ended("rec-3", &mut r);
    assert!(r.take().contains(&(vec!["a".to_owned()], "RecordingUnexpectedlyStopped".to_owned())));
    s.start_recording("b", "rec-4".into(), &mut r).unwrap();
    s.webhook_started("rec-4", "EG_4", &mut r);
    r.take();
    s.leave("b", &mut r);
    assert!(r.take().iter().any(|(_, e)| e == "StopEgress"));
    assert_eq!(status(&s), St::Stopping);
}

#[test]
fn a_recording_cannot_start_where_nobody_publishes() {
    let f = FilterType::LiveStreamingUsers;
    let mut s = Space::new("s".into(), f, vec!["cameraState".into()], "i".into());
    s.configure_media(
        MediaConfig { max_webrtc: 4, livekit: true, switch_on_cpu: true },
        Box::new(TestClock::default()),
    );
    let mut r = Rec::default();
    s.join(f, user("l"), &mut r).unwrap();
    assert_eq!(s.start_recording("l", "x".into(), &mut r).unwrap_err(), "Failed to start recording");
    assert_eq!(s.state().recording.status, wa_core::space_state::RecordingStatus::Idle);
}

#[test]
fn a_watch_that_arrives_after_its_user_left_registers_nobody() {
    // The space actor handles a user's commands in the order the session sent them, so a watch can only be
    // late relative to a leave if the leave came first: it must then be a no-op (29ca208789).
    let (mut s, mut r) = (space(FilterType::AllUsers), Rec::default());
    for id in ["a", "b"] {
        s.join(FilterType::AllUsers, user(id), &mut r).unwrap();
    }
    assert!(s.watch("a", &mut r));
    s.leave("b", &mut r);
    r.take();

    assert!(!s.watch("b", &mut r));
    assert!(r.take().is_empty(), "no init for a user who is gone");
    // Nobody is notified on its behalf afterwards.
    s.join(FilterType::AllUsers, user("c"), &mut r).unwrap();
    assert!(r.take().iter().all(|(to, _)| !to.contains(&"b".to_owned())));
}
