import { DeepPartial } from "../DeepPartial";
import { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problème de connexion!",
    no_video_stream_received: "Absence de flux vidéo.",
    reduce: "Réduire",
    toggle_fullscreen: "Passer en plein écran",
    exit_fullscreen: "Quitter le plein écran",
    click_to_unmute: "Cliquez pour activer le son",
};

export default video;
