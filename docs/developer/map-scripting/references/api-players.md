---
sidebar_position: 1
---

# Players

Functions in the `WA.players` namespace can be used to listen to nearby users.

## Enabling players tracking

By default, your script will not receive data from the nearby users. This is done for performance reasons.

If you want to start listening to other users, the very first step is to call the `WA.players.configureTracking` method.

```typescript
await WA.players.configureTracking();
```

By default, this will track players entering / leaving the "nearby zone", track players movement and track players variable.
You can opt-out from tracking player movement (that can be resource intensive if there are hundreds of players) by using:

```typescript
await WA.players.configureTracking({
  players: true,
  movement: false,
});
```

## About the "nearby" zone

:::caution
WorkAdventure has an aggressive optimization mechanism where your client will only receive information from players
that are in the player's viewport (or in a zone near the current viewport). This means that from the scripting API,
you cannot listen to every user in a room. You can only listen to users that your player can actually see.
:::


## Getting a list of players around me

The `WA.players.list()` method returns a list of players around the current player character.

```typescript
WA.players.list(): IterableIterator<RemotePlayerInterface>
```

**Example:**
```javascript
await WA.players.configureTracking();
const players = WA.players.list();
for (const player of players) {
    console.log(`Player ${player.name} is near you`);
}
```

Objects returned by `list()` are of the type `RemotePlayer`.

## The RemotePlayer object

Remote players are represented by an object implementing the `RemotePlayerInterface`:

```typescript
interface RemotePlayerInterface {
    /**
     * A unique ID for this player. Each character on the map has a unique ID
     */
    readonly id: number;
    /**
     * The displayed name for this player
     */
    readonly name: string;
    /**
     * A unique ID for the user. Unlike the "id", 2 characters can have the same UUID if they belong to the same user
     * (i.e. if the same user logged twice using 2 different tabs)
     */
    readonly uuid: string;
    /**
     * The color of the outline around the player's name
     */
    readonly outlineColor: number | undefined;

    /**
     * The position of the current player, expressed in game pixels, relative to the top - left of the map.
     */
    readonly position: PlayerPosition;
    /**
     * A stream updated with the position of this current player.
     */
    readonly position$: Observable<PlayerPosition>;
    /**
     * An object storing players variables
     */
    readonly state: ReadOnlyState;
}
```

with:

```typescript
type PlayerPosition = {
    x: number,
    y: number,
}
```

## Getting a remote player by ID

Use `WA.players.get()` to fetch a unique remote player, by its ID.

```typescript
WA.players.get(id: number): RemotePlayerInterface | undefined;
```

**Example:**
```javascript
await WA.players.configureTracking();
const player = WA.players.get(1);
if (player !== undefined) {
    console.log(`Player 1 name is ${player.name}`);
}
```

## Tracking players in real-time

Getting a list of remote players is fine but most of the time, you will want to dynamically track players around you.

```typescript
WA.players.onPlayerEnters: Observable<RemotePlayerInterface>;
WA.players.onPlayerLeaves: Observable<RemotePlayerInterface>;
```

:::caution
The name might be a bit misleading. As explained in the [Enabling players tracking section](#enabling-players-tracking),
WorkAdventure only tracks players close to you. So `onPlayerEnters` will only be triggered when a remote player
is getting close to your viewport. Same thing for `onPlayerLeaves`. On a gigantic map, you cannot have the knowledge
of users entering the map that are far from you. You are however 100% sure that if the remote player can be seen
on the screen, the `onPlayerEnters` event was triggered.
:::

The `WA.players.onPlayerEnters` method returns an [RxJS `Observable` object](https://rxjs.dev/guide/observable). This is
an object on which you can add subscriptions using the `subscribe` method.

**Example:**

```typescript
await WA.players.configureTracking();
WA.players.onPlayerEnters.subscribe((player: RemotePlayerInterface) => {
    console.log(`Player ${player.name} entered your nearby zone`);
});
WA.players.onPlayerLeaves.subscribe((player: RemotePlayerInterface) => {
    console.log(`Player ${player.name} left your nearby zone`);
});
```

If you want to stop tracking rxJs subscriptions, the `subscribe()` function returns a `Subscription` object with an `unsubscribe()` method.

```javascript
const subscription = WA.players.onPlayerEnters.subscribe((player: RemotePlayerInterface) => {
    console.log(`Player ${player.name} entered your nearby zone`);
});

// Later:
subscription.unsubscribe();
```

## Tracking players movement

You can be notified of remote players movement using `WA.players.onPlayerMoves()` method.

```typescript
WA.players.onPlayerMoves(): Observable<RemotePlayerMoved>;
```

with:

```typescript
interface RemotePlayerMoved {
    player: RemotePlayerInterface;
    newPosition: PlayerPosition;
    oldPosition: PlayerPosition;
}
```

**Example:**

```typescript
await WA.players.configureTracking();
WA.players.onPlayerMoves().subscribe((event: RemotePlayerMoved) => {
    const player = event.player;
    const oldPosition = event.oldPosition;
    const newPosition = event.newPosition;
    console.log(`Player ${player.name} moved from ${oldPosition.x},${oldPosition.y} to ${newPosition.x},${newPosition.y}`);
});
```

:::info
For performance reasons, you are not notified of every pixel moves. The move event will be triggered
at most 5 times per second (about once every 200ms).
:::

## Remote players variables

Each remote player can have [a set of variables attached](../variables#player-variables).
Those variables can [only be set by the remote player itself, using the `WA.player` object from the scripting API.](api-player.md#player-specific-variables).

Only **public** player variables can be read by other players.
Those public variables are exposed in the `RemotePlayer.state` object.

Variables in `RemotePlayer.state` are read-only.

**Example:**
```javascript
await WA.players.configureTracking();
const players = WA.players.list();
for (const player of players) {
    console.log(`Player ${player.name} score is ${player.state.score}`);
}
```

## Listen to a remote player variable changes

You can also track a given remote player variable change using `RemotePlayer.state.onVariableChange`.

```typescript
RemotePlayer.state.onVariableChange(key: string): Observable<unknown>;
```

**Example:**
```javascript
// Assuming remotePlayer is a RemotePlayerInterface instance
// Let's listen to changes in the "score" variable:
remotePlayer.state.onVariableChange("score").subscribe((value: unknown) => {
    console.log(`Player ${remotePlayer.name} new score is ${value}`);
});
```

## Listen to a variable changes for all players

It is not uncommon to want to track the same variables for all remote players.
In this case, instead of subscribing to each and every player, WorkAdventure offers
a shortcut method:

```typescript
WA.players.onVariableChange(variableName: string): Observable<PlayerVariableChanged>
```

with:

```typescript
interface PlayerVariableChanged {
    player: RemotePlayer;
    value: unknown;
}
```

This will trigger an event containing a reference to the remote player and the new value
of the variable.

**Example:**
```javascript
WA.players.onVariableChange("score").subscribe((event: PlayerVariableChanged) => {
    console.log(`Player ${event.player.name} new score is ${event.value}`);
});
```

## Sending an event to a remote player

You can send an event to a remote player using the `WA.player.sendEvent` method.

```typescript
RemotePlayer.sendEvent(key: string, value: unknown): Promise<void>
```

Example:

```typescript
// Assuming remotePlayer is a RemotePlayerInterface instance
remotePlayer.sendEvent("my-event", "my payload");
```
