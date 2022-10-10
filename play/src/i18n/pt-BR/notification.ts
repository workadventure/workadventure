import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "quer discutir com você",
    message: "envia-lhe uma mensagem.",
};

export default notification;
