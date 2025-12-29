import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindungsproblem!",
    no_video_stream_received: "Kein Videostream empfangen.",
    click_and_drag_to_resize: "Klicken und ziehen zum Größenändern",
};

export default video;
