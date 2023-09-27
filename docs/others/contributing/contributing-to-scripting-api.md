# How to add new functions in the scripting API

This documentation is intended at contributors who want to participate in the development of WorkAdventure itself.
Before reading this, please be sure you are familiar with the [scripting API](https://workadventu.re/map-building/scripting.md).

The [scripting API](https://workadventu.re/map-building/scripting.md) allows map developers to add dynamic features in their maps.

## Why extend the scripting API?

The philosophy behind WorkAdventure is to build a platform that is as open as possible. Part of this strategy is to
offer map developers the ability to turn a WorkAdventures map into something unexpected, using the API. For instance,
you could use it to develop games (we have seen a PacMan and a mine-sweeper on WorkAdventure!)

We started working on the WorkAdventure scripting API with this in mind, but at some point, maybe you will find that
a feature is missing in the API. This article is here to explain to you how to add this feature.

## How to extend the scripting API?

Extending the scripting API means modifying the core of WorkAdventure. You can of course run these
modifications on your self-hosted instance.
But if you want to share it with the wider community, I strongly encourage you to start by [opening an issue](https://github.com/thecodingmachine/workadventure/issues)
on GitHub before starting the development. Check with the core maintainers that they are willing to merge your idea
before starting developing it. Once a new function makes it into the scripting API, it is very difficult to make it
evolve (or to deprecate), so the design of the function you add needs to be carefully considered.

## How does it work?

Scripts are executed in the browser, inside an iframe.

![](../images/scripting_1.svg)

The iframe allows WorkAdventure to isolate the script in a sandbox. Because the iframe is sandbox (or on a different
domain than the WorkAdventure server), scripts cannot directly manipulate the DOM of WorkAdventure. They also cannot
directly access Phaser objects (Phaser is the game engine used in WorkAdventure). This is by-design. Since anyone
can contribute a map, we cannot allow anyone to run any code in the scope of the WorkAdventure server (that would be
a huge XSS security flaw).

Instead, the only way the script can interact with WorkAdventure is by sending messages using the
[postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

![](../images/scripting_2.svg)

We want to make life easy for map developers. So instead of asking them to directly send messages using the postMessage
API, we provide a nice library that does this work for them. This library is what we call the "Scripting API" (we sometimes
refer to it as the "Client API").

The scripting API provides the global `WA` object.

## A simple example

So let's take an example with a sample script:

```typescript
WA.chat.sendChatMessage('Hello world!', 'John Doe');
```

When this script is called, the scripting API is dispatching a JSON message to WorkAdventure.

In our case, the `sendChatMessage` function looks like this:

**src/Api/Iframe/chat.ts**
```typescript
    sendChatMessage(message: string, author: string) {
        sendToWorkadventure({
            type: "chat",
            data: {
                message: message,
                author: author,
            },
        });
    }
```

The `sendToWorkadventure` function is a utility function that dispatches the message to the main frame.

In WorkAdventure, the message is received in the [`IframeListener` listener class](http://github.com/thecodingmachine/workadventure/blob/1e6ce4dec8697340e2c91798864b94da9528b482/front/src/Api/IframeListener.ts#L200-L203).
This class is in charge of analyzing the JSON messages received and dispatching them to the right place in the WorkAdventure application.

The message callback implemented in `IframeListener` is a giant (and disgusting) `if` statement branching to the correct
part of the code depending on the `type` property.

**src/Api/IframeListener.ts**
```typescript
// ...
    } else if (payload.type === "setProperty" && isSetPropertyEvent(payload.data)) {
        this._setPropertyStream.next(payload.data);
    } else if (payload.type === "chat" && isChatEvent(payload.data)) {
        scriptUtils.sendAnonymousChat(payload.data);
    } else if (payload.type === "openPopup" && isOpenPopupEvent(payload.data)) {
        this._openPopupStream.next(payload.data);
    } else if (payload.type === "closePopup" && isClosePopupEvent(payload.data)) {
// ...
```

In this particular case, we call `scriptUtils.sendAnonymousChat` that is doing the work of displaying the chat message.

## Scripting API entry point

The `WA` object originates from the scripting API. This script is hosted on the front server, at `https://[front_WA_server]/iframe_api.js.`.

The entry point for this script is the file `front/src/iframe_api.ts`.
All the other files dedicated to the iframe API are located in the `src/Api/iframe` directory.

## Utility functions to exchange messages

In the example above, we already saw you can easily send a message from the iframe to WorkAdventure using the
[`sendToWorkadventure`](http://github.com/thecodingmachine/workadventure/blob/ab075ef6f4974766a3e2de12a230ac4df0954b58/front/src/Api/iframe/IframeApiContribution.ts#L11-L13) utility function.

Of course, messaging can go the other way around and WorkAdventure can also send messages to the iframes.
We use the [`IFrameListener.postMessage`](http://github.com/thecodingmachine/workadventure/blob/ab075ef6f4974766a3e2de12a230ac4df0954b58/front/src/Api/IframeListener.ts#L455-L459) function for this.

Finally, there is a last type of utility function (a quite powerful one). It is quite common to need to call a function
from the iframe in WorkAdventure, and to expect a response. For those use cases, the iframe API comes with a
[`queryWorkadventure`](http://github.com/thecodingmachine/workadventure/blob/ab075ef6f4974766a3e2de12a230ac4df0954b58/front/src/Api/iframe/IframeApiContribution.ts#L30-L49) utility function.

## Types

The JSON messages sent over the postMessage API are strictly defined using Typescript types.
Those types are not defined using classical Typescript interfaces.

Indeed, Typescript interfaces only exist at compilation time but cannot be enforced on runtime. The postMessage API
is an entry point to WorkAdventure, and as with any entry point, data must be checked (otherwise, a hacker could
send specially crafted JSON packages to try to hack WA).

In WorkAdventure, we use the [zod](https://github.com/colinhacks/zod) package. This package
allows us to create interfaces AND custom type guards in one go.

Let's go back at our example. Let's have a look at the JSON message sent when we want to send a chat message from the API:

```typescript
sendToWorkadventure({
    type: "chat",
    data: {
        message: message,
        author: author,
    },
});
```

The "data" part of the message is defined in `front/src/Api/Events/ChatEvent.ts`:

```typescript
import { z } from "zod";

export const isChatEvent = z.object({
    message: z.string(),
    author: z.string(),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ChatEvent = z.infer<typeof isChatEvent>;
```

Using the zod library, we start by writing a type guard function (`isChatEvent`).
From this type guard, the library can automatically generate the `ChatEvent` type that we can refer in our code.

The advantage of this technique is that, **at runtime**, WorkAdventure can verify that the JSON message received
over the postMessage API is indeed correctly formatted.

If you are not familiar with Typescript type guards, you can read [an introduction to type guards in the Typescript documentation](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).

### Typing one way messages

For "one-way" messages (from the iframe to WorkAdventure), the `sendToWorkadventure` method expects the passed
object to be of type `IframeEvent<keyof IframeEventMap>`.

Note: I'd like here to thank @jonnytest1 for helping set up this type system. It rocks ;)

The `IFrameEvent` type is defined in `front/src/Api/Events/IframeEvent.ts`:

```typescript
export type IframeEventMap = {
    loadPage: LoadPageEvent;
    chat: ChatEvent;
    openPopup: OpenPopupEvent;
    closePopup: ClosePopupEvent;
    openTab: OpenTabEvent;
    // ...
    // All the possible messages go here
    // The key goes into the "type" JSON property
    // ...
};
export interface IframeEvent<T extends keyof IframeEventMap> {
    type: T;
    data: IframeEventMap[T];
}
```

Similarly, if you want to type messages from WorkAdventure to the iframe, there is a very similar `IframeResponseEvent`.

```typescript
export interface IframeResponseEventMap {
    userInputChat: UserInputChatEvent;
    enterEvent: EnterLeaveEvent;
    leaveEvent: EnterLeaveEvent;
    // ...
    // All the possible messages go here
    // The key goes into the "type" JSON property
    // ...
}
export interface IframeResponseEvent<T extends keyof IframeResponseEventMap> {
    type: T;
    data: IframeResponseEventMap[T];
}
```

### Typing queries (messages with answers)

If you want to add a new "query" (if you are using the `queryWorkadventure` utility function), you will need to
define the type of the query and the type of the response.

The signature of `queryWorkadventure` is:

```typescript
function queryWorkadventure<T extends keyof IframeQueryMap>(
    content: IframeQuery<T>
): Promise<IframeQueryMap[T]["answer"]>
```

Yes, that's a bit cryptic. Hopefully, all you need to know is that to add a new query, you need to edit the `iframeQueryMapTypeGuards`
array in `front/src/Api/Events/IframeEvent.ts`:

```typescript
export const iframeQueryMapTypeGuards = {
    openCoWebsite: {
        query: isOpenCoWebsiteEvent,
        answer: isCoWebsite,
    },
    getCoWebsites: {
        query: tg.isUndefined,
        answer: tg.isArray(isCoWebsite),
    },
    // ...
    // the `query` key points to the type guard of the query
    // the `answer` key points to the type guard of the response
};
```

### Responding to a query on the WorkAdventure side

In the WorkAdventure code, each possible query should be handled by what we call an "answerer".

Registering an answerer happens using the `iframeListener.registerAnswerer()` method.

Here is a sample:

```typescript
iframeListener.registerAnswerer("openCoWebsite", (openCoWebsiteEvent, source) => {
    // ...

    return /*...*/;
});
```

The `registerAnswerer` callback is passed the event, and should return a response (or a promise to the response) in the expected format
(the one you defined in the `answer` key of `iframeQueryMapTypeGuards`).

Important:

- there can be only one answerer registered for a given query type.
- if the answerer is not valid any more, you need to unregister the answerer using `iframeListener.unregisterAnswerer`.


## sendToWorkadventure VS queryWorkadventure

- `sendToWorkadventure` is used to send messages one way from the iframe to WorkAdventure. No response is expected. In particular
  if an error happens in WorkAdventure, the iframe will not be notified.
- `queryWorkadventure` is used to send queries that expect an answer. If an error happens in WorkAdventure (i.e. if an
  exception is raised), the exception will be propagated to the iframe.

Because `queryWorkadventure` handles exceptions properly, it can be interesting to use `queryWorkadventure` instead
of `sendToWorkadventure`, even for "one-way" messages. The return message type is simply `undefined` in this case.

