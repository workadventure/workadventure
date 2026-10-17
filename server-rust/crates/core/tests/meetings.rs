//! Meeting analytics (SessionAnalytics): when a session opens and closes, and the rows it leaves.

use wa_core::meetings::Meetings;
use wa_core::space::{FilterType, Space, SpaceEvent, SpaceSink, SpaceUser};
use wa_core::space_state::StateQuery;

struct Nothing;
impl SpaceSink for Nothing {
    fn emit(&mut self, _: &[&str], _: SpaceEvent<'_>) {}
}

fn user(id: &str) -> SpaceUser {
    SpaceUser { space_user_id: id.into(), uuid: format!("uuid-{id}"), play_uri: format!("room-{id}"), tags: vec!["t".into()], ..SpaceUser::default() }
}

fn kind(space: &mut Space, by: &str, kind: &str) {
    space.state_query(by, StateQuery::SetKind(kind.into()), 0, &mut || "q".into(), &mut Nothing).unwrap();
}

#[test]
fn a_bubble_opens_with_two_and_writes_each_participation_then_the_meeting() {
    let mut space = Space::new("bubble-1".into(), FilterType::AllUsers, vec![], "i".into());
    let mut m = Meetings::new("w.bubble-1".into(), "bubble-1".into());
    space.join(FilterType::AllUsers, user("a"), &mut Nothing).unwrap();
    m.observe(&space, 1_000);
    // No kind yet: nothing opens, even with two.
    space.join(FilterType::AllUsers, user("b"), &mut Nothing).unwrap();
    m.observe(&space, 2_000);
    kind(&mut space, "a", "bubble");
    m.observe(&space, 3_000);
    space.join(FilterType::AllUsers, user("c"), &mut Nothing).unwrap();
    m.observe(&space, 4_000);
    space.leave("c", &mut Nothing);
    m.observe(&space, 6_000);
    assert!(m.take_rows().is_empty(), "rows only when the session closes");
    // Down to one: the session ends.
    space.leave("b", &mut Nothing);
    m.observe(&space, 13_000);
    let rows = m.take_rows();
    let names: Vec<_> = rows.iter().map(|r| r.event_name).collect();
    assert_eq!(names, ["meeting.participation.ended"; 3].into_iter().chain(["meeting.ended"]).collect::<Vec<_>>());
    let c = &rows[2];
    assert_eq!(c.member.as_ref().unwrap().uuid, "uuid-c");
    assert_eq!(c.id_parts, "w.bubble-1:3000:c");
    assert_eq!(c.properties["joinRank"], 3);
    assert_eq!(c.properties["startedAt"], "1970-01-01T00:00:04.000Z");
    assert_eq!(c.properties["durationSeconds"], 2.0);
    assert_eq!(c.properties["role"], "speaker");
    assert_eq!(c.properties["endReason"], "closed");
    let ended = &rows[3];
    assert_eq!((ended.member.is_none(), ended.room_id.as_str(), ended.id_parts.as_str()), (true, "room-a", "w.bubble-1:3000"));
    assert_eq!(ended.properties["meetingId"], "bubble-1");
    assert_eq!(ended.properties["participantCount"], 3);
    assert_eq!(ended.properties["peakParticipantCount"], 3);
    assert_eq!(ended.properties["durationSeconds"], 10.0);
    assert_eq!(ended.properties["webrtcSeconds"], 0.0);
}

#[test]
fn a_megaphone_counts_speakers_and_their_airtime() {
    let mut space = Space::new("mega".into(), FilterType::LiveStreamingUsers, vec![], "i".into());
    let mut m = Meetings::new("w.mega".into(), "mega".into());
    space.join(FilterType::LiveStreamingUsers, user("listener"), &mut Nothing).unwrap();
    kind(&mut space, "listener", "megaphone");
    m.observe(&space, 0);
    space.join(FilterType::LiveStreamingUsers, SpaceUser { megaphone_state: true, ..user("speaker") }, &mut Nothing).unwrap();
    m.observe(&space, 1_000);
    m.close("back_shutdown", 4_500);
    let rows = m.take_rows();
    assert_eq!(rows.len(), 3);
    assert_eq!((rows[0].properties["role"].as_str(), rows[1].properties["role"].as_str()), (Some("listener"), Some("speaker")));
    assert_eq!(rows[1].properties["airtimeSeconds"], 3.5);
    assert_eq!(rows[2].properties["speakerCount"], 1);
    assert_eq!(rows[2].properties["endReason"], "back_shutdown");
}
