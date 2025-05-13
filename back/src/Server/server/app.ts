import { App as _App, AppOptions } from "uWebSockets.js";
import BaseApp from "./baseapp";
import { extend } from "./utils";
import { UwsApp } from "./types";

class App extends (<UwsApp>_App) {
    constructor(options: AppOptions = {}) {
        super(options);
        extend(this, new BaseApp());
    }
}

export default App;
