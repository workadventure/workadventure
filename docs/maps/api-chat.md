{.section-title.accent.text-primary}
# API Chat functions reference

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
WA.chat.sendChatMessage(message: string, author: string): void
```

Sends a message in the chat. The message is only visible in the browser of the current user.

*   **message**: the message to be displayed in the chat
*   **author**: the name displayed for the author of the message. It does not have to be a real user.

Example:

```ts
WA.chat.sendChatMessage('Hello world', 'Mr Robot');
```

### Listening to messages from the chat

```ts
WA.chat.onChatMessage(callback: (message: string) => void): void
```

Listens to messages typed by the current user and calls the callback. Messages from other users in the chat cannot be listened to.

*   **callback**: the function that will be called when a message is received. It contains the message typed by the user.

Example:

```ts
WA.chat.onChatMessage((message => {
    console.log('The user typed a message', message);
}));
```
