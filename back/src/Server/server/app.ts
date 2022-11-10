import { App as _App, AppOptions } from "uWebSockets.js";
import BaseApp from "./baseapp.js";
import { extend } from "./utils.js";
import { UwsApp } from "./types.js";

class App extends (<UwsApp>_App) {
    constructor(options: AppOptions = {}) {
        super(options); // eslint-disable-line constructor-super
        extend(this, new BaseApp());
    }
}

export default App;
