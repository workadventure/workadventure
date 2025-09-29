import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const messageScreen: DeepPartial<Translation["messageScreen"]> = {
    connecting: "جارٍ الاتصال...",
    pleaseWait: "يرجى الانتظار بينما نقوم بتوصيلك بالغرفة.",
};

export default messageScreen;
