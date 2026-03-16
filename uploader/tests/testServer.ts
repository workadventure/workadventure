import App from "../src/App.ts"

const SERVER_PORT = parseInt(process.env.SERVER_PORT || "7373")

App.listen(SERVER_PORT, () => {
    console.log(`started on port ${SERVER_PORT}`)
});
