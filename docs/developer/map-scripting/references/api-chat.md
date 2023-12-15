---
sidebar_position: 1
---

# Chat

### Open the chat window

```ts
WA.chat.open(): void
```

Open instantly the chat window.

Example:

```ts
WA.room.onEnterLayer('my_layer').subscribe(() => {
    WA.chat.open();
});
```

### Close the chat window

```ts
WA.chat.close(): void
```

Close instantly the chat window.

Example:

```ts
WA.room.onEnterLayer('my_layer').subscribe(() => {
    WA.chat.close();
});
```

### Sending a message in the chat

```
WA.chat.sendChatMessage(message: string, options: SendChatMessageOptions): void

interface SendLocalChatMessageOptions {
    scope: "local";
    author: string|undefined;
}

interface SendBubbleChatMessageOptions {
    scope: "bubble";
}

type SendChatMessageOptions = SendLocalChatMessageOptions | SendBubbleChatMessageOptions; 
```

Sends a message in the chat. Depending on the options, the message will be displayed only for the local user,
or visible for all users in the same bubble.

*   **message**: the message to be displayed in the chat
*   **options**: 
    * `{ scope: "local", author: "John Doe" }`: the message will be displayed only for the local user. You can pass an
    optional author name that will be displayed in the chat.
    * `{ scope: "bubble" }`: the message will be displayed for all users in the same bubble. It will seem to originate
    from the local user.

Example:

**Send a message to the local user only**
```ts
WA.chat.sendChatMessage('Hello world', { scope: 'local', author: 'Mr Robot' });
```

**Send a message to all users in the same bubble**
```ts
WA.chat.sendChatMessage('Hello world', { scope: 'bubble' });
```

:::note
There is an old signature of this function: `WA.chat.sendChatMessage(message: string, author: string): void`.
This signature could only send messages to the local user. This signature is deprecated and will be removed in the future.
:::

### Listening to messages from the chat

```ts
WA.chat.onChatMessage(callback: (message: string, options?: OnChatMessageOptions) => void): void

export interface OnChatMessageOptions {
    scope: "local" | "bubble";
}
```

Listens to messages coming from the chat. By default, this will listen only to messages coming from the local user.
You can use the `scope` option to listen to messages coming from all users in the same bubble.

*   **callback(message: string, event: { authorId: number|undefined, author: RemotePlayerInterface|undefined })**: the function that will be called when a message is received. It contains the message typed, and additional information from the author.
*   **options**: 
    * `{ scope: "local" }`: the callback will be called only when the local user types a message.
    * `{ scope: "bubble" }`: the callback will be called when any user in the same bubble types a message.

A note about the callback:

The first argument is the message typed. The second argument is an object containing information about the author of the message.

If `authorId` is undefined, the message comes from the local user. If `authorId` is defined, the message comes from another user in the same bubble. In this case, `author` MAY contain information about the remote user.
`author` will contain additional information ONLY if players tracking is enabled. See [the documentation about players tracking](./api-players.md) for more information.

Example:

```ts
WA.chat.onChatMessage((message => {
    console.log('The local user typed a message', message);
}));
```

```ts
// Let's configure player tracking to get additional data in the "author" field
await WA.players.configureTracking({
    players: true,
    movement: false,
});

WA.chat.onChatMessage(((message, event) => {
    console.log('Message received: ', message);
    console.log('Message author: ', event.author.name);
}), {
    scope: 'bubble'
});
```

### Emulating someone typing in the chat

In order to give the impression that someone is typing in the chat, you can trigger the "typing" indicator.

Use the following functions to trigger the "typing" indicator:

```ts
WA.chat.startTyping(options: SendLocalChatMessageOptions): void;
WA.chat.stopTyping(options: SendLocalChatMessageOptions): void;
```

#### Typing indicator for the local user

You can decide to display the "typing" indicator for the local user only, or for all users in the same bubble.

If you want to display the "typing" indicator for the local user only, you can optionally pass the author name:

```ts
// Let's pretend we start typing something
WA.chat.startTyping({ scope: 'local', author: 'John Doe' });

// After a while, let's send a message
setTimeout(() => {
    WA.chat.sendChatMessage('Hello world', { scope: 'local', author: 'John Doe' });
    WA.chat.stopTyping({ scope: 'local' });
}, 2000);
```

#### Typing indicator for the bubble

If you want to display the "typing" indicator for all users in the same bubble, you don't need to pass the author name
(because the author has to be you).

```ts
// Let's pretend we start typing something
WA.chat.startTyping({ scope: 'bubble' });

// After a while, let's send a message
setTimeout(() => {
    WA.chat.sendChatMessage('Hello world', { scope: 'bubble' });
    WA.chat.stopTyping({ scope: 'bubble' });
}, 2000);
```
