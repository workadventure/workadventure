import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Groniś",
        think: "Mysliś",
    },
    placeholder: "Zapódajśo how swóju powěsć...",
    button: "Bublinu napóraś",
    tooltip: {
        description: {
            say: "Pokazujo chatowu bublinu nad wašym wótgłosom. Widobna za wšyknych, kótarež waš wótgłos wiźe, wóstawa 5 sekundow pokazana.",
            think: "Pokazujo myslowu bublinu nad wašym wótgłosom. Widobna za wšyknych, kótarež waš wótgłos wiźe, wóstawa pokazana, dłujkož se njepjerědujośo.",
        },
    },
};

export default say;
