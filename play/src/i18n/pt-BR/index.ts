import merge from "ts-deepmerge";
import en_US from "../en-US";
import audio from "./audio";
import camera from "./camera";
import chat from "./chat";
import companion from "./companion";
import woka from "./woka";
import error from "./error";
import follow from "./follow";
import login from "./login";
import menu from "./menu";
import report from "./report";
import warning from "./warning";
import trigger from "./trigger";
import notification from "./notification";
import actionbar from "./actionbar";
import video from "./video";
import form from "./form";
import area from "./area";
import cowebsite from "./cowebsite";
import externalModule from "./externalModule";
import megaphone from "./megaphone";
import mapEditor from "./mapEditor";
import messageScreen from "./messageScreen";
import refreshPrompt from "./refreshPrompt";
import statusModal from "./statusModal";
import say from "./say";

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
});

export default pt_BR;
