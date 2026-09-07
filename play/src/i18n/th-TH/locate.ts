import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "กำลังค้นหาผู้ใช้...",
    progressMessages: {
        scanning: "🔍 กำลังสแกนแผนที่...",
        lookingAround: "👀 กำลังมองไปรอบ ๆ...",
        checkingCorners: "🚶 กำลังตรวจดูทุกซอกทุกมุม...",
        stillSearching: "🔎 ยังคงค้นหาอยู่...",
        maybeHiding: "💭 หรือว่าเขาจะซ่อนอยู่?",
        searchingWorld: "🌍 กำลังค้นหาทั่วทั้งโลก...",
        almostThere: "⏳ ใกล้แล้ว...",
        gettingCloser: "🎯 กำลังเข้าใกล้...",
        justMomentMore: "✨ อีกสักครู่เดียว...",
        finalCheck: "🎪 ตรวจสอบครั้งสุดท้าย...",
    },
    errorMessage: "😢 ดูเหมือนว่าเขาจะออกจากห้องไปแล้ว หรืออยู่ในพื้นที่อื่น!",
};

export default locate;
