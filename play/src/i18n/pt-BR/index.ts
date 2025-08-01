import merge from "ts-deepmerge";
import en_US from "../en-US";

import actionbar from "./actionbar";
import area from "./area";
import audio from "./audio";
import camera from "./camera";
import chat from "./chat";
import companion from "./companion";
import cowebsite from "./cowebsite";
import error from "./error";
import externalModule from "./externalModule";
import follow from "./follow";
import form from "./form";
import login from "./login";
import mapEditor from "./mapEditor";
import megaphone from "./megaphone";
import menu from "./menu";
import messageScreen from "./messageScreen";
import notification from "./notification";
import refreshPrompt from "./refreshPrompt";
import report from "./report";
import say from "./say";
import statusModal from "./statusModal";
import trigger from "./trigger";
import video from "./video";
import warning from "./warning";
import woka from "./woka";

const pt_BR = merge(en_US, {
    actionbar,
    area,
    audio,
    camera,
    chat,
    companion,
    cowebsite,
    error,
    externalModule,
    follow,
    form,
    login,
    mapEditor,
    megaphone,
    menu,
    messageScreen,
    notification,
    refreshPrompt,
    report,
    say,
    statusModal,
    trigger,
    video,
    warning,
    woka,
});

export default pt_BR;
