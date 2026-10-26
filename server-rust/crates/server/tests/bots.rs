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
    let urls = (format!("http://{}", play.local_addr().unwrap()), format!("http://{}", maps.local_addr().unwrap()));
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
        token: None,
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
    ia.expect(WAIT, |m| {
        matches!(m, Incoming::Sub(Sub::UserJoinedMessage(u)) if u.user_id == b && u.name == "Bob").then_some(())
    })
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
    let alice_offers = ia
        .expect(WAIT, |m| match private_event(m) {
            Some((sender, pb::private_space_event::Event::WebRtcStartMessage(s))) if sender.space_user_id == bob_id => {
                Some(s.initiator)
            }
            _ => None,
        })
        .await
        .unwrap();
    let bob_offers = ib
        .expect(WAIT, |m| match private_event(m) {
            Some((sender, pb::private_space_event::Event::WebRtcStartMessage(s)))
                if sender.space_user_id == alice_id =>
            {
                Some(s.initiator)
            }
            _ => None,
        })
        .await
        .unwrap();
    // One end offers, the other answers (which one depends on whose watch came first).
    assert_ne!(alice_offers, bob_offers);

    // Bob leaves: Alice sees him go and the bubble disappear.
    bob.close().await;
    ia.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::UserLeftMessage(u)) if u.user_id == b).then_some(()))
        .await
        .unwrap();
    ia.expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::GroupDeleteMessage(_))).then_some(())).await.unwrap();
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
                            Incoming::Sub(Sub::UserMovedMessage(u))
                                if u.user_id == id && u.position.as_ref()?.y == 519 =>
                            {
                                Some(())
                            }
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
                    Incoming::Sub(Sub::UserMovedMessage(u))
                        if u.user_id == mover_id && u.position.as_ref()?.x == 999 =>
                    {
                        Some(())
                    }
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
    let seen_by_bob = ib.expect(WAIT, |m| state_patch(m).filter(|p| p[0]["path"] == "/raisedHands/0")).await.unwrap();
    assert_eq!(seen_by_bob, patch);

    // A refused query: an error, and nothing changes.
    ib.clear();
    let vote = Q::VotePoll(pb::VotePollQuery { poll_id: "nope".into(), answer_ids: vec![] });
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
            edit_echo(m).filter(|c| c.id == "cmd-2").and_then(|c| {
                match c.edit_map_message.as_ref()?.message.as_ref()? {
                    E::ErrorCommandMessage(e) => Some(e.reason.clone()),
                    _ => None,
                }
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
    let zip = zip_of(&[
        ("maps/t.tmj", r#"{"properties":[{"name":"mapName","type":"string","value":"T"}]}"#),
        ("maps/u.wam", wam),
    ]);
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
async fn an_upload_without_editor_access_is_refused_to_its_sender_only_and_writes_nothing() {
    use pb::edit_map_message::Message as E;
    let dir = std::env::temp_dir().join(format!("wa-rust-upload-rights-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("maps")).unwrap();
    let wam = r#"{"version":"1.0.0","mapUrl":"./t.tmj","areas":[],"entities":{},"entityCollections":[]}"#;
    std::fs::write(dir.join("maps/t.wam"), wam).unwrap();
    let (server, _maps) = start_with(&[
        ("SECRET_KEY", "test"),
        ("STORAGE_DIRECTORY", dir.to_str().unwrap()),
        ("ENABLE_MAP_EDITOR", "true"),
        ("MAP_EDITOR_ALLOW_ALL_USERS", "false"),
    ])
    .await;
    let room = "http://play.test/~/maps/t.wam";
    let (mut vera, mut iv) = bot(&server, room, "Vera", 100, 100).await;
    let (_bob, mut ib) = bot(&server, room, "Bob", 200, 200).await;
    let refusal = |id: &'static str| {
        move |m: &Incoming| {
            edit_echo(m).filter(|c| c.id == id).and_then(|c| match c.edit_map_message.as_ref()?.message.as_ref()? {
                E::ErrorCommandMessage(e) => Some(e.reason.clone()),
                _ => None,
            })
        }
    };

    let entity = pb::UploadEntityMessage {
        file: vec![1, 2, 3].into(),
        id: "entity-1".into(),
        name: "Lamp".into(),
        image_path: "lamp.png".into(),
        ..Default::default()
    };
    vera.send(edit("cmd-entity", E::UploadEntityMessage(entity))).await.unwrap();
    let file = pb::UploadFileMessage {
        id: "file-1".into(),
        name: "doc.pdf".into(),
        property_id: "p".into(),
        file: vec![1].into(),
        ..Default::default()
    };
    vera.send(edit("cmd-file", E::UploadFileMessage(file))).await.unwrap();
    for id in ["cmd-entity", "cmd-file"] {
        let reason = iv.expect(WAIT, refusal(id)).await.unwrap();
        assert!(reason.contains("not allowed to upload"), "{reason}");
    }
    // The delete of an entity already gone still goes to everyone; the uploads before it reached nobody but her.
    vera.send(edit("cmd-delete", E::DeleteEntityMessage(pb::DeleteEntityMessage { id: "none".into() }))).await.unwrap();
    ib.expect(WAIT, |m| edit_echo(m).filter(|c| c.id == "cmd-delete").map(|_| ())).await.unwrap();
    assert!(ib.seen().iter().all(|m| edit_echo(m).is_none_or(|c| c.id == "cmd-delete")));
    assert!(!dir.join("assets/entities/lamp.png").exists());
    assert!(!dir.join("private/files/doc-p.pdf").exists());
    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn what_a_player_sent_before_leaving_is_handled_before_it_leaves() {
    // 70d0a91b36: the back closed a joinRoom stream with messages still queued behind a slow handler, and lost
    // them (the last variable write of a player navigating away). Here a session reads its inbox to the end
    // before it leaves, and the room handles its commands in that order.
    use pb::client_to_server_message::Message as M;
    let dir = std::env::temp_dir().join(format!("wa-rust-last-write-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("maps")).unwrap();
    let tmj = serde_json::json!({"layers": [{"type": "objectgroup", "objects": [
        {"name": "door", "class": "variable", "properties": [{"name": "default", "value": 0}, {"name": "persist", "value": true}]},
    ]}]});
    std::fs::write(dir.join("maps/v.tmj"), tmj.to_string()).unwrap();
    std::fs::write(
        dir.join("maps/v.wam"),
        r#"{"version":"1.0.0","mapUrl":"./v.tmj","areas":[],"entities":{},"entityCollections":[]}"#,
    )
    .unwrap();
    let (server, _maps) = start_with(&[("SECRET_KEY", "test"), ("STORAGE_DIRECTORY", dir.to_str().unwrap())]).await;
    let room = "http://play.test/~/maps/v.wam";
    let (_bob, mut ib) = bot(&server, room, "Bob", 3000, 3000).await;
    let (mut alice, _ia) = bot(&server, room, "Alice", 100, 100).await;

    for i in 1..=30 {
        alice
            .send(M::VariableMessage(pb::VariableMessage { name: "door".into(), value: i.to_string() }))
            .await
            .unwrap();
    }
    alice.close().await;
    ib.expect(WAIT, |m| match m {
        Incoming::Sub(Sub::VariableMessage(v)) if v.name == "door" && v.value == "30" => Some(()),
        _ => None,
    })
    .await
    .unwrap();
    let (carol, _ic) = bot(&server, room, "Carol", 200, 200).await;
    let door = carol.joined.variable.iter().find(|v| v.name == "door").map(|v| v.value.clone());
    assert_eq!(door.as_deref(), Some("30"));
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
    let var =
        |name: &str, value: &str| M::VariableMessage(pb::VariableMessage { name: name.into(), value: value.into() });
    let seen_var = |name: &'static str| {
        move |m: &Incoming| match m {
            Incoming::Sub(Sub::VariableMessage(v)) if v.name == name => Some(v.value.clone()),
            _ => None,
        }
    };

    // Defaults come with the room.
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    assert_eq!(
        alice.joined.variable.iter().map(|v| (v.name.as_str(), v.value.as_str())).collect::<Vec<_>>(),
        [("door", "false")]
    );
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
    ia.expect(WAIT, |m| {
        matches!(m, Incoming::Sub(Sub::GroupUpdateMessage(g)) if g.user_ids.contains(&b)).then_some(())
    })
    .await
    .unwrap();

    // An event to the room reaches everyone, the sender included; a targeted one only its target.
    let event = |name: &str, targets: Vec<i32>| {
        pb::query_message::Query::SendEventQuery(pb::SendEventQuery {
            name: name.into(),
            data: None,
            target_user_ids: targets,
        })
    };
    let got = |name: &'static str| {
        move |m: &Incoming| match m {
            Incoming::Sub(Sub::ReceivedEventMessage(e)) if e.name == name => Some(e.sender_id),
            _ => None,
        }
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
    ib.expect(WAIT, |m| matches!(m, Incoming::Top(Top::FollowRequestMessage(r)) if r.leader == a).then_some(()))
        .await
        .unwrap();
    bob.send(M::FollowConfirmationMessage(pb::FollowConfirmationMessage { leader: a, follower: b })).await.unwrap();
    ia.expect(WAIT, |m| matches!(m, Incoming::Top(Top::FollowConfirmationMessage(c)) if c.follower == b).then_some(()))
        .await
        .unwrap();
    alice.send(M::FollowAbortMessage(pb::FollowAbortMessage { leader: a, follower: 0 })).await.unwrap();
    ib.expect(WAIT, |m| matches!(m, Incoming::Top(Top::FollowAbortMessage(c)) if c.follower == b).then_some(()))
        .await
        .unwrap();

    // Items: everyone, the sender included.
    let item = pb::ItemEventMessage {
        item_id: 7,
        event: "toggle".into(),
        state_json: "true".into(),
        parameters_json: "{}".into(),
    };
    bob.send(M::ItemEventMessage(item)).await.unwrap();
    for inbox in [&mut ib, &mut ic] {
        inbox
            .expect(WAIT, |m| matches!(m, Incoming::Sub(Sub::ItemEventMessage(i)) if i.item_id == 7).then_some(()))
            .await
            .unwrap();
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
    ib.expect(WAIT, |m| {
        matches!(m, Incoming::Top(Top::MeetingInvitationRequestReceivedMessage(r)) if r.sender_name == "Alice")
            .then_some(())
    })
    .await
    .unwrap();
    alice
        .send(M::MeetingInvitationRequestMessage(pb::MeetingInvitationRequestMessage {
            receiver_user_uuid: bob_uuid.clone(),
            receiver_user_id: None,
        }))
        .await
        .unwrap();
    ia.expect(WAIT, |m| matches!(m, Incoming::Top(Top::MeetingInvitationRequestTooHighMessage(_))).then_some(()))
        .await
        .unwrap();
}

#[tokio::test]
async fn map_storage_serves_with_and_without_path_prefix_and_the_protocol_hash_is_exposed() {
    let (server, maps) =
        start_with(&[("SECRET_KEY", "test"), ("PATH_PREFIX", "/map-storage/"), ("API_VERSION_HASH", "d2d82672")]).await;
    let http = reqwest::Client::new();
    assert_eq!(http.get(format!("{maps}/map-storage/ping")).send().await.unwrap().status(), 200);
    // The proxy usually strips the prefix (contrib/docker/tests/docker-compose.server.yaml).
    assert_eq!(http.get(format!("{maps}/ping")).send().await.unwrap().status(), 200);
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
                        return axum::Json(
                            serde_json::json!({"status": "error", "type": "error", "code": "USER_BANNED",
                            "title": "Banned", "subtitle": "", "details": "You were banned", "image": ""}),
                        );
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
        .route(
            "/api/map",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({"group": "acme", "mapUrl": "http://maps.test/m.json"}))
            }),
        );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await });
    (url, seen)
}

#[tokio::test]
async fn with_an_admin_the_room_access_decides_who_enters_and_as_whom() {
    let config =
        Config::load(Env::new([("SECRET_KEY", "test")].iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()))
            .unwrap();
    let mut state = AppState::new(config);
    let (admin_url, seen) = fake_admin().await;
    state.admin =
        Some(wa_server::admin_api::AdminApi::with(&admin_url, "tok", serde_json::json!({}), reqwest::Client::new()));
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
        token: None,
    })
    .await;
    let Err(e) = refused else { panic!("a refused user must not enter") };
    assert!(format!("{e:?}").contains("You were banned") || format!("{e:?}").contains("closed"), "{e:?}");
}

