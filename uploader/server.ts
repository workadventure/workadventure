import App from "./src/App";

const port = Number(process.env.UPLOADER_PORT) || 8080;
App.listen(port, () => {
    console.log(`WorkAdventure uploader starting on port ${port}!`);
})

export {}
