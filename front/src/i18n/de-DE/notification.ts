import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "will mit dir diskutieren",
    message: "sendet Ihnen eine Nachricht",
};

export default notification;