#[tokio::test]
async fn each_tenant_has_its_own_maps_under_the_same_paths() {
    let dir = std::env::temp_dir().join(format!("wa-rust-tenants-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let (_server, maps) = start_with(&[
        ("SECRET_KEY", "test"),
        ("STORAGE_DIRECTORY", dir.to_str().unwrap()),
        ("USE_DOMAIN_NAME_IN_PATH", "true"),
        ("ENABLE_BEARER_AUTHENTICATION", "true"),
        ("AUTHENTICATION_TOKEN", "admin-token"),
    ])
    .await;
    let http = reqwest::Client::new();
    let wam = |name: &str| {
        format!(
            r#"{{"version":"2.1.0","mapUrl":"./m.tmj","areas":[],"entities":{{}},"entityCollections":[],"metadata":{{"name":"{name}"}}}}"#
        )
    };
    // The admin writes for a tenant with X-Forwarded-Host (or X-Map-Storage-Host).
    for (host, header, name) in
        [("acme.maps.test", "x-forwarded-host", "Acme"), ("globex.maps.test", "x-map-storage-host", "Globex")]
    {
        let r = http
            .put(format!("{maps}/maps/m.wam"))
            .bearer_auth("admin-token")
            .header(header, host)
            .header("content-type", "application/octet-stream")
            .body(wam(name))
            .send()
            .await
            .unwrap();
        assert!(r.status().is_success(), "{host}: {}", r.status());
    }
    assert!(dir.join("acme.maps.test/maps/m.wam").exists() && dir.join("globex.maps.test/maps/m.wam").exists());
    // Each one reads its own, by its host.
    for (host, name) in [("acme.maps.test", "Acme"), ("globex.maps.test:443", "Globex")] {
        let got: serde_json::Value =
            http.get(format!("{maps}/maps/m.wam")).header("host", host).send().await.unwrap().json().await.unwrap();
        assert_eq!(got["metadata"]["name"], name, "{host}");
        let list: serde_json::Value =
            http.get(format!("{maps}/maps")).header("host", host).send().await.unwrap().json().await.unwrap();
        assert_eq!(list["maps"].as_object().unwrap().keys().collect::<Vec<_>>(), ["maps/m.wam"], "{host}");
        assert_eq!(list["maps"]["maps/m.wam"]["metadata"]["name"], name);
    }
    // Nothing of a tenant for a host without maps, and no way out of a tenant's folder.
    let other = http.get(format!("{maps}/maps/m.wam")).header("host", "initech.maps.test").send().await.unwrap();
    assert_eq!(other.status(), 404);
    let escape =
        http.get(format!("{maps}/maps/m.wam")).header("x-forwarded-host", "acme.maps.test/..").send().await.unwrap();
    assert_eq!(escape.status(), 400);
    let _ = std::fs::remove_dir_all(&dir);
}

