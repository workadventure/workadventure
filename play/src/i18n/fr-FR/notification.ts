import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "veut discuter avec toi",
    message: "a envoyé un message",
    forum: "sur le forum",
};

export default notification;
