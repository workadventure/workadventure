// let muted = false;

if (window?.WorkAdventureDesktopApi?.desktop) {
  (async () => {
    const servers = await window.WorkAdventureDesktopApi.getServers();
    servers.forEach((e) => {
      const server = document.createElement("div");
      server.innerText = e.name;
      server.onclick = () => {
        window.WorkAdventureDesktopApi.selectServer(e._id);
      };
      document.getElementById("servers").appendChild(server);
    });
  })();
}

document.getElementById("btn-reload").onclick = () => {
  location.reload();
};

// window?.WorkAdventureDesktopApi?.onMutedKeyPress((event) => {
//   if (muted) {
//     document.getElementById("demo").innerHTML =
//       "Ready to speak! Press ctrl-alt-m to mute.";
//   } else {
//     document.getElementById("demo").innerHTML =
//       "Muted! Press ctrl-alt-m to unmute again.";
//   }
//   muted = !muted;
// });

// document.getElementById("btn-api").onclick = () => {
//   window.WorkAdventureDesktopApi.notify("Hello from website");
// };
