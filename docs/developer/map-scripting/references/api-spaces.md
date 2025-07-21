---
sidebar_position: 1
---

# Spaces

:::warning
This feature is experimental. The signature of the function might change in the future.
:::

## Understanding the concept of a space

A **space** is a data structure in WorkAdventure that allows you to group users from the same world, even if they are on different maps. Spaces let you start an audio/video conversation between users without entering a bubble or meeting room.

With the scripting API, you can join a space, be notified when users join or leave, and dynamically track information about group members.

## Joining a space

```ts
WA.spaces.joinSpace(spaceName: string, filterType: "everyone" | "streaming"): Space
```

Joins (or creates) a named space in the current world. All users joining the same `spaceName` in the same world will be grouped, even if they are on different maps.

- **spaceName**: Name of the space to join (scoped to the world)
- **filterType**:
  - `"everyone"`: All users in the space can talk to each other
  - `"streaming"`: Only some users (e.g., "streamers") are audible to others

Returns a `Space` object to interact with the space.

Example:

```ts
const space = WA.spaces.joinSpace("my-group", "everyone");
```

## The Space object

The object returned by `joinSpace` exposes the following properties and methods:

### Event Observables

- **userJoinedObservable**: [RxJS Observable](https://rxjs.dev/guide/observable#subscribing-to-observables) emitting a `SpaceUser` object whenever a new user joins the space.
- **userLeftObservable**: RxJS Observable emitting a `SpaceUser` object whenever a user leaves the space.

Example:

```ts
space.userJoinedObservable.subscribe((user) => {
  console.log("A new user joined the space:", user);
});

space.userLeftObservable.subscribe((user) => {
  console.log("A user left the space:", user);
});
```

:::note
As soon as the space is joined, you will receive the list of all users currently in the space through the `userJoinedObservable`
(even if they joined before you).
:::

### Methods

- **leave()**: Leaves the space. After calling this, the Space object should no longer be used.

  ```ts
  space.leave();
  ```

- **leave()**: Leaves the space. After calling this, the Space object should no longer be used.

  ```ts
  space.leave();
  ```

- **startStreaming()**: Starts streaming audio/video in the space. This is only available if the `filterType` is set to `"streaming"`.
  If the `filterType` is set to `"everyone"`, anyone starting a webcam or microphone will automatically be audible to all other users in the space.

  ```ts
  space.startStreaming();
  ```

- **stopStreaming()**: Stops streaming audio/video in the space. This is only available if the `filterType` is set to `"streaming"`.

  ```ts
  space.stopStreaming();
  ```

## The SpaceUser object

A `SpaceUser` represents a user in the space. It exposes the following properties:

```ts
interface SpaceUser {
    spaceUserId: string; // Unique identifier for the user in the space
    name: string; // Name of the user
    playUri: string; // URI of the map of the user
    isLogged: boolean; // Whether the user is logged in
    availabilityStatus: number; // Availability status of the user (e.g., online, away)
    tags: string[]; // Tags associated with the user
    cameraState: boolean; // Whether the user's camera is on
    microphoneState: boolean; // Whether the user's microphone is on
    screenSharingState: boolean; // Whether the user is sharing their screen
    megaphoneState: boolean; // Whether the user is currently streaming or not (important for "streaming" filterType)
    uuid: string; // Unique identifier for the user (UUID)
    chatID?: string; // Optional chat ID for the user, if available (e.g., for Matrix identifier)

    reactiveUser: { [key: string]: Observable<...> }; // Reactive properties of the user
}
```

About the reactive properties:

Use **reactiveUser** to get notified when any property of a user changes.

Example:

```ts
space.userJoinedObservable.subscribe((user) => {
  user.reactiveUser.availabilityStatus.subscribe((newStatus) => {
    console.log(`User ${user.name} has a new status: ${newStatus}`);
  });
});
```

:::warning
It is a good practice to unsubscribe from observables when they are no longer needed to avoid memory leaks.
:::

Example of unsubscribing:

```ts
const subscription = space.userJoinedObservable.subscribe((user) => {
  console.log("A new user joined the space:", user);
});

// Later, when you no longer need the subscription
subscription.unsubscribe();
```

## Notes

- A space is limited to the current world (users from another world cannot join the same space).
- The first user to join a space defines the `filterType` for all subsequent users. All users joining the space will need to pass the same `filterType` to connect to the space.
