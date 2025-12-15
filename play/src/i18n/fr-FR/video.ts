import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problème de connexion!",
    no_video_stream_received: "Absence de flux vidéo.",
    user_is_muted: "{name} est en sourdine.",
    reduce: "Réduire",
    toggle_fullscreen: "Passer en plein écran",
    exit_fullscreen: "Quitter le plein écran",
    click_to_unmute: "Cliquez pour activer le son",
    click_and_drag_to_resize: "Cliquez et faites glisser pour redimensionner",
};

export default video;
