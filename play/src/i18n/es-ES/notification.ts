import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "quiere discutir con usted",
    message: "te envía un mensaje",
};

export default notification;
