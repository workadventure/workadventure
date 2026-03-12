import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

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
    genericError: "Zmólka jo póstawała",
};

export default login;
