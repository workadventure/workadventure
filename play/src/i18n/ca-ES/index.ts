import merge from "ts-deepmerge";
import en_US from "../en-US/index.ts";
import audio from "./audio.ts";
import camera from "./camera.ts";
import chat from "./chat.ts";
import companion from "./companion.ts";
import woka from "./woka.ts";
import error from "./error.ts";
import follow from "./follow.ts";
import login from "./login.ts";
import menu from "./menu.ts";
import report from "./report.ts";
import warning from "./warning.ts";
import trigger from "./trigger.ts";
import notification from "./notification.ts";
import cowebsite from "./cowebsite.ts";
import actionbar from "./actionbar.ts";
import video from "./video.ts";
import form from "./form.ts";
import say from "./say.ts";
import mapEditor from "./mapEditor.ts";
import externalModule from "./externalModule.ts";
import locate from "./locate.ts";
import area from "./area.ts";
import statusModal from "./statusModal.ts";
import messageScreen from "./messageScreen.ts";
import refreshPrompt from "./refreshPrompt.ts";
import megaphone from "./megaphone.ts";
import randomNames from "./randomNames.ts";
import onboarding from "./onboarding.ts";
import recording from "./recording.ts";

const ca_ES = merge(en_US, {
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
    warning,
    trigger,
    notification,
    cowebsite,
    actionbar,
    video,
    form,
    say,
    mapEditor,
    externalModule,
    locate,
    area,
    statusModal,
    messageScreen,
    refreshPrompt,
    megaphone,
    randomNames,
    onboarding,
    recording,
});

export default ca_ES;
