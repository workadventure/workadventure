import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "zapisaj swoje mjeno",
            empty: "žane mjeno zapodate",
            tooLongError: "mjeno je předołhe",
            notValidError: "mjeno je njepłaćiwe",
        },
    },
    terms: "Hdyž pokročuješ, akceptuješ {links}.",
    termsOfUse: "wužiwanske wuměnjenja",
    privacyPolicy: "wozjewjenje wo škiće datow",
    cookiePolicy: "cookie směrnicy",
    continue: "pokročować",
};

export default login;
