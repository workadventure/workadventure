import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "名前を入力してください",
            empty: "名前が入力されていません",
            tooLongError: "名前が長すぎます",
            notValidError: "名前の形式が正しくありません",
        },
    },
    genericError: "エラーが発生しました",
    terms: "続行すると、{links} に同意したことになります。",
    termsOfUse: "利用規約",
    privacyPolicy: "プライバシーポリシー",
    cookiePolicy: "クッキーに関する方針",
    continue: "続ける",
};

export default login;
