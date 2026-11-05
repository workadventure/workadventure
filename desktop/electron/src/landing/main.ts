import { mount } from "svelte";
import App from "./App.svelte";
import { navigation } from "./desktop";
import "./landing.css";

if (navigation) {
    mount(App, { target: document.body, props: { navigation } });
} else {
    console.error("Landing: WAD.navigation not exposed");
}
