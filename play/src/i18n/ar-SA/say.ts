import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "قل",
        think: "فكر",
    },
    placeholder: "اكتب رسالتك هنا...",
    button: "إنشاء فقاعة",
    tooltip: {
        description: {
            say: "يعرض فقاعة دردشة فوق شخصيتك. مرئية لكل من يرى شخصيتك، وتظل معروضة لمدة 5 ثوانٍ.",
            think: "يعرض فقاعة تفكير فوق شخصيتك. مرئية لكل من يرى شخصيتك، وتظل معروضة طالما أنك لا تتحرك.",
        },
    },
};

export default say;
