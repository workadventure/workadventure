import "phaser";
import "./front/style/index.scss";

import App from "./front/Components/App.svelte";
import { HtmlUtils } from "./front/WebRtc/HtmlUtils";

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("app"),
});
 export default app;
