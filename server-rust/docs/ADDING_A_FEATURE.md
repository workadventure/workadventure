# Adding a feature to the Rust server

The server is one process with three layers. Data flows the same way for every feature, so the easiest way to
learn where code goes is to follow one that exists. This page follows the **emote** (a player shows an emoji
above their Woka) from the WebSocket frame to the other players' screens, then gives a checklist.

## The layers

| Layer | Crate / files | Knows about | Never knows about |
|---|---|---|---|
| Core (the rules) | `crates/core` (`room.rs`, `space.rs`, `social.rs`, `meetings.rs`…) | users, positions, zones, bubbles, spaces, time as a number | sockets, protobuf, HTTP, Redis, tokio |
| Actors (one task per room, per space) | `crates/server/src/room_actor.rs`, `space_actor.rs` | the core object they own, the sessions in it, I/O started in other tasks | the bytes of the protocol |
| Adapters (the edges) | `ws.rs`, `session.rs`, `logic.rs`, `wire.rs`, `http.rs`, `admin_api.rs`, `livekit.rs`, `redis_store.rs`, `analytics.rs`… | protobuf, HTTP, Redis, the admin, LiveKit | the rules |

The core talks to the outside only through the small traits it declares itself: `room::Sink` and
`space::SpaceSink` (events out), `room::Clock` (time in). Tests give it a recording sink and a test clock, so a
20-second delay is tested by moving a number, not by waiting.

## One feature end to end: the emote

1. **The frame arrives.** `session.rs` reads WebSocket frames, decodes them into `ClientToServerMessage` and
   puts them in the session's inbox, in order. Nothing else happens on the reader task.
2. **The session's logic picks it up.** `logic.rs`, `Logic::handle`, one message at a time:

   ```rust
   M::EmotePromptMessage(m) => self.social(Social::Emote(m.emote)).await,
   ```

   `logic.rs` translates protocol into commands. It decides nothing about who sees what.
3. **The room actor runs the command.** `room_actor.rs`, `RoomCmd::Social { act: Social::Emote(emote) }`: it
   checks the input with the core's validator and calls the core:

   ```rust
   if wa_core::social::is_valid_emote(&emote) {
       room.emote(me, &emote, &mut Fanout::new(&mut sessions));
   }
   ```

4. **The core decides.** `core/src/room.rs`, `Room::emote`: the players who see the emitter's zone, the
   emitter excluded, get `Event::Emote(id, emote)` through the sink. That is the whole rule, and the whole of
   its test (`core/tests/room.rs`, `an_emote_reaches_who_sees_the_player_but_not_the_player`).
5. **The event becomes bytes.** The room actor's sink (`Fanout`) turns each `Event` into a protobuf frame
   (`wire::sub(Sub::EmoteEventMessage(…))`) once, and pushes the same bytes to each recipient's outbox. An
   outbox never blocks the room: a full one ends that session, not the room.
6. **Proof from outside.** `crates/server/tests/bots.rs`,
   `players_reach_each_other_by_events_follows_invitations_items_and_emotes`, connects real WebSocket bots
   (`crates/bot`) and checks that an invalid emote goes nowhere and a valid one reaches the other player.
   Then the Playwright specs of the repository run against the stack (`dev/dev test rust <spec>`).

## Where does my code go?

- **A rule** (who receives what, when something opens or closes, a limit): in the core, as a method on the
  object that owns the state, emitting events. If it needs time, take it from the `Clock` or as a parameter.
- **A new message from the front**: a match arm in `logic.rs` that builds a command, and the command in the
  owning actor. Keep the arm to translation.
- **A call to another service** (admin, LiveKit, S3, Synapse): a function in that service's adapter, started in
  its own task (`tokio::spawn`) with its result sent back to the actor as a command. An actor never awaits the
  network inside a command: everyone else in the room would wait too.
- **A new HTTP route**: in the module of its family (`front.rs`, `admin.rs`, `oidc.rs`, `map_storage/`…),
  added to that module's `routes()`.
- **Configuration**: the same variable name as the TypeScript server, read in `config.rs` (typed field) or
  from `config.raw` for a value a single adapter uses.

## Checklist

- [ ] The external contract does not change: same `messages.proto`, same routes, same variable names. If the
      TypeScript server does something odd, reproduce it and say so in a comment, or fix it and record the
      difference in `PARITY.md`.
- [ ] The rule is in `crates/core` and has a test there (recording sink, test clock).
- [ ] No `.await` on I/O inside an actor command.
- [ ] Input from the front or from another service is checked where it enters (sizes, types, rights).
- [ ] Failures are logged with `tracing` where they are swallowed; an error the client must see is answered.
- [ ] A scenario test in `crates/server/tests/` if the feature crosses several layers.
- [ ] `./verify.sh` is green (build, `clippy -D warnings`, tests) and `cargo fmt --all --check` passes.
- [ ] The Playwright specs of the feature pass on the stack: `dev/dev test rust tests/<spec>.ts`.
- [ ] `PARITY.md` (state and proof) and `JOURNAL.md` (what was done, what helped) are updated.
