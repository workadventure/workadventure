import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} co z tobu diskutěrowaś",
    message: "{name} sćelo śi powěsć",
    chatRoom: "we forumje",
};

export default notification;
