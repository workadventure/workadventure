import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Entschuldigung, Sie haben keinen Zugang zu diesem Bereich.",
    personalArea: {
        claimDescription: "Dies ist ein persönlicher Bereich. Möchten Sie ihn übernehmen?",
        buttons: {
            yes: "Ja",
            no: "Nein",
        },
        personalSpaceWithNames: "Persönlicher Bereich von {name}",
        alreadyHavePersonalArea:
            "Sie haben bereits einen persönlichen Bereich. Er wird gelöscht, wenn Sie diesen übernehmen.",
    },
};

export default area;
