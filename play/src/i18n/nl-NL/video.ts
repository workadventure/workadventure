import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindingsprobleem!",
    no_video_stream_received: "Geen videostream ontvangen.",
    user_is_muted: "{name} is gedempt.",
    reduce: "Verminderen",
    toggle_fullscreen: "Volledig scherm in-/uitschakelen",
    exit_fullscreen: "Volledig scherm verlaten",
    click_to_unmute: "Klik om audio in te schakelen",
    click_and_drag_to_resize: "Klikken en slepen om te vergroten/verkleinen",
};

export default video;
