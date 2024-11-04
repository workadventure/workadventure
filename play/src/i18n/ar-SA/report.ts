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
    },
};

export default report;
