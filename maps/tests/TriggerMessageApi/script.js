WA.onInit().then(() => {
  let message;
  console.log('the right place!')

  WA.room.onEnterLayer("carpet").subscribe(() => {
    message = WA.ui.displayActionMessage({
      message:
        "This is a bis test message. Press space to display a chat message. Walk out to hide the message.",
      callback: () => {
        WA.chat.sendChatMessage("Hello world!", "The bot");
      },
    });
  });


  WA.room.onLeaveLayer("carpet").subscribe(() => {
    message && message.remove();
  });
});
