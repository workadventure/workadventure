import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const messageScreen: DeepPartial<Translation["messageScreen"]> = {
    connecting: "연결 중...",
    pleaseWait: "방에 연결하는 동안 기다려 주세요.",
};

export default messageScreen;
