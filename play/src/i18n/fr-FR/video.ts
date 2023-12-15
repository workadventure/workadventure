import { DeepPartial } from "../DeepPartial";
import { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problème de connexion!",
    no_video_stream_received: "Absence de flux vidéo.",
};

export default video;
