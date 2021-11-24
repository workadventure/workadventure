WA.onInit().then(() => {
  let message;

  WA.room.onEnterLayer("carpet").subscribe(() => {
    message = WA.ui.displayActionMessage({
      message:
        "This is a test message. Press space to display a chat message. Walk out to hide the message.",
      callback: () => {
        WA.chat.sendChatMessage("Hello world!", "The bot");
      },
    });
  });


  WA.room.onLeaveLayer("carpet").subscribe(() => {
    message && message.remove();
  });
});
