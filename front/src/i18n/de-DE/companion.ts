import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Wähle einen Gefährten",
        any: "Kein Gefährte",
        continue: "Weiter",
    },
};

export default companion;
