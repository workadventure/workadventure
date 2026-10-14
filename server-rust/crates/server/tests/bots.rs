//! End to end, through real WebSockets: headless clients against the server started in-process.

use std::collections::HashSet;
use std::time::Duration;

use wa_bot::{Bot, Inbox, Incoming, Options, Sub, Top};
use wa_proto::messages as pb;
use wa_server::config::{Config, Env};
use wa_server::{AppState, router};

const SCREEN: (i32, i32, i32, i32) = (0, 0, 1000, 1000);
const MEDIA: [&str; 3] = ["cameraState", "microphoneState", "screenSharingState"];
const WAIT: Duration = Duration::from_secs(5);

async fn start() -> String {
    let config = Config::load(Env::new(
        [("SECRET_KEY", "test")]
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
    ))
    .unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, router(AppState::new(config))).await });
    format!("http://{addr}")
}

async fn bot(server: &str, room: &str, name: &str, x: i32, y: i32) -> (Bot, Inbox) {
    let (bot, stream) = Bot::connect(Options {
        server: server.into(),
        room_url: room.into(),
        name: name.into(),
        x,
        y,
        viewport: SCREEN,
        availability: 1,
    })
    .await
    .unwrap();
    (bot, Inbox::spawn(stream))
}

fn private_event(m: &Incoming) -> Option<(&pb::SpaceUser, &pb::private_space_event::Event)> {
    match m {
        Incoming::Sub(Sub::PrivateEvent(e)) => Some((e.sender.as_ref()?, e.space_event.as_ref()?.event.as_ref()?)),
        _ => None,
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn two_players_see_each_other_move_and_form_a_bubble() {
    let server = start().await;
    let room = "http://play.test/_/global/maps.test/e2e.json";
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    let (mut bob, mut ib) = bot(&server, room, "Bob", 400, 100).await;
    assert!(alice.user_id > 0 && bob.user_id > 0 && alice.user_id != bob.user_id);

    // They see each other.
    let b = bob.user_id;
    let a = alice.user_id;
    ia.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::UserJoinedMessage(u)) if u.user_id == b && u.name == "Bob").then_some(()))
        .await
        .unwrap();
    ib.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::UserJoinedMessage(u)) if u.user_id == a).then_some(()))
        .await
        .unwrap();

    // Bob walks to Alice: she sees him move, both are put in the same bubble.
    bob.move_to(250, 100, true, SCREEN).await.unwrap();
    bob.move_to(130, 100, false, SCREEN).await.unwrap();
    ia.expect(WAIT, |m| match m {
        Incoming::Sub(Sub::UserMovedMessage(u)) if u.user_id == b && u.position.as_ref()?.x == 130 => Some(()),
        _ => None,
    })
    .await
    .unwrap();
    let space_a = ia
        .expect(WAIT, |m| match m {
            Incoming::Top(Top::JoinSpaceRequestMessage(r)) => Some(r.space_name.clone()),
            _ => None,
        })
        .await
        .unwrap();
    let space_b = ib
        .expect(WAIT, |m| match m {
            Incoming::Top(Top::JoinSpaceRequestMessage(r)) => Some(r.space_name.clone()),
            _ => None,
        })
        .await
        .unwrap();
    assert_eq!(space_a, space_b);
    assert!(space_a.starts_with(&format!("{room}#")));
    ia.expect(WAIT, |m| match m {
        Incoming::Sub(Sub::GroupUpdateMessage(g)) if g.user_ids.contains(&a) && g.user_ids.contains(&b) => Some(()),
        _ => None,
    })
    .await
    .unwrap();

    // The bubble's space: joining gets the answer, then the peer-to-peer switch; watching starts the call.
    let qa = alice.join_space(&space_a, &MEDIA).await.unwrap();
    ia.expect(WAIT, |m| match m {
        Incoming::Top(Top::AnswerMessage(pb::AnswerMessage {
            id,
            answer: Some(pb::answer_message::Answer::JoinSpaceAnswer(j)),
        })) if *id == qa => Some(j.space_user_id.clone()),
        _ => None,
    })
    .await
    .map(|id| assert_eq!(id, alice.space_user_id()))
    .unwrap();
    ia.expect(WAIT, |m| {
        matches!(private_event(m), Some((_, pb::private_space_event::Event::SwitchMessage(s))) if s.strategy == "WEBRTC")
            .then_some(())
    })
    .await
    .unwrap();
    alice.watch_space(&space_a).await.unwrap();
    bob.join_space(&space_b, &MEDIA).await.unwrap();
    bob.watch_space(&space_b).await.unwrap();
    let init = ib
        .expect(WAIT, |m| match m {
            Incoming::Sub(Sub::InitSpaceUsersMessage(i)) => Some(i.users.len()),
            _ => None,
        })
        .await
        .unwrap();
    assert_eq!(init, 2);
    let (bob_id, alice_id) = (bob.space_user_id(), alice.space_user_id());
    ia.expect(WAIT, |m| match private_event(m) {
        Some((sender, pb::private_space_event::Event::WebRtcStartMessage(s))) if sender.space_user_id == bob_id => {
            Some(s.initiator)
        }
        _ => None,
    })
    .await
    .map(|initiator| assert!(initiator, "the watcher's peer offers"))
    .unwrap();
    ib.expect(WAIT, |m| match private_event(m) {
        Some((sender, pb::private_space_event::Event::WebRtcStartMessage(s))) if sender.space_user_id == alice_id => {
            Some(s.initiator)
        }
        _ => None,
    })
    .await
    .map(|initiator| assert!(!initiator))
    .unwrap();

    // Bob leaves: Alice sees him go and the bubble disappear.
    bob.close().await;
    ia.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::UserLeftMessage(u)) if u.user_id == b).then_some(()))
        .await
        .unwrap();
    ia.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::GroupDeleteMessage(_))).then_some(()))
        .await
        .unwrap();
}

