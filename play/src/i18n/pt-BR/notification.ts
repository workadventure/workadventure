import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} quer discutir com você",
    message: "{name} envia uma mensagem",
};

export default notification;