async fn next<
    S: futures_util::Stream<
            Item = Result<tokio_tungstenite::tungstenite::Message, tokio_tungstenite::tungstenite::Error>,
        > + Unpin,
>(
    admin: &mut S,
) -> serde_json::Value {
    use futures_util::StreamExt;
    let Ok(Some(Ok(tokio_tungstenite::tungstenite::Message::Text(t)))) = tokio::time::timeout(WAIT, admin.next()).await
    else {
        panic!("no admin event")
    };
    serde_json::from_str(&t).unwrap()
}

#[tokio::test]
async fn the_admin_socket_watches_rooms_and_bans_from_a_whole_world() {
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::tungstenite::Message;
    let server = start_with(&[("SECRET_KEY", "test"), ("ADMIN_SOCKETS_TOKEN", "sockets-secret")]).await.0;
    let room = "http://play.test/@/acme/world/lobby";
    let (_alice, _ia) = bot(&server, room, "Alice", 100, 100).await;

    let ws = format!("{}/ws/admin/rooms", server.replacen("http", "ws", 1));
    let (mut admin, _) = tokio_tungstenite::connect_async(&ws).await.unwrap();
    let jwt = wa_server::jwt::sign("sockets-secret", &serde_json::json!({"authorizedRoomIds": [room]}));
    let listen = serde_json::json!({"event": "listen", "roomIds": [room], "jwt": jwt}).to_string();
    admin.send(Message::Text(listen.into())).await.unwrap();
    // Who is there already, then who comes.
    let first = next(&mut admin).await;
    assert_eq!(
        (first["type"].as_str(), first["data"]["name"].as_str(), first["data"]["roomId"].as_str()),
        (Some("MemberJoin"), Some("Alice"), Some(room))
    );
    let (_bob, mut ib) = bot(&server, room, "Bob", 3000, 3000).await;
    let second = next(&mut admin).await;
    assert_eq!(second["data"]["name"], "Bob");
    let bob_uuid = second["data"]["uuid"].as_str().unwrap().to_owned();

    // A ban for the world reaches the rooms of that world the token covers.
    let ban = serde_json::json!({"event": "banned", "world": "world", "message": {"userUuid": bob_uuid, "message": "Spam"}, "jwt": jwt});
    admin.send(Message::Text(ban.to_string().into())).await.unwrap();
    let banned = ib
        .expect(WAIT, |m| match m {
            Incoming::Top(Top::BanUserMessage(b)) => Some((b.r#type.clone(), b.message.clone())),
            _ => None,
        })
        .await
        .unwrap();
    assert_eq!(banned, ("banned".to_owned(), "Spam".to_owned()));
    assert_eq!(next(&mut admin).await["type"], "MemberLeave");

    // A room the token does not cover: refused, the socket closed (1008).
    let other = serde_json::json!({"event": "listen", "roomIds": ["http://play.test/@/other/w/r"], "jwt": jwt});
    admin.send(Message::Text(other.to_string().into())).await.unwrap();
    assert_eq!(next(&mut admin).await["type"], "Error");
    let closed = tokio::time::timeout(WAIT, admin.next()).await.unwrap();
    assert!(matches!(closed, Some(Ok(Message::Close(Some(ref f)))) if u16::from(f.code) == 1008), "{closed:?}");
}

/// An admin that takes analytics: each batch's events are kept, and a batch with an event marked "bad" is
/// refused (422), as the admin's validation would.
async fn analytics_admin() -> (String, std::sync::Arc<parking_lot::Mutex<Vec<serde_json::Value>>>) {
    let got = std::sync::Arc::new(parking_lot::Mutex::new(Vec::new()));
    let log = got.clone();
    let app = axum::Router::new()
        .route(
            "/api/room/access",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "status": "ok", "email": null, "visitCardUrl": null, "userUuid": "uuid-a", "tags": ["member"], "isCharacterTexturesValid": true,
                    "characterTextures": [], "isCompanionTextureValid": true, "world": "acme", "userRoomToken": "", "canEdit": false,
                }))
            }),
        )
        .route(
            "/api/analytics/events-batch",
            axum::routing::post(move |headers: axum::http::HeaderMap, axum::Json(batch): axum::Json<serde_json::Value>| {
                let log = log.clone();
                async move {
                    assert_eq!(headers["authorization"], "Bearer tok");
                    let events = batch["events"].as_array().cloned().unwrap_or_default();
                    if events.iter().any(|e| e["properties"]["bad"] == true) {
                        return axum::http::StatusCode::UNPROCESSABLE_ENTITY;
                    }
                    log.lock().extend(events);
                    axum::http::StatusCode::ACCEPTED
                }
            }),
        );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await });
    (url, got)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn analytics_reach_the_admin_signed_checked_and_with_the_connection_session() {
    use pb::client_to_server_message::Message as M;
    let vars =
        [("SECRET_KEY", "test"), ("ANALYTICS_FLUSH_INTERVAL_MS", "100"), ("CLIENT_DISCONNECTION_RETENTION_MS", "0")];
    let config = Config::load(Env::new(vars.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())).unwrap();
    let mut state = AppState::new(config);
    let (admin_url, got) = analytics_admin().await;
    let caps = serde_json::json!({"api/analytics/events-batch": "v1"});
    let admin = wa_server::admin_api::AdminApi::with(&admin_url, "tok", caps, reqwest::Client::new());
    state.analytics = wa_server::analytics::Analytics::new(&state.config, &admin, reqwest::Client::new());
    state.analytics.as_ref().unwrap().spawn(&state.config);
    state.admin = Some(admin);
    let play = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let server = format!("http://{}", play.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(play, router(state)).await });

    let (mut alice, _ia) = bot(&server, "http://play.test/@/acme/world/lobby", "Alice", 100, 100).await;
    let event = |name: &str, source: &str, id: &str, props: serde_json::Value| pb::AnalyticsEventMessage {
        event_name: name.into(),
        source: source.into(),
        client_event_time_ms: 1_760_000_000_000,
        event_id: id.into(),
        properties: Some(wa_server::wire::json_to(&props)),
    };
    let events = vec![
        event("onboarding.woka_validated", "front", "e1", serde_json::json!({"scene": "woka"})),
        // Signed by the server only, unknown, refused by the admin: none of them is stored.
        event("user.connected", "front", "e2", serde_json::json!({})),
        event("no.such.event", "front", "e3", serde_json::json!({})),
        event("onboarding.woka_validated", "front", "e4", serde_json::json!({"scene": "x", "bad": true})),
        event(
            "timed_event.open",
            "front",
            "o",
            serde_json::json!({"handle": "h1", "eventName": "cowebsite.closed", "properties": {"kind": "website"}}),
        ),
        event("timed_event.close", "front", "c", serde_json::json!({"handle": "h1", "endReason": "left_area"})),
    ];
    alice.send(M::AnalyticsEventReportMessage(pb::AnalyticsEventReportMessage { events })).await.unwrap();
    alice.close().await;

    let names =
        || got.lock().iter().map(|e| e["eventName"].as_str().unwrap_or_default().to_owned()).collect::<Vec<_>>();
    let deadline = std::time::Instant::now() + WAIT;
    while !names().contains(&"user.disconnected".to_owned()) && std::time::Instant::now() < deadline {
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    let mut seen = names();
    seen.sort();
    assert_eq!(
        seen,
        ["cowebsite.closed", "cowebsite.opened", "onboarding.woka_validated", "user.connected", "user.disconnected"]
    );
    let all = got.lock().clone();
    let by = |n: &str| all.iter().find(|e| e["eventName"] == n).unwrap().clone();
    let front = by("onboarding.woka_validated");
    assert_eq!(
        (front["source"].as_str(), front["userUuid"].as_str(), front["world"].as_str()),
        (Some("front"), Some("uuid-a"), Some("acme"))
    );
    assert_eq!(front["clientEventTime"], "2025-10-09T08:53:20.000Z");
    assert_eq!(front["spaceUserId"], format!("{}_{}", front["roomId"].as_str().unwrap(), front["userId"]));
    let closed = by("cowebsite.closed");
    assert_eq!(
        (closed["source"].as_str(), closed["properties"]["endReason"].as_str()),
        (Some("pusher"), Some("closed_by_client"))
    );
    assert_eq!(closed["properties"]["kind"], "website");
    let session = by("user.disconnected");
    assert_eq!(session["properties"]["disconnectReason"], "socket_closed");
    assert!(
        session["properties"]["durationSeconds"].is_u64() && session["properties"]["connectedAt"].is_string(),
        "{session}"
    );
}

