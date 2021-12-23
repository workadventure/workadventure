<!doctype html>
<html lang="en">
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    </head>
    <body>
        <button id="sendchat">Send chat message</button>
        <script>
            document.getElementById('sendchat').onclick = () => {
                WA.chat.sendChatMessage('Hello world!', 'Mr ROBOT');
            }
        </script>
        <div id="chatSent"></div>
        <script>
            window.addEventListener('load', () => {
                WA.chat.onChatMessage((message => {
                    const chatDiv = document.createElement('p');
                    chatDiv.innerText = message;
                    document.getElementById('chatSent').append(chatDiv);
                }));
            })
        </script>
    </body>
</html>
