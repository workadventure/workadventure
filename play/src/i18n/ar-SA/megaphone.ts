import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "إرسال إعلان",
        audience: "من يستلمه؟",
        thisRoom: "هذه الغرفة",
        wholeWorld: "العالم كله",
        place: "مكان للانضمام (اختياري)",
        noPlace: "بدون مكان",
        noPlaceOnMap: "لا تحتوي هذه الخريطة على منطقة مسماة بعد.",
        preview: "معاينة",
        sendToRoom: "إرسال إلى هذه الغرفة",
        sendToWorld: "إرسال إلى العالم كله",
        confirmWorld: "ستستلمه كل غرف العالم.",
        confirmSend: "نعم، أرسل إلى العالم كله",
        cancel: "إلغاء",
        sentToRoom: "تم إرسال الإعلان إلى هذه الغرفة",
        sentToWorld: "تم إرسال الإعلان إلى العالم كله",
        join: "الانضمام إلى {place}",
        joinMap: "انضمام",
        placeNotFound: "لم يعد هذا المكان موجودًا على الخريطة.",
        admin: "المسؤول",
        more: "إعلانات في الانتظار: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "الميكروفون مغلق",
            cameraOff: "الكاميرا مغلقة",
            cameraOffHint: "يمكنك البث المباشر بالميكروفون فقط.",
            devices: "الكاميرا والميكروفون",
            whoHears: "من يسمعك؟",
            thisRoom: "هذه الغرفة",
            wholeWorld: "كل غرف العالم",
            live: "مباشر",
            stop: "إيقاف",
            title: "رسالة مباشرة", // Live message
        },
    },
};

export default megaphone;
