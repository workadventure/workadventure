import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} chce z tobu diskutować",
    message: "{name} sćele Wam powěsć",
};

export default notification;
