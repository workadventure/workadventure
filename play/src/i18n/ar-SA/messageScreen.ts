import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const messageScreen: DeepPartial<Translation["messageScreen"]> = {
    connecting: "جارٍ الاتصال...",
    pleaseWait: "يرجى الانتظار بينما نقوم بتوصيلك بالغرفة.",
};

export default messageScreen;