#[tokio::test]
async fn an_admin_speaks_to_the_room_and_previews_a_ban_by_ip() {
    let config =
        Config::load(Env::new([("SECRET_KEY", "test")].iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()))
            .unwrap();
    let mut state = AppState::new(config);
    let (admin_url, _) = fake_admin().await;
    state.admin =
        Some(wa_server::admin_api::AdminApi::with(&admin_url, "tok", serde_json::json!({}), reqwest::Client::new()));
    let play = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let server = format!("http://{}", play.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(play, router(state)).await });
    let room = "http://play.test/@/acme/world/lobby";
    // The fake admin tags everyone "admin".
    let (mut alice, mut ia) = bot(&server, room, "Alice", 100, 100).await;
    let (_bob, mut ib) = bot(&server, room, "Bob", 3000, 3000).await;

    let global =
        pb::PlayGlobalMessage { r#type: "message".into(), content: "{\"ops\":[]}".into(), broadcast_to_world: false };
    alice.send(pb::client_to_server_message::Message::PlayGlobalMessage(global)).await.unwrap();
    let got = ib
        .expect(WAIT, |m| match m {
            Incoming::Top(Top::SendUserMessage(s)) => Some((s.r#type.clone(), s.message.clone())),
            _ => None,
        })
        .await
        .unwrap();
    assert_eq!(got, ("message".to_owned(), "{\"ops\":[]}".to_owned()));

    // Without a forwarded address the server does not know Bob's IP: nothing to ban by IP.
    let q = alice
        .query(pb::query_message::Query::BanIpPreviewQuery(pb::BanIpPreviewQuery {
            ban_user_uuid: "admin-uuid-1".into(),
        }))
        .await
        .unwrap();
    let answer = ia.expect(WAIT, answer_to(q)).await.unwrap();
    assert!(
        matches!(
            answer,
            pb::answer_message::Answer::BanIpPreviewAnswer(pb::BanIpPreviewAnswer { ip_known: false, .. })
        ),
        "{answer:?}"
    );
}

#[tokio::test]
async fn the_profile_pages_ask_the_provider_who_the_token_is() {
    // A provider that knows one access token.
    let provider = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", provider.local_addr().unwrap());
    let doc = serde_json::json!({
        "issuer": issuer, "authorization_endpoint": format!("{issuer}/auth"), "token_endpoint": format!("{issuer}/token"),
        "userinfo_endpoint": format!("{issuer}/userinfo"),
    });
    let app = axum::Router::new()
        .route("/.well-known/openid-configuration", axum::routing::get(move || async move { axum::Json(doc) }))
        .route(
            "/userinfo",
            axum::routing::get(|headers: axum::http::HeaderMap| async move {
                if headers["authorization"] != "Bearer good" {
                    return Err(axum::http::StatusCode::UNAUTHORIZED);
                }
                Ok(axum::Json(
                    serde_json::json!({"sub": "s", "email": "a@b.c", "name": "<b>Al</b>", "tags": ["admin", "x"]}),
                ))
            }),
        );
    tokio::spawn(async move { axum::serve(provider, app).await });
    let vars = [("SECRET_KEY", "test"), ("OPENID_CLIENT_ID", "c"), ("OPENID_CLIENT_ISSUER", issuer.as_str())];
    let server = start_with(&vars).await.0;
    let http = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).build().unwrap();

    let page = http.get(format!("{server}/profile?accessToken=good")).send().await.unwrap().text().await.unwrap();
    assert!(
        page.contains("a@b.c")
            && page.contains("admin, x")
            && page.contains("&lt;b&gt;Al&lt;")
            && page.contains(&issuer.replace('/', "&#x2F;")),
        "{page}"
    );
    assert_eq!(http.get(format!("{server}/profile?accessToken=bad")).send().await.unwrap().status(), 500);

    // Without an admin, the callback leads to that page.
    let claims =
        wa_server::jwt::Claims { identifier: "a@b.c".into(), access_token: Some("good".into()), ..Default::default() };
    let token = wa_server::jwt::create("test", claims);
    let r =
        http.get(format!("{server}/profile-callback?token={token}&playUri=http://play.test/r")).send().await.unwrap();
    assert_eq!(
        (r.status().as_u16(), r.headers()["location"].to_str().unwrap()),
        (302, "/profile?accessToken=good&playUri=http://play.test/r")
    );
    let r = http.get(format!("{server}/profile-callback?token=nope&playUri=x")).send().await.unwrap();
    assert_eq!(r.status(), 500);
}

#[tokio::test]
async fn only_the_page_service_worker_comes_from_the_front_container() {
    let front = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let front_url = format!("http://{}", front.local_addr().unwrap());
    let app = axum::Router::new().fallback(|| async { "from the front" });
    tokio::spawn(async move { axum::serve(front, app).await });
    let server = start_with(&[("SECRET_KEY", "test"), ("ASSETS_INTERNAL_URL", front_url.as_str())]).await.0;
    let get = |path: &'static str| {
        let url = format!("{server}{path}");
        async move { reqwest::get(url).await.unwrap() }
    };
    assert_eq!(get("/service-worker-prod.js").await.text().await.unwrap(), "from the front");
    for gone in ["/service-worker-dev.js", "/notification-service-worker.js"] {
        let r = get(gone).await;
        assert_ne!(r.text().await.unwrap(), "from the front", "{gone}");
    }
}

