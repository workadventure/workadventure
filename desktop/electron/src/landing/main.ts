import { mount } from "svelte";
import App from "./App.svelte";
import { navigation } from "./desktop";
import "./landing.css";

if (navigation) {
    // Straight into <body>: the page's `min-height: 100%` needs it as its parent.
    mount(App, { target: document.body, props: { navigation } });
} else {
    console.error("Landing: WAD.navigation not exposed");
}
