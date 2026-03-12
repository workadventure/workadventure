import merge from "ts-deepmerge";
import en_US from "../en-US/index.ts";
import audio from "./audio.js";
import camera from "./camera.js";
import chat from "./chat.js";
import companion from "./companion.js";
import error from "./error.js";
import follow from "./follow.js";
import login from "./login.js";
import menu from "./menu.js";
import report from "./report.js";
import warning from "./warning.js";
import woka from "./woka.js";
import trigger from "./trigger.js";
import notification from "./notification.js";
import cowebsite from "./cowebsite.js";
import actionbar from "./actionbar.js";
import mapEditor from "./mapEditor.js";
import megaphone from "./megaphone.js";
import video from "./video.js";
import statusModal from "./statusModal.js";
import area from "./area.js";
import externalModule from "./externalModule.js";
import form from "./form.js";
import refreshPrompt from "./refreshPrompt.js";
import say from "./say.js";
import messageScreen from "./messageScreen.js";
import locate from "./locate.js";
import randomNames from "./randomNames.js";
import onboarding from "./onboarding.js";
import recording from "./recording.js";

const ko_KR = merge(en_US, {
    area,
    audio,
    camera,
    chat,
    companion,
    woka,
    error,
    follow,
    login,
    menu,
    report,
    refreshPrompt,
    warning,
    trigger,
    notification,
    cowebsite,
    actionbar,
    mapEditor,
    megaphone,
    video,
    say,
    statusModal,
    externalModule,
    form,
    messageScreen,
    locate,
    randomNames,
    onboarding,
    recording,
});

export default ko_KR;
