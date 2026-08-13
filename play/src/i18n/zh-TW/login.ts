import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "輸入你的名字",
            empty: "名字為空",
            tooLongError: "名字太長",
            notValidError: "名字格式不正確",
        },
    },
    genericError: "發生錯誤",
    terms: "點選繼續，即表示你同意我們的{links}。",
    termsOfUse: "使用條款",
    privacyPolicy: "隱私權政策",
    cookiePolicy: "Cookie 政策",
    continue: "繼續",
};

export default login;
