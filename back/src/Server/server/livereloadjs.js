const loc = window.location;
let path;
if (loc.protocol === 'https:') {
  path = 'wss:';
} else {
  path = 'ws:';
}
path += '//' + loc.host + '/__sifrrLiveReload';

let ws,
  ttr = 500,
  timeout;

function newWsConnection() {
  ws = new WebSocket(path);
  ws.onopen = function() {
    ttr = 500;
    checkMessage();
    console.log('watching for file changes through sifrr-server livereload mode.');
  };
  ws.onmessage = function(event) {
    if (JSON.parse(event.data)) {
      console.log('Files changed, refreshing page.');
      location.reload();
    }
  };
  ws.onerror = e => {
    console.error('Webosocket error: ', e);
    console.log('Retrying after ', ttr / 4, 'ms');
    ttr *= 4;
  };
  ws.onclose = e => {
    console.error(`Webosocket closed with code \${e.code} error \${e.message}`);
  };
}

function checkMessage() {
  if (!ws) return;
  if (ws.readyState === WebSocket.OPEN) ws.send('');
  else if (ws.readyState === WebSocket.CLOSED) newWsConnection();

  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(checkMessage, ttr);
}

newWsConnection();
setTimeout(checkMessage, ttr);
