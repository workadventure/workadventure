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
import refreshPrompt from "./refreshPrompt";
import warning from "./warning";
import emoji from "./emoji";
import trigger from "./trigger";
import notification from "./notification";
import cowebsite from "./cowebsite";
import actionbar from "./actionbar";
import mapEditor from "./mapEditor";
import megaphone from "./megaphone";
import video from "./video";
import statusModal from "./statusModal";
import area from "./area";

const ar_SA = merge(en_US, {
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
    emoji,
    trigger,
    notification,
    cowebsite,
    actionbar,
    mapEditor,
    megaphone,
    video,
    statusModal,
});

export default ar_SA;