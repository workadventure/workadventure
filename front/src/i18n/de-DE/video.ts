import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindungsproblem!",
    no_video_stream_received: "Kein Videostream empfangen.",
};

export default video;
