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
    start_with(&[("SECRET_KEY", "test")]).await.0
}

/// The server and its map-storage listener.
async fn start_with(vars: &[(&str, &str)]) -> (String, String) {
    let (play, maps, _) = start_state(vars).await;
    (play, maps)
}

async fn start_state(vars: &[(&str, &str)]) -> (String, String, AppState) {
    let config = Config::load(Env::new(vars.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())).unwrap();
    let state = AppState::new(config);
    let play = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let maps = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let urls = (
        format!("http://{}", play.local_addr().unwrap()),
        format!("http://{}", maps.local_addr().unwrap()),
    );
    let map_storage = wa_server::map_storage::router(state.clone());
    let app = router(state.clone());
    tokio::spawn(async move { axum::serve(play, app).await });
    tokio::spawn(async move { axum::serve(maps, map_storage).await });
    (urls.0, urls.1, state)
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

fn edit(id: &str, message: pb::edit_map_message::Message) -> pb::client_to_server_message::Message {
    pb::client_to_server_message::Message::EditMapCommandMessage(pb::EditMapCommandMessage {
        id: id.into(),
        edit_map_message: Some(pb::EditMapMessage { message: Some(message) }),
    })
}

fn edit_echo(m: &Incoming) -> Option<&pb::EditMapCommandMessage> {
    match m {
        Incoming::Sub(Sub::EditMapCommandMessage(c)) => Some(c),
        _ => None,
    }
}

fn zip_of(files: &[(&str, &str)]) -> Vec<u8> {
    use std::io::Write;
    let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
    for (name, content) in files {
        zip.start_file(*name, zip::write::SimpleFileOptions::default()).unwrap();
        zip.write_all(content.as_bytes()).unwrap();
    }
    zip.finish().unwrap().into_inner()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn map_edits_reach_the_room_and_the_file_and_an_upload_resets_them() {
    use pb::edit_map_message::Message as E;
    let dir = std::env::temp_dir().join(format!("wa-rust-maps-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("maps")).unwrap();
    let wam = r#"{"version":"1.0.0","mapUrl":"./t.tmj","areas":[],"entities":{},"entityCollections":[]}"#;
    std::fs::write(dir.join("maps/t.wam"), wam).unwrap();
    std::fs::write(dir.join("maps/old.png"), "x").unwrap();
    let (server, maps) = start_with(&[
        ("SECRET_KEY", "test"),
        ("STORAGE_DIRECTORY", dir.to_str().unwrap()),
        ("ENABLE_MAP_EDITOR", "true"),
        ("ENABLE_BASIC_AUTHENTICATION", "true"),
        ("AUTHENTICATION_USER", "john"),
        ("AUTHENTICATION_PASSWORD", "pw"),
    ])
    .await;
    let room = "http://play.test/~/maps/t.wam";
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    let (_bob, mut ib) = bot(&server, room, "Bob", 3000, 3000).await;

    // A created area comes back to everyone, the sender included, under its id.
    let area = pb::CreateAreaMessage {
        id: "area-1".into(),
        x: 32,
        y: 64,
        width: 96,
        height: 64,
        name: String::new(),
        properties: vec![],
    };
    alice.send(edit("cmd-1", E::CreateAreaMessage(area.clone()))).await.unwrap();
    for inbox in [&mut ia, &mut ib] {
        inbox.expect(WAIT, |m| edit_echo(m).filter(|c| c.id == "cmd-1").map(|_| ())).await.unwrap();
    }
    // A refused command (the area exists): an error, to the sender only.
    alice.send(edit("cmd-2", E::CreateAreaMessage(area))).await.unwrap();
    let error = ia
        .expect(WAIT, |m| {
            edit_echo(m).filter(|c| c.id == "cmd-2").and_then(|c| match c.edit_map_message.as_ref()?.message.as_ref()? {
                E::ErrorCommandMessage(e) => Some(e.reason.clone()),
                _ => None,
            })
        })
        .await
        .unwrap();
    assert!(error.contains("Could not execute CreateArea"), "{error}");
    assert!(ib.seen().iter().all(|m| edit_echo(m).is_none_or(|c| c.id != "cmd-2")));

    // The file is saved, migrated, with the area; served with CORS, a missing one is a 404.
    let http = reqwest::Client::new();
    let mut saved = serde_json::Value::Null;
    for _ in 0..50 {
        let r = http.get(format!("{maps}/maps/t.wam")).send().await.unwrap();
        assert_eq!(r.headers()["access-control-allow-origin"], "*");
        saved = r.json().await.unwrap();
        if saved["lastCommandId"] == "cmd-1" {
            break;
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    assert_eq!(saved["version"], "2.1.0");
    assert_eq!(saved["areas"][0]["id"], "area-1");
    assert_eq!(saved["areas"][0]["visible"], true);
    let missing = http.get(format!("{maps}/maps/nope.wam")).send().await.unwrap();
    assert_eq!(missing.status(), 404);

    // Upload: refused without credentials; with them, the directory is replaced and the room told to reload.
    let zip = zip_of(&[("maps/t.tmj", r#"{"properties":[{"name":"mapName","type":"string","value":"T"}]}"#), ("maps/u.wam", wam)]);
    let mut body = b"--XyZ\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.zip\"\r\n\r\n".to_vec();
    body.extend_from_slice(&zip);
    body.extend_from_slice(b"\r\n--XyZ--\r\n");
    let post = |auth: bool| {
        let request = http
            .post(format!("{maps}/upload"))
            .header("content-type", "multipart/form-data; boundary=XyZ")
            .body(body.clone());
        if auth { request.basic_auth("john", Some("pw")) } else { request }
    };
    assert_eq!(post(false).send().await.unwrap().status(), 401);
    let uploaded = post(true).send().await.unwrap();
    assert_eq!(uploaded.status(), 200, "{:?}", uploaded.text().await);
    ia.expect(WAIT, |m| matches!(m, Incoming::Top(Top::RefreshRoomMessage(_))).then_some(())).await.unwrap();
    assert!(!dir.join("maps/old.png").exists());
    assert!(dir.join("maps/u.wam").exists());
    // t.wam came without its map's new WAM: its edits survive the reset.
    let kept: serde_json::Value = serde_json::from_slice(&std::fs::read(dir.join("maps/t.wam")).unwrap()).unwrap();
    assert_eq!(kept["areas"][0]["id"], "area-1");
    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn the_room_goes_on_during_a_slow_upload_and_the_edits_keep_their_order() {
    use pb::edit_map_message::Message as E;
    let dir = std::env::temp_dir().join(format!("wa-rust-slow-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("maps")).unwrap();
    let wam = r#"{"version":"1.0.0","mapUrl":"./t.tmj","areas":[],"entities":{},"entityCollections":[]}"#;
    std::fs::write(dir.join("maps/t.wam"), wam).unwrap();
    let (server, _maps, state) = start_state(&[
        ("SECRET_KEY", "test"),
        ("STORAGE_DIRECTORY", dir.to_str().unwrap()),
        ("ENABLE_MAP_EDITOR", "true"),
    ])
    .await;
    let room = "http://play.test/~/maps/t.wam";
    let (mut alice, _ia) = bot(&server, room, "Alice", 100, 100).await;
    let (_bob, mut ib) = bot(&server, room, "Bob", 200, 200).await;
    let a = alice.user_id;

    // The disk hangs: the custom entity cannot be written.
    let disk = state.storage.hold_writes().await;
    let upload = pb::UploadEntityMessage {
        file: vec![1, 2, 3].into(),
        id: "entity-1".into(),
        name: "Lamp".into(),
        image_path: "lamp.png".into(),
        ..Default::default()
    };
    alice.send(edit("cmd-upload", E::UploadEntityMessage(upload))).await.unwrap();
    let area = pb::CreateAreaMessage { id: "area-1".into(), x: 0, y: 0, width: 32, height: 32, ..Default::default() };
    alice.send(edit("cmd-area", E::CreateAreaMessage(area))).await.unwrap();
    // Meanwhile the room still delivers moves.
    alice.move_to(130, 100, true, SCREEN).await.unwrap();
    ib.expect(WAIT, |m| match m {
        Incoming::Sub(Sub::UserMovedMessage(u)) if u.user_id == a && u.position.as_ref()?.x == 130 => Some(()),
        _ => None,
    })
    .await
    .unwrap();
    assert!(ib.seen().iter().all(|m| edit_echo(m).is_none()), "no edit may pass the one waiting for the disk");

    // The disk comes back: the upload, then the area, in that order, owner set by the server.
    drop(disk);
    let ids = ib
        .expect(WAIT, {
            let mut ids = Vec::new();
            move |m| {
                ids.extend(edit_echo(m).map(|c| c.id.clone()));
                (ids.len() == 2).then(|| ids.clone())
            }
        })
        .await
        .unwrap();
    assert_eq!(ids, ["cmd-upload", "cmd-area"]);
    let owner = ib.seen().iter().find_map(|m| match edit_echo(m)?.edit_map_message.as_ref()?.message.as_ref()? {
        E::UploadEntityMessage(u) => u.owner_id.clone(),
        _ => None,
    });
    assert!(owner.is_some_and(|o| !o.is_empty()));
    assert!(dir.join("assets/entities/lamp.png").exists());
    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn room_variables_follow_the_map_rights_and_reach_who_may_read_them() {
    use pb::client_to_server_message::Message as M;
    let dir = std::env::temp_dir().join(format!("wa-rust-vars-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("maps")).unwrap();
    std::fs::write(
        dir.join("maps/v.wam"),
        r#"{"version":"1.0.0","mapUrl":"./v.tmj","areas":[],"entities":{},"entityCollections":[]}"#,
    )
    .unwrap();
    let variable = |name: &str, props: serde_json::Value| serde_json::json!({"name": name, "class": "variable", "properties": props});
    let tmj = serde_json::json!({"layers": [{"type": "objectgroup", "objects": [
        variable("door", serde_json::json!([{"name": "default", "value": false}, {"name": "persist", "value": true}])),
        variable("secret", serde_json::json!([{"name": "readableBy", "value": "vip"}])),
        variable("locked", serde_json::json!([{"name": "writableBy", "value": "admin"}])),
    ]}]});
    std::fs::write(dir.join("maps/v.tmj"), tmj.to_string()).unwrap();
    let (server, _maps) = start_with(&[("SECRET_KEY", "test"), ("STORAGE_DIRECTORY", dir.to_str().unwrap())]).await;
    let room = "http://play.test/~/maps/v.wam";
    let var = |name: &str, value: &str| M::VariableMessage(pb::VariableMessage { name: name.into(), value: value.into() });
    let seen_var = |name: &'static str| move |m: &Incoming| match m {
        Incoming::Sub(Sub::VariableMessage(v)) if v.name == name => Some(v.value.clone()),
        _ => None,
    };

    // Defaults come with the room.
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    assert_eq!(alice.joined.variable.iter().map(|v| (v.name.as_str(), v.value.as_str())).collect::<Vec<_>>(), [("door", "false")]);
    let (_bob, mut ib) = bot(&server, room, "Bob", 3000, 3000).await;

    // A change reaches everyone, the writer included, however far.
    alice.send(var("door", "true")).await.unwrap();
    assert_eq!(ib.expect(WAIT, seen_var("door")).await.unwrap(), "true");
    assert_eq!(ia.expect(WAIT, seen_var("door")).await.unwrap(), "true");
    // One readable by a tag nobody here has goes to nobody, but is kept.
    alice.send(var("secret", "\"s\"")).await.unwrap();
    alice.send(var("door", "false")).await.unwrap();
    ib.expect(WAIT, |m| (seen_var("door")(m).as_deref() == Some("false")).then_some(())).await.unwrap();
    assert!(ib.seen().iter().all(|m| seen_var("secret")(m).is_none()));
    let (carol, _ic) = bot(&server, room, "Carol", 200, 200).await;
    assert_eq!(carol.joined.variable.iter().map(|v| v.name.as_str()).collect::<Vec<_>>(), ["door"]);

    // Without the tag to write it: an error, then the connection ends (the map was read less than 10 s ago).
    alice.send(var("locked", "1")).await.unwrap();
    let error = ia
        .expect(WAIT, |m| match m {
            Incoming::Top(Top::ErrorMessage(e)) => Some(e.message.clone()),
            _ => None,
        })
        .await
        .unwrap();
    assert!(error.contains("Required tag: \"admin\""), "{error}");
    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn players_reach_each_other_by_events_follows_invitations_items_and_emotes() {
    use pb::client_to_server_message::Message as M;
    let server = start().await;
    let room = "http://play.test/_/global/maps.test/social.json";
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    let (mut bob, mut ib) = bot(&server, room, "Bob", 130, 100).await;
    let (_carol, mut ic) = bot(&server, room, "Carol", 3000, 3000).await;
    let (a, b) = (alice.user_id, bob.user_id);
    // Alice and Bob form a bubble.
    ia.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::GroupUpdateMessage(g)) if g.user_ids.contains(&b)).then_some(()))
        .await
        .unwrap();

    // An event to the room reaches everyone, the sender included; a targeted one only its target.
    let event = |name: &str, targets: Vec<i32>| {
        pb::query_message::Query::SendEventQuery(pb::SendEventQuery { name: name.into(), data: None, target_user_ids: targets })
    };
    let got = |name: &'static str| move |m: &Incoming| match m {
        Incoming::Sub(Sub::ReceivedEventMessage(e)) if e.name == name => Some(e.sender_id),
        _ => None,
    };
    let q = alice.query(event("hello", vec![])).await.unwrap();
    ia.expect(WAIT, answer_to(q)).await.unwrap();
    for inbox in [&mut ia, &mut ib, &mut ic] {
        assert_eq!(inbox.expect(WAIT, got("hello")).await.unwrap(), Some(a));
    }
    alice.query(event("psst", vec![b, 999])).await.unwrap();
    assert_eq!(ib.expect(WAIT, got("psst")).await.unwrap(), Some(a));
    alice.query(event("after", vec![])).await.unwrap();
    ic.expect(WAIT, got("after")).await.unwrap();
    assert!(ic.seen().iter().all(|m| got("psst")(m).is_none()));

    // Follow: the request reaches the bubble, the confirmation the leader, the abort both.
    alice.send(M::FollowRequestMessage(pb::FollowRequestMessage { leader: a, force_follow: true })).await.unwrap();
    ib.expect(WAIT, |m| matches!(m, Incoming::Top(Top::FollowRequestMessage(r)) if r.leader == a).then_some(())).await.unwrap();
    bob.send(M::FollowConfirmationMessage(pb::FollowConfirmationMessage { leader: a, follower: b })).await.unwrap();
    ia.expect(WAIT, |m| matches!(m, Incoming::Top(Top::FollowConfirmationMessage(c)) if c.follower == b).then_some(()))
        .await
        .unwrap();
    alice.send(M::FollowAbortMessage(pb::FollowAbortMessage { leader: a, follower: 0 })).await.unwrap();
    ib.expect(WAIT, |m| matches!(m, Incoming::Top(Top::FollowAbortMessage(c)) if c.follower == b).then_some(())).await.unwrap();

    // Items: everyone, the sender included.
    let item = pb::ItemEventMessage { item_id: 7, event: "toggle".into(), state_json: "true".into(), parameters_json: "{}".into() };
    bob.send(M::ItemEventMessage(item)).await.unwrap();
    for inbox in [&mut ib, &mut ic] {
        inbox.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::ItemEventMessage(i)) if i.item_id == 7).then_some(())).await.unwrap();
    }
    let (dave, _id) = bot(&server, room, "Dave", 200, 200).await;
    assert_eq!(dave.joined.item.iter().map(|i| (i.item_id, i.state_json.as_str())).collect::<Vec<_>>(), [(7, "true")]);

    // Emotes: emoji only, to who sees the player, not the player.
    bob.send(M::EmotePromptMessage(pb::EmotePromptMessage { emote: "not an emoji".into() })).await.unwrap();
    bob.send(M::EmotePromptMessage(pb::EmotePromptMessage { emote: "👋".into() })).await.unwrap();
    let emote = ia
        .expect(WAIT, |m| match m {
            Incoming::Sub(Sub::EmoteEventMessage(e)) => Some((e.actor_user_id, e.emote.clone())),
            _ => None,
        })
        .await
        .unwrap();
    assert_eq!(emote, (b, "👋".to_owned()));

    // Invitations: the fifth one to the same person within ten minutes is refused.
    let bob_uuid = ia
        .seen()
        .iter()
        .find_map(|m| match m {
            Incoming::Sub(Sub::UserJoinedMessage(u)) if u.user_id == b => Some(u.user_uuid.clone()),
            _ => None,
        })
        .unwrap();
    for _ in 0..4 {
        alice
            .send(M::MeetingInvitationRequestMessage(pb::MeetingInvitationRequestMessage {
                receiver_user_uuid: bob_uuid.clone(),
                receiver_user_id: None,
            }))
            .await
            .unwrap();
    }
    ib.expect(WAIT, |m| matches!(m, Incoming::Top(Top::MeetingInvitationRequestReceivedMessage(r)) if r.sender_name == "Alice").then_some(()))
        .await
        .unwrap();
    alice
        .send(M::MeetingInvitationRequestMessage(pb::MeetingInvitationRequestMessage { receiver_user_uuid: bob_uuid.clone(), receiver_user_id: None }))
        .await
        .unwrap();
    ia.expect(WAIT, |m| matches!(m, Incoming::Top(Top::MeetingInvitationRequestTooHighMessage(_))).then_some(())).await.unwrap();
}

#[tokio::test]
async fn map_storage_lives_under_path_prefix_and_the_protocol_hash_is_exposed() {
    let (server, maps) =
        start_with(&[("SECRET_KEY", "test"), ("PATH_PREFIX", "/map-storage/"), ("API_VERSION_HASH", "d2d82672")]).await;
    let http = reqwest::Client::new();
    assert_eq!(http.get(format!("{maps}/map-storage/ping")).send().await.unwrap().status(), 200);
    assert_eq!(http.get(format!("{maps}/ping")).send().await.unwrap().status(), 404);
    let version = http.get(format!("{server}/api-version")).send().await.unwrap();
    assert_eq!(version.text().await.unwrap(), "d2d82672");
}

/// A fake admin: who may enter (A3), the maps (A2), and the queries it was sent.
async fn fake_admin() -> (String, std::sync::Arc<parking_lot::Mutex<Vec<String>>>) {
    use axum::extract::RawQuery;
    let seen = std::sync::Arc::new(parking_lot::Mutex::new(Vec::new()));
    let log = seen.clone();
    let app = axum::Router::new()
        .route(
            "/api/room/access",
            axum::routing::get(move |RawQuery(q): RawQuery| {
                let log = log.clone();
                async move {
                    let q = q.unwrap_or_default();
                    log.lock().push(q.clone());
                    if q.contains("banned") {
                        return axum::Json(serde_json::json!({"status": "error", "type": "error", "code": "USER_BANNED",
                            "title": "Banned", "subtitle": "", "details": "You were banned", "image": ""}));
                    }
                    axum::Json(serde_json::json!({
                        "status": "ok", "email": null, "userUuid": "admin-uuid-1", "tags": ["admin", "member"],
                        "visitCardUrl": "https://cards/1", "isCharacterTexturesValid": true,
                        "characterTextures": [{"id": "w1", "url": "https://wokas/w1.png"}],
                        "isCompanionTextureValid": true, "world": "acme", "userRoomToken": "urt-1", "canEdit": true,
                    }))
                }
            }),
        )
        .route("/api/map", axum::routing::get(|| async { axum::Json(serde_json::json!({"group": "acme", "mapUrl": "http://maps.test/m.json"})) }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await });
    (url, seen)
}

#[tokio::test]
async fn with_an_admin_the_room_access_decides_who_enters_and_as_whom() {
    let config = Config::load(Env::new([("SECRET_KEY", "test")].iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())).unwrap();
    let mut state = AppState::new(config);
    let (admin_url, seen) = fake_admin().await;
    state.admin = Some(wa_server::admin_api::AdminApi::with(&admin_url, "tok", serde_json::json!({}), reqwest::Client::new()));
    let play = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let server = format!("http://{}", play.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(play, router(state)).await });

    // The admin's identity, textures, token and rights are those the room gets.
    let room = "http://play.test/@/acme/world/lobby";
    let (alice, _ia) = bot(&server, room, "Alice", 100, 100).await;
    assert_eq!(alice.joined.user_room_token, "urt-1");
    assert!(alice.joined.can_edit);
    assert_eq!(alice.joined.character_textures[0].url, "https://wokas/w1.png");
    let asked = seen.lock().last().cloned().unwrap();
    assert!(asked.contains("playUri=http%3A%2F%2Fplay.test%2F%40%2Facme%2Fworld%2Flobby"), "{asked}");
    assert!(asked.contains("characterTextureIds%5B%5D=male1"), "{asked}");

    // An error of the admin (a ban, a full world) is the error screen the user sees.
    let refused = Bot::connect(Options {
        server: server.clone(),
        room_url: "http://play.test/@/acme/world/banned".into(),
        name: "Eve".into(),
        x: 0,
        y: 0,
        viewport: SCREEN,
        availability: 1,
    })
    .await;
    let Err(e) = refused else { panic!("a refused user must not enter") };
    assert!(format!("{e:?}").contains("You were banned") || format!("{e:?}").contains("closed"), "{e:?}");
}
