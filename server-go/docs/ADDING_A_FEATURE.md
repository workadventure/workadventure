# Adding a feature to server-go

How a feature crosses the layers, shown on one that already exists: **emotes** (a player shows an emoji above their
Woka; the players who see their zone receive it). Then the checklist for a new feature.

## The layers

```
browser ──WebSocket──▶ internal/ws (adapter: protobuf in, protobuf out)
                          │  calls a method of the core, with a core.Peer for "who"
                          ▼
                       internal/core (the rules: rooms, bubbles, spaces, variables…)
                          │  one actor per room/space: a goroutine that runs closures one at a time
                          │  answers by sending core events to Peers
                          ▼
                       internal/ws/codec.go (core event → protobuf, encoded once for every recipient)
```

- `internal/core` imports no transport: no `net/http`, no WebSocket, no protobuf, no Redis. What it needs from outside
  is a **port**: an interface declared in `core` (`Peer`, `LiveKit`, `Egress`), implemented in an adapter package.
- The room's state is only touched inside its actor (`r.a.Post(ctx, func() {...})`). No mutex in the core.
- Nothing slow runs inside the actor: no network, no disk. Do the I/O outside, then post the result back.

## The example, end to end

### 1. The contract: `messages/protos/messages.proto` (frozen)

The front already sends `EmotePromptMessage` and understands `EmoteEventMessage`. The protocol is shared with the
TypeScript front: a feature that needs a new message changes the `.proto`, the front, and `API_VERSION`.

### 2. The adapter decodes and calls the core: `internal/ws/session.go`

```go
case *pb.ClientToServerMessage_EmotePromptMessage:
    _ = s.room.Emote(ctx, s, msg.EmotePromptMessage.GetEmote())
```

The session itself is the `core.Peer` (`s`). The adapter turns protobuf into plain Go values; it holds no rule.

### 3. The rule lives in the core: `internal/core/roomevents.go`

```go
type EmoteEvent struct {
    ActorUserID int32
    Emote       string
}

func (r *Room) Emote(ctx context.Context, p Peer, emote string) error {
    if !validEmote(emote) { // checked before entering the actor: no shared state needed
        return nil
    }
    return r.a.Post(ctx, func() { // from here on, we are the only ones touching the room
        u := r.s.byPeer[p]
        if u == nil || u.zone == nil {
            return
        }
        m := NewMsg(EmoteEvent{ActorUserID: u.id, Emote: emote}, true)
        for l := range u.zone.listeners {
            l.peer.Send(m) // never blocks: each Peer has its own bounded outbox
        }
    })
}
```

- The event is a plain struct of the core, not a protobuf type.
- `NewMsg(..., true)` builds a message encoded **once**, then shared by every recipient.

### 4. The core event becomes protobuf: `internal/ws/codec.go`

```go
case core.EmoteEvent:
    return &pb.SubMessage{Message: &pb.SubMessage_EmoteEventMessage{
        EmoteEventMessage: &pb.EmoteEventMessage{ActorUserId: e.ActorUserID, Emote: e.Emote}}}
```

### 5. The test describes the behaviour: `internal/core/roomevents_test.go`

```go
func TestAnEmoteReachesThoseWhoSeeTheSenderAndOnlyIfItIsAnEmoji(t *testing.T) {
    r := NewRoom("http://play/_/global/maps/m.json", cfg)
    defer r.Stop()
    alice := join(t, r, "alice", at(100, 100), Viewport{Right: 400, Bottom: 400})
    near := join(t, r, "near", at(200, 200), Viewport{Right: 400, Bottom: 400})
    far := join(t, r, "far", at(1900, 1900), Viewport{Left: 1600, Top: 1600, Right: 2000, Bottom: 2000})
    ...
}
```

No WebSocket, no browser: fake peers (`join`) record what they receive. The name is a sentence that states the rule.

## Checklist for a new feature

1. **Contract.** Does the front already send and understand the messages? If not, the change starts in
   `messages.proto` and in the front, not here.
2. **Core.**
   - An event type (plain struct) for what the room sends back.
   - A method on `Room` or `Space`. It validates what it can without shared state, then `r.a.Post` the rest.
   - Need something from outside (storage, an API, LiveKit)? Declare a small interface in `core`, implement it in
     its own package under `internal/`, and wire it in `cmd/server/main.go`. Do the I/O outside the actor and post
     the result back, with the version it was computed on if the state may have changed meanwhile.
3. **Scenario test in `core`**, named as a sentence, with fake peers: the nominal case, who must *not* receive it,
   rights, invalid input.
4. **Adapter.** One `case` in `internal/ws/session.go` (decode, call the core) and one in `internal/ws/codec.go`
   (event → protobuf).
5. **HTTP instead of WebSocket?** A handler in `internal/httpapi` (or the package of that API) that calls the core
   the same way.
6. **Check.**
   - `./verify.sh`: gofmt, build, vet, `go test -race`.
   - The Playwright spec of the feature against the Go stack: `dev/dev test go tests/<spec>.spec.ts`.
   - `PARITY.md`: update the line of the feature, with its proof.

## Rules of thumb

- The core never imports `internal/pb`, `internal/ws`, `net/http` or a database client.
- One room, one actor: two rooms progress in parallel, one room processes its commands in order.
- A `Peer.Send` never blocks the room; a slow client is the outbox's problem, not the room's.
- When the TypeScript behaviour is a bug invisible to the client, fix it and write it down in `PARITY.md` rather than
  copying it.

> Planned refactors will change steps 4 and 2 (one method per message instead of the `switch` in
> `session.go`, a sealed `core.Event` interface instead of `any`): this guide is updated with them.
