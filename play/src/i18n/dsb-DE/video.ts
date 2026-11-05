import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Zwězowy problem!",
    no_video_stream_received: "Žedne widejowe pótoki dostane.",
    user_is_muted: "{name} jo němy.",
    reduce: "Pómjeńšyś",
    connecting: "Zwězujo se...",
    reconnecting: "Znowu zwězujo se...",
    persistent_connection_issue: "Znowu zwězujo se... Njestabilny zwězk...",
    click_to_unblock: "Klikniśo, aby blokěrowanje wótpórał",
    click_and_drag_to_resize: "Klikniś a śěgnuś, aby wulkosć změnił",
    away: {
        subtitle: "Pawza, mjaztym až sćo pšecej",
        cantSeeOrHear: "Nichten njamóžo was wiźeś abo słyšaś",
        heardNotSeen: "Wy sćo słyšaś, ale njewiźeś",
        cantSee: "Nichten njamóžo was wiźeś",
        seenNotHeard: "Wy sćo wiźeś, ale njesłyšaś",
        cantHear: "Nichten njamóžo was słyšaś",
        turnOnBoth: "Kameru a mikrofon zašaltowaś",
        turnOnCamera: "Kameru zašaltowaś",
        turnOnMicrophone: "Mikrofon zašaltowaś",
        turnOn: "Zašaltowaś",
    },
    remoteAway: {
        inAnotherWindow: "{name} jo w drugem woknje abo rejtariku",
        cameraAndMicPaused: "Kamera a mikrofon w pawzy až do wrośenja",
        cameraPaused: "Kamera w pawzy až do wrośenja",
        micPaused: "Mikrofon w pawzy až do wrośenja",
    },
};

export default video;
