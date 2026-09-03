import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const messageScreen: DeepPartial<Translation["messageScreen"]> = {
    connecting: "กำลังเชื่อมต่อ...",
    pleaseWait: "กรุณารอสักครู่ ระบบกำลังเชื่อมต่อคุณเข้าสู่ห้อง",
};
export default messageScreen;
