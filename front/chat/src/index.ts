import "../style/index.scss";

import { HtmlUtils } from "./Utils/HtmlUtils";
import App from "./Components/App.svelte";
import { iframeListener } from "./IframeListener";

iframeListener.init();

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("main-container"),
});

export default app;
