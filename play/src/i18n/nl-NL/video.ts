import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Verbindingsprobleem!",
    no_video_stream_received: "Geen videostream ontvangen.",
};

export default video;
