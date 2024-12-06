import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "قم بتحرير WOKA الخاص بك", // "Edit your WOKA"
        navigation: {
            return: "العودة", // "Return"
            back: "رجوع", // "Back"
            finish: "تم", // "Finish"
            next: "التالي", // "Next"
            backTodefaultWoka: "العودة إلى WOKA الافتراضي", // "Back to default WOKA"
        },
    },
    selectWoka: {
        title: "اختر WOKA الخاص بك", // "Select your WOKA"
        continue: "متابعة", // "Continue"
        customize: "قم بتحرير WOKA الخاص بك", // "Customize your WOKA"
    },
    menu: {
        businessCard: "بطاقة العمل", // "Business Card"
    },
};

export default woka;
