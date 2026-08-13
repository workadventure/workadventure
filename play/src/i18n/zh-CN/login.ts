import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "输入你的名字",
            empty: "名字为空",
            tooLongError: "名字太长",
            notValidError: "名字格式不正确",
        },
    },
    genericError: "发生错误",
    terms: "点击继续，意味着你同意我们的{links}.",
    termsOfUse: "使用协议",
    privacyPolicy: "隐私政策",
    cookiePolicy: "Cookie策略",
    continue: "继续",
};

export default login;
