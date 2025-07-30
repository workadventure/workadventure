import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "قم بتحرير WOKA الخاص بك", // "Edit your WOKA"
        navigation: {
            finish: "تم", // "Finish"
            backToDefaultWoka: "العودة إلى WOKA الافتراضي", // "Back to default WOKA"
        },
        randomize: "عشوائي", // "Randomize"
    },
    selectWoka: {
        title: "اختر WOKA الخاص بك", // "Select your WOKA"
        continue: "متابعة", // "Continue"
        customize: "قم بتحرير WOKA الخاص بك", // "Customize your WOKA"
        randomize: "اختر عشوائيًا", // "Select Randomly"
    },
    menu: {
        businessCard: "بطاقة العمل", // "Business Card"
    },
};

export default woka;