#[tokio::test]
async fn the_manifest_and_the_server_card_describe_this_server() {
    let server =
        start_with(&[("SECRET_KEY", "test"), ("PUSHER_URL", "http://play.test"), ("SERVER_NAME", "Ours")]).await.0;
    let http = reqwest::Client::new();
    let r = http
        .get(format!("{server}/manifest.json?url=http://play.test/_/global/maps.test/m.json"))
        .header("Host", "play.test")
        .send()
        .await
        .unwrap();
    assert_eq!(r.headers()["content-type"], "application/manifest+json; charset=utf-8");
    let m: serde_json::Value = r.json().await.unwrap();
    assert_eq!(
        (m["name"].as_str(), m["start_url"].as_str()),
        (Some("WorkAdventure"), Some("/_/global/maps.test/m.json"))
    );
    assert_eq!(m["icons"][0]["src"], "/static/images/favicons/icon-512x512.png");
    assert_eq!(http.get(format!("{server}/manifest.json")).send().await.unwrap().status(), 400);
    let card: serde_json::Value = http.get(format!("{server}/server.json")).send().await.unwrap().json().await.unwrap();
    assert_eq!((card["name"].as_str(), card["domain"].as_str()), (Some("Ours"), Some("http://play.test")));
    assert_eq!(card["icon"], "http://play.test/static/images/favicons/icon-512x512.png");
}

#[tokio::test]
async fn an_openid_login_needs_a_signed_id_token_with_this_logins_nonce() {
    // The provider signs its id_tokens with the client secret (HS256); `wrong` makes it send another nonce.
    let provider = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", provider.local_addr().unwrap());
    let nonce = std::sync::Arc::new(parking_lot::Mutex::new((String::new(), false)));
    let doc = serde_json::json!({
        "issuer": issuer, "authorization_endpoint": format!("{issuer}/auth"), "token_endpoint": format!("{issuer}/token"),
        "userinfo_endpoint": format!("{issuer}/userinfo"), "jwks_uri": format!("{issuer}/jwks"),
    });
    let (iss, n) = (issuer.clone(), nonce.clone());
    let app = axum::Router::new()
        .route("/.well-known/openid-configuration", axum::routing::get(move || async move { axum::Json(doc) }))
        .route(
            "/token",
            axum::routing::post(move || {
                let (iss, n) = (iss.clone(), n.clone());
                async move {
                    let (nonce, wrong) = n.lock().clone();
                    let claims = serde_json::json!({"iss": iss, "aud": "c", "sub": "s", "exp": wa_server::jwt::now_secs() + 300,
                        "nonce": if wrong { "other".to_owned() } else { nonce }});
                    let id_token = jsonwebtoken::encode(&jsonwebtoken::Header::default(), &claims, &jsonwebtoken::EncodingKey::from_secret(b"sec")).unwrap();
                    axum::Json(serde_json::json!({"access_token": "good", "id_token": id_token, "token_type": "Bearer"}))
                }
            }),
        )
        .route("/userinfo", axum::routing::get(|| async { axum::Json(serde_json::json!({"sub": "s", "email": "a@b.c"})) }));
    tokio::spawn(async move { axum::serve(provider, app).await });

    let play = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let server = format!("http://{}", play.local_addr().unwrap());
    let vars = [
        ("SECRET_KEY", "test"),
        ("OPENID_CLIENT_ID", "c"),
        ("OPENID_CLIENT_SECRET", "sec"),
        ("OPENID_CLIENT_ISSUER", issuer.as_str()),
        ("PUSHER_URL", server.as_str()),
    ];
    let config = Config::load(Env::new(vars.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())).unwrap();
    let state = AppState::new(config);
    tokio::spawn(async move { axum::serve(play, router(state)).await });
    let http = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).build().unwrap();
    let play_uri = format!("{server}/_/global/maps.test/m.json");

    let login = || async {
        let r = http.get(format!("{server}/login-screen")).query(&[("playUri", &play_uri)]).send().await.unwrap();
        let location = reqwest::Url::parse(r.headers()["location"].to_str().unwrap()).unwrap();
        let param = |k: &str| location.query_pairs().find(|(n, _)| n == k).map(|(_, v)| v.into_owned()).unwrap();
        let cookies: Vec<String> = r
            .headers()
            .get_all("set-cookie")
            .iter()
            .map(|c| c.to_str().unwrap().split(';').next().unwrap().to_owned())
            .collect();
        (param("state"), param("nonce"), cookies.join("; "))
    };
    let callback = |state: String, cookies: String| {
        let http = http.clone();
        let url = format!("{server}/openid-callback?code=x&state={state}");
        async move { http.get(url).header("Cookie", cookies).send().await.unwrap() }
    };

    let (st, n, cookies) = login().await;
    *nonce.lock() = (n.clone(), false);
    let ok = callback(st, cookies.clone()).await;
    assert_eq!(ok.status(), 302, "{:?}", ok.text().await);
    assert!(ok.headers()["location"].to_str().unwrap().starts_with(&format!("{play_uri}?token=")));
    // The verifier is sealed: not in clear in the cookie.
    assert!(!cookies.contains(&n), "{cookies}");

    // Another nonce, or a cookie the browser changed: refused.
    let (st, n, cookies) = login().await;
    *nonce.lock() = (n, true);
    assert_eq!(callback(st.clone(), cookies.clone()).await.status(), 500);
    let tampered = cookies.replacen("code_verifier=", "code_verifier=A", 1);
    nonce.lock().1 = false;
    assert_eq!(callback(st.clone(), tampered).await.status(), 500);
    // Without the state cookie: refused too.
    let no_state: Vec<&str> = cookies.split("; ").filter(|c| !c.starts_with("oidc_state=")).collect();
    assert_eq!(callback(st, no_state.join("; ")).await.status(), 500);
}

