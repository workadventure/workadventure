import App from "../src/App"

const SERVER_PORT = parseInt(process.env.SERVER_PORT || "7373")

App.listen(SERVER_PORT)
    .then(() => console.log(`started on port ${SERVER_PORT}`))
    .catch((e) => console.error(e));
