import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "이름을 입력하세요",
            empty: "이름이 비어 있습니다",
            tooLongError: "이름이 너무 깁니다",
            notValidError: "잘못된 이름 형식",
        },
    },
    genericError: "오류가 발생했습니다",
    terms: "계속하면 {links}에 동의하는 것입니다.",
    termsOfUse: "이용 약관",
    privacyPolicy: "개인정보 보호정책",
    cookiePolicy: "쿠키 정책",
    continue: "계속하기",
};

export default login;
