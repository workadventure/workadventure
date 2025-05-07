import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} vol discutir amb tu",
    message: "{name} t'envia un missatge",
};

export default notification;
