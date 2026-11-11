import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindingsprobleem!",
    no_video_stream_received: "Geen videostream ontvangen.",
    user_is_muted: "{name} is gedempt.",
    reduce: "Verminderen",
    connecting: "Verbinden...",
    reconnecting: "Opnieuw verbinden...",
    persistent_connection_issue: "Opnieuw verbinden... Onstabiele verbinding...",
    click_to_unblock: "Klik om te deblokkeren",
    click_and_drag_to_resize: "Klikken en slepen om te vergroten/verkleinen",
    away: {
        subtitle: "Gepauzeerd terwijl je afwezig bent",
        cantSeeOrHear: "Niemand kan je zien of horen",
        heardNotSeen: "Je bent te horen, maar niet te zien",
        cantSee: "Niemand kan je zien",
        seenNotHeard: "Je bent te zien, maar niet te horen",
        cantHear: "Niemand kan je horen",
        turnOnBoth: "Camera en microfoon aanzetten",
        turnOnCamera: "Camera aanzetten",
        turnOnMicrophone: "Microfoon aanzetten",
        turnOn: "Aanzetten",
    },
    remoteAway: {
        inAnotherWindow: "{name} zit in een ander venster of tabblad",
        cameraAndMicPaused: "Camera en microfoon gepauzeerd tot terugkomst",
        cameraPaused: "Camera gepauzeerd tot terugkomst",
    },
};

export default video;
