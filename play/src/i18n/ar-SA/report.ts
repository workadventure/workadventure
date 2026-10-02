import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "حظر", // Block
        content: "حظر أي تواصل مع {userName}. يمكن التراجع عنه في أي وقت.", // Block any communication with {userName}. Can be undone at any time.
        unblock: "رفع الحظر عن هذا المستخدم", // Unblock this user
        block: "حظر هذا المستخدم", // Block this user
    },
    title: "الإبلاغ", // Report
    content: "قم بكتابة تقرير إلى مديري هذه الغرفة. يمكنهم بعد ذلك حظر المستخدم.", // Write a report to the administrators of this room. They can then ban the user.
    message: {
        title: "رسالتك: ", // Your message:
        empty: "لا يمكن أن يكون الحقل فارغًا.", // The field cannot be empty.
        error: "خطأ في الإبلاغ، يمكنك الاتصال بالمسؤول.", // Reporting error, you can contact the administrator.
    },
    submit: "الإبلاغ عن هذا المستخدم", // Report this user
    moderate: {
        title: "إدارة {userName}", // Moderate {userName}
        block: "حظر", // Block
        report: "الإبلاغ", // Report
        noSelect: "خطأ: لم يتم اختيار أي إجراء.", // ERROR: No action selected.
        action: "إدارة",
        reason: {
            label: "السبب",
            placeholder: "اختياري. سيرى {userName} هذه الرسالة.",
        },
        adminOnly: "مخصص للمديرين",
        cancel: "إلغاء",
        hint: {
            block: "التوقف عن رؤيته وسماعه. لك وحدك، ويمكن التراجع عنه.",
            report: "تنبيه المديرين.",
            remove: "إزالته من هذه المحادثة. يبقى على الخريطة.",
            kick: "فصله الآن. يمكنه العودة.",
            ban: "فصله نهائيًا.",
        },
        remove: {
            title: "إزالة من المحادثة",
            content: "يغادر {userName} هذه المحادثة فورًا، ويتوقف بثه إن كان مباشرًا. يبقى في العالم.",
            submit: "إزالة",
            confirmTitle: "إزالة {userName} من المحادثة",
        },
        kick: {
            title: "إخراج",
            content: "يتم فصل {userName} فورًا، ويمكنه العودة لاحقًا.",
            submit: "إخراج",
            confirmTitle: "إخراج {userName}",
        },
        ban: {
            title: "حظر من العالم",
            content: "يتم فصل {userName} ولن يتمكن من الانضمام إلى هذا العالم مجددًا بهذا الحساب.",
            submit: "حظر",
            confirmTitle: "حظر {userName}؟",
            confirmContent:
                "يمكن للمدير رفع الحظر لاحقًا من صفحة «المستخدمون المحظورون» في القائمة إن كانت متاحة في هذا العالم، أو من لوحة الإدارة.",
            scope: {
                account: "هذا الحساب",
                ip: "هذا الحساب وعنوان IP الخاص به",
                ipHint: "يحظر أيضًا الحسابات الجديدة من الاتصال نفسه، وكل من يشاركه (مكتب، مدرسة…).",
                ipUnknown: "غير متاح: هذا المستخدم لم يعد متصلًا.",
                ipShared: "غير متاح: أنت تشارك عنوان IP هذا وستحظر نفسك.",
                loading: "جارٍ التحقق ممن يشارك عنوان IP هذا…",
                error: "غير متاح: تعذر التحقق ممن يشارك عنوان IP هذا.",
                nobody: "لا أحد غيره متصل بهذا العالم من عنوان IP هذا حاليًا. من يعود لاحقًا من هذا العنوان سيُحظر أيضًا.",
                others: "سيُحظر أيضًا، المتصلون بهذا العالم من عنوان IP هذا حاليًا ({count}):",
                submitWithOthers: "حظر هؤلاء الأشخاص الـ {count}",
            },
        },
    },
    kicked: {
        title: "تم إخراجك",
        subtitle: "قام مشرف بإخراجك من هذه الخريطة",
    },
    banned: {
        title: "محظور",
        subtitle: "تم حظرك من WorkAdventure",
        details: "لمزيد من المعلومات، يمكنك التواصل معنا على: hello@workadventu.re",
    },
    reasonGiven: "السبب: {reason}",
};

export default report;