/// A provider whose access tokens expire: only `fresh` is accepted, and the refresh token `r1` gets it, rotated to
/// `r2`. It records what is revoked.
async fn expiring_provider() -> (String, std::sync::Arc<parking_lot::Mutex<Vec<String>>>) {
    let provider = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", provider.local_addr().unwrap());
    let doc = serde_json::json!({
        "issuer": issuer, "authorization_endpoint": format!("{issuer}/auth"), "token_endpoint": format!("{issuer}/token"),
        "userinfo_endpoint": format!("{issuer}/userinfo"), "revocation_endpoint": format!("{issuer}/revoke"),
    });
    let revoked = std::sync::Arc::new(parking_lot::Mutex::new(Vec::new()));
    let log = revoked.clone();
    let app = axum::Router::new()
        .route("/.well-known/openid-configuration", axum::routing::get(move || async move { axum::Json(doc) }))
        .route(
            "/userinfo",
            axum::routing::get(|headers: axum::http::HeaderMap| async move {
                if headers["authorization"] != "Bearer fresh" {
                    return Err(axum::http::StatusCode::UNAUTHORIZED);
                }
                Ok(axum::Json(serde_json::json!({"sub": "s", "email": "a@b.c", "username": "New", "tags": ["member"]})))
            }),
        )
        .route(
            "/token",
            axum::routing::post(|body: String| async move {
                if body != "grant_type=refresh_token&refresh_token=r1" {
                    return Err(axum::http::StatusCode::BAD_REQUEST);
                }
                Ok(axum::Json(
                    serde_json::json!({"access_token": "fresh", "refresh_token": "r2", "token_type": "Bearer"}),
                ))
            }),
        )
        .route(
            "/revoke",
            axum::routing::post(move |body: String| {
                let log = log.clone();
                async move { log.lock().push(body) }
            }),
        );
    tokio::spawn(async move { axum::serve(provider, app).await });
    (issuer, revoked)
}

#[tokio::test]
async fn an_expired_openid_access_token_is_renewed_before_the_admin_call_with_fresh_claims_and_revoked_on_logout() {
    let (issuer, revoked) = expiring_provider().await;
    let (admin_url, seen) = fake_admin().await;
    let vars = [
        ("SECRET_KEY", "test"),
        ("OPENID_CLIENT_ID", "c"),
        ("OPENID_CLIENT_ISSUER", issuer.as_str()),
        ("OPENID_ACCESS_TYPE", "offline"),
        ("PUSHER_URL", "http://play.test"),
    ];
    let serve = |with_admin: bool| {
        let config =
            Config::load(Env::new(vars.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())).unwrap();
        let mut state = AppState::new(config);
        if with_admin {
            state.admin = Some(wa_server::admin_api::AdminApi::with(
                &admin_url,
                "tok",
                serde_json::json!({}),
                reqwest::Client::new(),
            ));
        }
        async move {
            let play = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let server = format!("http://{}", play.local_addr().unwrap());
            tokio::spawn(async move { axum::serve(play, router(state)).await });
            server
        }
    };
    let http = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).build().unwrap();
    let play_uri = "http://play.test/_/global/maps.test/m.json";
    let token = |refresh: Option<&str>| {
        wa_server::jwt::create(
            "test",
            wa_server::jwt::Claims {
                identifier: "a@b.c".into(),
                access_token: Some("stale".into()),
                username: Some("Old".into()),
                tags: Some(vec!["admin".into()]),
                encrypted_refresh_token: refresh.map(|r| wa_server::oidc::seal("test", r)),
                ..Default::default()
            },
        )
    };
    let me = |server: String, token: String| {
        let http = http.clone();
        async move {
            http.get(format!("{server}/me"))
                .query(&[("token", token.as_str()), ("playUri", play_uri)])
                .send()
                .await
                .unwrap()
        }
    };

    // The login asks Google-style providers for a refresh token.
    let local = serve(false).await;
    let login = http.get(format!("{local}/login-screen")).query(&[("playUri", play_uri)]).send().await.unwrap();
    assert!(login.headers()["location"].to_str().unwrap().contains("access_type=offline"));

    // Refused access token, no refresh token: the auth token is no good.
    assert_eq!(me(local.clone(), token(None)).await.status(), 401);
    // With one: renewed, and the new auth token carries the provider's current claims, not the old tags.
    let r: serde_json::Value = me(local.clone(), token(Some("r1"))).await.json().await.unwrap();
    let renewed = wa_server::jwt::verify("test", r["authToken"].as_str().unwrap()).unwrap();
    assert_eq!(renewed.access_token.as_deref(), Some("fresh"));
    assert_eq!((renewed.username.as_deref(), renewed.tags.clone()), (Some("New"), Some(vec!["member".to_owned()])));
    assert_eq!(r["tags"], serde_json::json!(["member"]));
    assert!(!renewed.encrypted_refresh_token.as_deref().unwrap().contains("r2"), "sealed, not in clear");

    // With an admin, it gets the renewed access token, not the expired one.
    let with_admin = serve(true).await;
    let r = me(with_admin, token(Some("r1"))).await;
    assert_eq!(r.status(), 200);
    let asked = seen.lock().last().cloned().unwrap();
    assert!(asked.contains("accessToken=fresh"), "{asked}");

    // Logout revokes the access token and the (rotated) refresh token.
    let renewed_token = wa_server::jwt::create("test", renewed);
    let out = http
        .get(format!("{local}/logout"))
        .query(&[("playUri", play_uri), ("token", renewed_token.as_str())])
        .send()
        .await
        .unwrap();
    assert_eq!(out.status(), 302);
    assert_eq!(*revoked.lock(), ["token=fresh", "token=r2&token_type_hint=refresh_token"]);
}

