import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "输入你的名字",
            empty: "名字为空",
        },
    },
    terms: '点击继续，意味着你同意我们的<a href="https://workadventu.re/terms-of-use" target="_blank">使用协议</a>, <a href="https://workadventu.re/privacy-policy" target="_blank">隐私政策</a> 和 <a href="https://workadventu.re/cookie-policy" target="_blank">Cookie策略</a>.',
    continue: "继续",
};

export default login;
