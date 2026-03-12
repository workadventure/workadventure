import merge from "ts-deepmerge";
import en_US from "../en-US/index.ts";
import audio from "./audio.js";
import camera from "./camera.js";
import chat from "./chat.js";
import companion from "./companion.js";
import woka from "./woka.js";
import error from "./error.js";
import follow from "./follow.js";
import login from "./login.js";
import menu from "./menu.js";
import report from "./report.js";
import warning from "./warning.js";
import trigger from "./trigger.js";
import notification from "./notification.js";
import actionbar from "./actionbar.js";
import video from "./video.js";
import form from "./form.js";
import area from "./area.js";
import cowebsite from "./cowebsite.js";
import externalModule from "./externalModule.js";
import megaphone from "./megaphone.js";
import mapEditor from "./mapEditor.js";
import messageScreen from "./messageScreen.js";
import refreshPrompt from "./refreshPrompt.js";
import statusModal from "./statusModal.js";
import say from "./say.js";
import locate from "./locate.js";
import randomNames from "./randomNames.js";
import onboarding from "./onboarding.js";
import recording from "./recording.js";

const pt_BR = merge(en_US, {
    audio,
    camera,
    chat,
    area,
    companion,
    woka,
    error,
    follow,
    login,
    menu,
    report,
    warning,
    trigger,
    notification,
    actionbar,
    video,
    form,
    cowebsite,
    externalModule,
    megaphone,
    mapEditor,
    messageScreen,
    refreshPrompt,
    statusModal,
    say,
    locate,
    randomNames,
    onboarding,
    recording,
});

export default pt_BR;
