import { mount } from "svelte";
import App from "./App.svelte";
import { api } from "./desktop";
// The Landing's look: the design system's tokens and fonts, and its background.
import "../landing/landing.css";

if (api) {
    mount(App, { target: document.body, props: { api } });
} else {
    console.error("Settings: WASettings not exposed");
}