/// Many rooms active at the same time: every player of every room sees the final position of the others,
/// and nothing leaks between rooms (each room uses its own x offset, so a stray message would show).
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn many_rooms_in_parallel() {
    let server = start().await;
    const ROOMS: i32 = 40;
    const PER_ROOM: i32 = 4;
    let mut tasks = Vec::new();
    for r in 0..ROOMS {
        let server = server.clone();
        tasks.push(tokio::spawn(async move {
            let room = format!("http://play.test/_/global/maps.test/room{r}.json");
            let x = |i: i32| 100 + 200 * i + r;
            let mut bots = Vec::new();
            for i in 0..PER_ROOM {
                bots.push(bot(&server, &room, &format!("r{r}u{i}"), x(i), 500).await);
            }
            let ids: Vec<i32> = bots.iter().map(|(b, _)| b.user_id).collect();
            for step in 0..20 {
                for (i, (b, _)) in bots.iter_mut().enumerate() {
                    b.move_to(x(i as i32), 500 + step, step < 19, SCREEN).await.unwrap();
                }
            }
            for (b, inbox) in bots.iter_mut() {
                for &id in ids.iter().filter(|id| **id != b.user_id) {
                    inbox
                        .expect(WAIT, |m| match m {
                            Incoming::Sub(Sub::UserMovedMessage(u)) if u.user_id == id && u.position.as_ref()?.y == 519 => Some(()),
                            _ => None,
                        })
                        .await
                        .unwrap_or_else(|e| panic!("room {r}: {}", e.0));
                }
                for m in inbox.seen() {
                    let pos = match m {
                        Incoming::Sub(Sub::UserMovedMessage(u)) => u.position.as_ref(),
                        Incoming::Sub(Sub::UserJoinedMessage(u)) => u.position.as_ref(),
                        _ => None,
                    };
                    if let Some(p) = pos {
                        assert_eq!((p.x - 100) % 200, r, "room {r} saw a player of another room");
                    }
                }
            }
        }));
    }
    for t in tasks {
        t.await.unwrap();
    }
}

