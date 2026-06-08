import "../style/index.scss";
import { mount } from "svelte";
import PictureInPictureLayoutTest from "./PictureInPictureLayoutTest.svelte";

const target = document.getElementById("pip-layout-test-root");
if (!target) {
    throw new Error("pip-layout-test-root introuvable");
}

mount(PictureInPictureLayoutTest, {
    target,
});
