import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Zwězowy problem!",
    no_video_stream_received: "Žedne widejowe pótoki dostane.",
    user_is_muted: "{name} jo němy.",
    reduce: "Pómjeńšyś",
    toggle_fullscreen: "Do połneje wobrazowki pśejś",
    exit_fullscreen: "Połnu wobrazowku wopušćiś",
    click_to_unmute: "Klikniśo, aby zwuk aktiwěrował",
    connecting: "Zwězujo se...",
    reconnecting: "Znowu zwězujo se...",
    persistent_connection_issue: "Znowu zwězujo se... Njestabilny zwězk...",
    click_and_drag_to_resize: "Klikniś a śěgnuś, aby wulkosć změnił",
};

export default video;
