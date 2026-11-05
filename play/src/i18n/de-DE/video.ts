import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindungsproblem!",
    no_video_stream_received: "Kein Videostream empfangen.",
    user_is_muted: "{name} ist stummgeschaltet.",
    reduce: "Reduzieren",
    connecting: "Verbinden...",
    reconnecting: "Wiederverbinden...",
    persistent_connection_issue: "Wiederverbinden... Instabile Verbindung...",
    click_to_unblock: "Klicken zum Entsperren",
    click_and_drag_to_resize: "Klicken und ziehen zum Größenändern",
    away: {
        subtitle: "Pausiert, während du abwesend bist",
        cantSeeOrHear: "Niemand kann dich sehen oder hören",
        heardNotSeen: "Man hört dich, sieht dich aber nicht",
        cantSee: "Niemand kann dich sehen",
        seenNotHeard: "Man sieht dich, hört dich aber nicht",
        cantHear: "Niemand kann dich hören",
        turnOnBoth: "Kamera und Mikro einschalten",
        turnOnCamera: "Kamera einschalten",
        turnOnMicrophone: "Mikro einschalten",
        turnOn: "Einschalten",
    },
};

export default video;