/// Hundreds of players in one room: each sees everybody arrive, and the last move of a player reaches all.
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn hundreds_of_players_in_one_room() {
    let server = start().await;
    const N: i32 = 300;
    let room = "http://play.test/_/global/maps.test/big.json";
    let mut bots = Vec::new();
    for i in 0..N {
        // Far enough apart that nobody forms a bubble: this is about the fan-out.
        bots.push(bot(&server, room, &format!("u{i}"), (i % 20) * 50, (i / 20) * 60).await);
    }
    let (mover, _) = &mut bots[0];
    let mover_id = mover.user_id;
    mover.move_to(999, 999, false, SCREEN).await.unwrap();
    let mut handles = Vec::new();
    for (b, mut inbox) in bots.into_iter().skip(1) {
        handles.push(tokio::spawn(async move {
            let mut seen = HashSet::new();
            inbox
                .expect(Duration::from_secs(20), |m| {
                    if let Incoming::Sub(Sub::UserJoinedMessage(u)) = m {
                        seen.insert(u.user_id);
                    }
                    (seen.len() as i32 >= N - 1).then_some(())
                })
                .await
                .unwrap();
            inbox
                .expect(Duration::from_secs(20), |m| match m {
                    Incoming::Sub(Sub::UserMovedMessage(u)) if u.user_id == mover_id && u.position.as_ref()?.x == 999 => Some(()),
                    _ => None,
                })
                .await
                .unwrap();
            b
        }));
    }
    for h in handles {
        h.await.unwrap();
    }
}

fn answer_to(id: i32) -> impl FnMut(&Incoming) -> Option<pb::answer_message::Answer> {
    move |m| match m {
        Incoming::Top(Top::AnswerMessage(a)) if a.id == id => a.answer.clone(),
        _ => None,
    }
}

fn state_patch(m: &Incoming) -> Option<serde_json::Value> {
    match m {
        Incoming::Sub(Sub::SpaceStatePatchMessage(p)) => serde_json::from_str(&p.patch).ok(),
        _ => None,
    }
}

fn state_query(space: &str, q: pb::space_state_query::Query) -> pb::query_message::Query {
    pb::query_message::Query::SpaceStateQuery(pb::SpaceStateQueryFrontToPusher {
        space_name: space.into(),
        query: Some(pb::SpaceStateQuery { query: Some(q) }),
    })
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn a_state_change_reaches_every_member_before_the_answer() {
    use pb::answer_message::Answer;
    use pb::space_state_query::Query as Q;
    let server = start().await;
    let room = "http://play.test/_/global/maps.test/state.json";
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    let (mut bob, mut ib) = bot(&server, room, "Bob", 3000, 3000).await;
    for (b, inbox) in [(&mut alice, &mut ia), (&mut bob, &mut ib)] {
        let q = b.join_space("hall", &[]).await.unwrap();
        inbox.expect(WAIT, answer_to(q)).await.unwrap();
        // Then the whole state, as one root replace.
        let init = inbox.expect(WAIT, state_patch).await.unwrap();
        assert_eq!(init[0]["path"], "");
        assert_eq!(init[0]["value"]["recording"]["status"], "idle");
    }
    ia.clear();

    let q = alice.query(state_query("hall", Q::RaiseHand(pb::RaiseHandQuery { raised: true }))).await.unwrap();
    assert!(matches!(ia.expect(WAIT, answer_to(q)).await.unwrap(), Answer::SpaceStateAnswer(_)));
    let patch = ia.seen().iter().find_map(state_patch).expect("the patch came before the answer");
    assert_eq!(patch[0]["op"], "add");
    assert_eq!(patch[0]["path"], "/raisedHands/0");
    assert_eq!(patch[0]["value"]["spaceUserId"], alice.space_user_id());
    let seen_by_bob = ib
        .expect(WAIT, |m| state_patch(m).filter(|p| p[0]["path"] == "/raisedHands/0"))
        .await
        .unwrap();
    assert_eq!(seen_by_bob, patch);

    // A refused query: an error, and nothing changes.
    ib.clear();
    let vote = Q::VotePoll(pb::VotePollQuery {
        poll_id: "nope".into(),
        answer_ids: vec![],
    });
    let q = bob.query(state_query("hall", vote)).await.unwrap();
    match ib.expect(WAIT, answer_to(q)).await.unwrap() {
        Answer::Error(e) => assert!(e.message.contains("Poll nope does not exist in this space"), "{}", e.message),
        other => panic!("{other:?}"),
    }
    assert!(ib.seen().iter().all(|m| state_patch(m).is_none()));
}
