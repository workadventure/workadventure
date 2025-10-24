import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    properties: {
        listenerMegaphoneProperties: {
            waitingMedialLinkError:
                "Sembla que hi ha un problema amb l'enllaç que has proporcionat. El podries comprovar de nou? 🙏",
            waitingMedialLinkHelp: "L'enllaç correcte hauria de ser 'https://monlienmedia.com/…'.",
        },
    },
};

export default mapEditor;
