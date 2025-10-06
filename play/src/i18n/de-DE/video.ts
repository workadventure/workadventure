import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindungsproblem!",
    no_video_stream_received: "Kein Videostream empfangen.",
    user_is_muted: "{name} ist stummgeschaltet.",
    reduce: "Verkleinern",
    toggle_fullscreen: "Vollbild umschalten",
    exit_fullscreen: "Vollbild verlassen",
    click_to_unmute: "Klicken zum Entmuten",
};

export default video;
