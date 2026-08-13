import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "أدخل اسمك", // Enter your name
            empty: "لم يتم إدخال اسم", // No name provided
            tooLongError: "الاسم طويل جدًا", // The name is too long
            notValidError: "الاسم غير صالح", // The name is invalid
        },
    },
    genericError: "حدث خطأ", // An error occurred
    terms: "بالمتابعة، فإنك تقبل {links}.", // By continuing, you accept the {links}.
    termsOfUse: "شروط الاستخدام", // Terms of Use
    privacyPolicy: "سياسة الخصوصية", // Privacy Policy
    cookiePolicy: "سياسة ملفات تعريف الارتباط", // Cookie Policy
    continue: "استمر", // Continue
};

export default login;
