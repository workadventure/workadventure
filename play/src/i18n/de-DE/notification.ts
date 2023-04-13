import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "will mit dir diskutieren",
    message: "sendet Ihnen eine Nachricht",
    forum: "im Forum",
};

export default notification;
