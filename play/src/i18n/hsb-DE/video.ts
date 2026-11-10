import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Zwjazowy problem!",
    no_video_stream_received: "Žane widejowe póćahi dóstane.",
    user_is_muted: "{name} je němy.",
    reduce: "Pomjeńšić",
    connecting: "Zwjazujo so...",
    reconnecting: "Znowu zwjazujo so...",
    persistent_connection_issue: "Znowu zwjazujo so... Njestabilny zwjazk...",
    click_to_unblock: "Klikńće, zo byšće blokowanje wotstronił",
    click_and_drag_to_resize: "Klikńće a ćahńće, zo byšće wulkosć změnił",
    away: {
        subtitle: "Přestawka, mjeztym zo sće preč",
        cantSeeOrHear: "Nichtó njemóže was widźeć abo słyšeć",
        heardNotSeen: "Was słyša, ale njewidźa",
        cantSee: "Nichtó njemóže was widźeć",
        seenNotHeard: "Was widźa, ale njesłyša",
        cantHear: "Nichtó njemóže was słyšeć",
        turnOnBoth: "Kameru a mikrofon zašaltować",
        turnOnCamera: "Kameru zašaltować",
        turnOnMicrophone: "Mikrofon zašaltować",
        turnOn: "Zašaltować",
    },
    remoteAway: {
        inAnotherWindow: "{name} je w druhim woknje abo rajtarku",
        cameraAndMicPaused: "Kamera a mikrofon w přestawce hač do wróćenja",
        cameraPaused: "Kamera w přestawce hač do wróćenja",
    },
};

export default video;
