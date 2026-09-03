import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "ขออภัย คุณไม่มีสิทธิ์เข้าถึงพื้นที่นี้",
    blocked: {
        locked: "พื้นที่นี้ถูกล็อก คุณไม่สามารถเข้าได้",
        maxUsers: "พื้นที่นี้เต็มแล้ว คุณไม่สามารถเข้าได้",
        noAccess: "ขออภัย คุณไม่มีสิทธิ์เข้าถึงพื้นที่นี้",
        unlockWithTrigger: "{trigger} เพื่อปลดล็อกพื้นที่นี้",
    },
    personalArea: {
        claimDescription: "นี่คือพื้นที่ส่วนตัว คุณต้องการทำให้เป็นของคุณหรือไม่?",
        buttons: {
            yes: "ใช่",
            no: "ไม่",
            confirm: "ยืนยัน",
        },
        personalSpaceWithNames: "พื้นที่ส่วนตัวของ {name}",
        alreadyHavePersonalArea: "คุณมีพื้นที่ส่วนตัวอยู่แล้ว พื้นที่เดิมจะถูกลบหากคุณรับพื้นที่นี้",
    },
};

export default area;
