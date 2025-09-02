console.info("In ten seconds, the tuto banner will be launched");

function launchBanner() {
  console.info("Lunch banner");
  WA.ui.banner.openBanner({
    id: "banner-test",
    text: "Hello, this is a banner test for documentation example!",
    bgColor: "#000000",
    textColor: "#ffffff",
    closable: true,
    link: {
      label: "WorkAdventure ",
      url: "https://workadventu.re",
    },
  });

  setTimeout(() => {
    //WA.ui.banner.closeBanner()
  }, 2000);
}

setTimeout(() => {
  launchBanner();
}, 2000);