#[tokio::test]
async fn a_wam_patch_is_read_like_body_parser_reads_json() {
    let dir = std::env::temp_dir().join(format!("wa-rust-patch-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let (_server, maps) = start_with(&[
        ("SECRET_KEY", "test"),
        ("STORAGE_DIRECTORY", dir.to_str().unwrap()),
        ("ENABLE_BEARER_AUTHENTICATION", "true"),
        ("AUTHENTICATION_TOKEN", "t"),
        ("BODY_PARSER_JSON_SIZE_LIMIT", "1kb"),
    ])
    .await;
    let http = reqwest::Client::new();
    let wam = r#"{"version":"2.1.0","mapUrl":"./m.tmj","areas":[],"entities":{},"entityCollections":[],"metadata":{"name":"a"}}"#;
    let put =
        http.put(format!("{maps}/m.wam")).bearer_auth("t").header("content-type", "application/octet-stream").body(wam);
    assert!(put.send().await.unwrap().status().is_success());
    let patch = |ty: &'static str, body: String| {
        http.patch(format!("{maps}/m.wam")).bearer_auth("t").header("content-type", ty).body(body).send()
    };
    let ops = r#"[{"op":"replace","path":"/metadata/name","value":"b"}]"#.to_owned();
    assert_eq!(patch("application/json-patch+json", ops.clone()).await.unwrap().status(), 200);
    assert_eq!(patch("application/json; charset=utf-8", ops.clone()).await.unwrap().status(), 200);
    // Another type is not read: no patch.
    assert_eq!(patch("text/plain", ops).await.unwrap().status(), 400);
    let big = format!(r#"[{{"op":"replace","path":"/metadata/name","value":"{}"}}]"#, "x".repeat(2048));
    assert_eq!(patch("application/json", big).await.unwrap().status(), 413);
    assert_eq!(patch("application/json", "\"a string\"".into()).await.unwrap().status(), 400);
}

