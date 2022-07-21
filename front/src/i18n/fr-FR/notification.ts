import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "veut discuter avec toi",
    message: "a envoyé un message",
};

export default notification;
