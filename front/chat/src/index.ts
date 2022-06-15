import "../assets/scss/index.scss";

import { HtmlUtils } from "../../src/WebRtc/HtmlUtils";
import App from "./Components/App.svelte";

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("main-container"),
});

export default app;
