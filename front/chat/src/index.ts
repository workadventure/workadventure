import "../assets/scss/index.scss";

import { HtmlUtils } from "./Utils/HtmlUtils";
import App from "./Components/App.svelte";
import { iframeListener } from "./IframeListener";
import {setCurrentLocale} from "./i18n/locales";
import {Locales} from "./i18n/i18n-types";

await setCurrentLocale('fr-FR' as Locales);
iframeListener.init();

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("main-container"),
});

export default app;
