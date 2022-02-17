let muted = false;

if (window?.WorkAdventureDesktopApi?.desktop) {
  document.getElementById("demo").innerHTML =
    "Hello Desktop app! Press ctrl-alt-m to mute.";

  window?.WorkAdventureDesktopApi?.onMutedKeyPress((event) => {
    if (muted) {
      document.getElementById("demo").innerHTML =
        "Ready to speak! Press ctrl-alt-m to mute.";
    } else {
      document.getElementById("demo").innerHTML =
        "Muted! Press ctrl-alt-m to unmute again.";
    }
    muted = !muted;
  });
}

document.getElementById("btn-reload").onclick = () => {
  location.reload();
};

document.getElementById("btn-api").onclick = () => {
  window.WorkAdventureDesktopApi.notify("Hello from website");
};