#[tokio::test]
async fn the_debug_routes_of_the_back_answer_with_its_token() {
    let server = start_with(&[("SECRET_KEY", "test"), ("ADMIN_API_TOKEN", "t")]).await.0;
    let (_alice, _ia) = bot(&server, "http://play.test/_/global/maps.test/e2e.json", "Alice", 100, 100).await;
    let http = reqwest::Client::new();
    let dump = http.get(format!("{server}/dump?token=t")).send().await.unwrap().text().await.unwrap();
    assert!(dump.contains("\"name\":\"Alice\"") && dump.contains("\"roomUrl\""), "{dump}");
    assert_eq!(http.get(format!("{server}/dump?token=no")).send().await.unwrap().status(), 401);
    let close = |q: &str| http.post(format!("{server}/debug/close-space-connection?token=t{q}")).send();
    assert_eq!(close("").await.unwrap().status(), 400);
    assert_eq!(close("&spaceName=nowhere.none").await.unwrap().status(), 500);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn only_an_admin_kicks_and_forces_a_mute_in_a_space() {
    use pb::private_space_event::Event as P;
    let server = start().await;
    let room = "http://play.test/_/global/maps.test/e2e.json";
    let admin_token = wa_server::jwt::create(
        "test",
        wa_server::jwt::Claims {
            identifier: "admin@test".into(),
            tags: Some(vec!["admin".into()]),
            ..Default::default()
        },
    );
    let connect = |name: &str, token: Option<String>, x: i32| {
        Bot::connect(Options {
            server: server.clone(),
            room_url: room.into(),
            name: name.into(),
            x,
            y: 100,
            viewport: SCREEN,
            availability: 1,
            token,
        })
    };
    let (mut alice, sa) = connect("Alice", Some(admin_token), 100).await.unwrap();
    let (mut bob, sb) = connect("Bob", None, 3000).await.unwrap();
    let (mut ia, mut ib) = (Inbox::spawn(sa), Inbox::spawn(sb));
    for (bot, inbox) in [(&mut alice, &mut ia), (&mut bob, &mut ib)] {
        let q = bot.join_space("s", &[]).await.unwrap();
        inbox.expect(WAIT, answer_to(q)).await.unwrap();
    }
    let private = |to: String, e: P| {
        pb::client_to_server_message::Message::PrivateEvent(pb::PrivateEventFrontToPusher {
            space_name: "s".into(),
            receiver_user_id: to,
            space_event: Some(pb::PrivateSpaceEvent { event: Some(e) }),
        })
    };
    // Bob is no admin: his kick goes nowhere, his mute is a request.
    bob.send(private(alice.space_user_id(), P::KickOffUser(pb::KickOffUserPrivateMessage {}))).await.unwrap();
    bob.send(private(alice.space_user_id(), P::MuteAudio(pb::MuteAudioPrivateMessage { force: true }))).await.unwrap();
    let first = ia
        .expect(WAIT, |m| match private_event(m) {
            Some((_, P::KickOffUser(_))) => Some("kick"),
            Some((_, P::MuteAudio(a))) => Some(if a.force { "forced" } else { "asked" }),
            _ => None,
        })
        .await
        .unwrap();
    assert_eq!(first, "asked");
    // Alice is: both reach Bob, the mute forced.
    alice.send(private(bob.space_user_id(), P::MuteAudio(pb::MuteAudioPrivateMessage { force: false }))).await.unwrap();
    alice.send(private(bob.space_user_id(), P::KickOffUser(pb::KickOffUserPrivateMessage {}))).await.unwrap();
    let mute =
        ib.expect(WAIT, |m| matches!(private_event(m), Some((_, P::MuteAudio(a))) if a.force).then_some(())).await;
    assert!(mute.is_ok());
    let kick = ib.expect(WAIT, |m| matches!(private_event(m), Some((_, P::KickOffUser(_)))).then_some(())).await;
    assert!(kick.is_ok());
}

/// A Synapse that answers the admin's calls and keeps them, as "METHOD path [body]".
async fn fake_synapse() -> (String, std::sync::Arc<parking_lot::Mutex<Vec<String>>>) {
    use axum::extract::{OriginalUri, Request};
    let calls = std::sync::Arc::new(parking_lot::Mutex::new(Vec::new()));
    let log = calls.clone();
    let app = axum::Router::new().fallback(move |OriginalUri(uri): OriginalUri, req: Request| {
        let log = log.clone();
        async move {
            let method = req.method().clone();
            let body = axum::body::to_bytes(req.into_body(), 1 << 20).await.unwrap_or_default();
            let path = uri.path().to_owned();
            log.lock().push(format!("{method} {path} {}", String::from_utf8_lossy(&body)));
            let (status, answer) = match (method.as_str(), path.as_str()) {
                ("POST", "/_matrix/client/r0/login") => (200, serde_json::json!({"access_token": "admin-token"})),
                (_, p) if p.starts_with("/_matrix/client/r0/directory/room/") => {
                    (404, serde_json::json!({"errcode": "M_NOT_FOUND"}))
                }
                ("POST", "/_matrix/client/r0/createRoom") if body.windows(16).any(|w| w == b"creation_content") => {
                    (200, serde_json::json!({"room_id": "!folder:d"}))
                }
                ("POST", "/_matrix/client/r0/createRoom") => (200, serde_json::json!({"room_id": "!area:d"})),
                ("GET", p) if p.ends_with("/m.room.power_levels") => {
                    (200, serde_json::json!({"users": {"@admin:d": 100}}))
                }
                ("GET", p) if p.ends_with("/members") => (
                    200,
                    serde_json::json!({"chunk": [
                    {"state_key": "@admin:d", "content": {"membership": "join"}},
                    {"state_key": "@gone:d", "content": {"membership": "invite"}}]}),
                ),
                _ => (200, serde_json::json!({})),
            };
            (axum::http::StatusCode::from_u16(status).unwrap(), axum::Json(answer))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await });
    (url, calls)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn area_chat_rooms_are_made_in_synapse_and_players_go_in_and_out() {
    use pb::client_to_server_message::Message as M;
    let (synapse, calls) = fake_synapse().await;
    let vars = [
        ("SECRET_KEY", "test"),
        ("MATRIX_API_URI", synapse.as_str()),
        ("MATRIX_ADMIN_USER", "admin"),
        ("MATRIX_ADMIN_PASSWORD", "p"),
        ("MATRIX_DOMAIN", "d"),
        ("MAP_STORAGE_API_TOKEN", "ms"),
    ];
    let server = start_with(&vars).await.0;
    let http = reqwest::Client::new();
    let property = serde_json::json!({"id": "p1", "type": "matrixRoomPropertyData", "shouldOpenAutomatically": true,
        "displayName": "Lobby", "resourceUrl": format!("{server}/roomArea"), "serverData": {}});

    // map-storage creates the room, with its token only.
    assert_eq!(http.post(format!("{server}/roomArea")).json(&property).send().await.unwrap().status(), 401);
    let r = http.post(format!("{server}/roomArea")).header("authorization", "ms").json(&property).send().await.unwrap();
    assert_eq!(r.status(), 201);
    let created: serde_json::Value = r.json().await.unwrap();
    assert_eq!(created["serverData"]["matrixRoomId"], "!area:d");
    let mut renamed = created.clone();
    renamed["displayName"] = "Hall".into();
    let r = http.patch(format!("{server}/roomArea")).header("authorization", "ms").json(&renamed).send().await.unwrap();
    assert_eq!(r.status(), 200);
    let seen = calls.lock().join("\n");
    assert!(seen.contains("POST /_synapse/admin/v1/users/@admin:d/override_ratelimit"), "{seen}");
    assert!(seen.contains("PUT /_matrix/client/r0/rooms/!folder:d/state/m.space.child/!area:d"), "{seen}");
    assert!(seen.contains("PUT /_matrix/client/r0/rooms/!area:d/state/m.room.name {\"name\":\"Hall\"}"), "{seen}");
    assert_eq!(seen.matches("/login").count(), 1, "one login for every call: {seen}");

    // An admin of the world walks in: invited and moderator; leaving and closing kick them.
    let admin_token = wa_server::jwt::create(
        "test",
        wa_server::jwt::Claims { identifier: "a@test".into(), tags: Some(vec!["admin".into()]), ..Default::default() },
    );
    let (mut alice, stream) = Bot::connect(Options {
        server: server.clone(),
        room_url: "http://play.test/_/global/maps.test/e2e.json".into(),
        name: "Alice".into(),
        x: 100,
        y: 100,
        viewport: SCREEN,
        availability: 1,
        token: Some(admin_token),
    })
    .await
    .unwrap();
    let mut ia = Inbox::spawn(stream);
    let q = alice
        .query(pb::query_message::Query::EnterChatRoomAreaQuery(pb::EnterChatRoomAreaQuery {
            room_id: "!area:d".into(),
        }))
        .await
        .unwrap();
    // Without a chat id yet: refused.
    let refused = ia.expect(WAIT, answer_to(q)).await.unwrap();
    assert!(
        matches!(refused, pb::answer_message::Answer::Error(ref e) if e.message.contains("try again later")),
        "{refused:?}"
    );
    alice
        .send(M::UpdateChatIdMessage(pb::UpdateChatIdMessage { email: "a@test".into(), chat_id: "@a:d".into() }))
        .await
        .unwrap();
    let q = alice
        .query(pb::query_message::Query::EnterChatRoomAreaQuery(pb::EnterChatRoomAreaQuery {
            room_id: "!area:d".into(),
        }))
        .await
        .unwrap();
    let answer = ia.expect(WAIT, answer_to(q)).await.unwrap();
    assert!(matches!(answer, pb::answer_message::Answer::EnterChatRoomAreaAnswer(_)));
    let seen = calls.lock().join("\n");
    assert!(seen.contains("POST /_matrix/client/r0/rooms/!area:d/invite {\"user_id\":\"@a:d\"}"), "{seen}");
    assert!(seen.contains("\"@a:d\":50"), "{seen}");
    alice.send(M::LeaveChatRoomAreaMessage(pb::LeaveChatRoomAreaMessage { room_id: "!area:d".into() })).await.unwrap();
    let kicked = || calls.lock().iter().filter(|c| c.contains("/kick") && c.contains("@a:d")).count();
    let deadline = std::time::Instant::now() + WAIT;
    while kicked() == 0 && std::time::Instant::now() < deadline {
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
    assert_eq!(kicked(), 1);

    // Deleting the property: the room emptied of those not joined, then of the admin.
    let r =
        http.delete(format!("{server}/roomArea")).header("authorization", "ms").json(&renamed).send().await.unwrap();
    assert_eq!(r.status(), 204);
    let seen = calls.lock().join("\n");
    assert!(seen.contains("\"user_id\":\"@gone:d\""), "{seen}");
    assert!(seen.contains("kick {\"reason\":\"kick\",\"user_id\":\"@admin:d\"}"), "{seen}");
}
