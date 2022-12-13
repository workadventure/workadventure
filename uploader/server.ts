import App from "./src/App";

App.listen(8080)
    .then(() => console.log(`WorkAdventure uploader starting on port 8080!`))
    .catch((e) => console.error(e));

export {}
