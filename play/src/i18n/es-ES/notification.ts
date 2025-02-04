import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} quiere discutir con usted",
    message: "{name} te envía un mensaje",
};

export default notification;
