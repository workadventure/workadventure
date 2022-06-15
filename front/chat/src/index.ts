import "../assets/scss/index.scss";

import { HtmlUtils } from "./Utils/HtmlUtils";
import App from "./Components/App.svelte";

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("main-container"),
});

export default app;
