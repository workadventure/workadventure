import type { Translation } from "../i18n-types";

const camera: NonNullable<Translation["camera"]> = {
    enable: {
        title: "Bitte schalte deine Kamera und dein Mikrofon ein.",
        start: "Los gehts!",
    },
    help: {
        title: "Zugriff auf Kamera / Mikrofon erforderlich",
        permissionDenied: "Zugriff verweigert",
        content: "Der Zugriff auf Kamera und Mikrofon muss im Browser freigegeben werden.",
        firefoxContent:
            'Bitte klicke auf "Diese Entscheidungen speichern" Schaltfläche um erneute Nachfragen nach der Freigabe in Firefox zu verhindern.',
        refresh: "Aktualisieren",
        continue: "Ohne Kamera fortfahren",
    },
    my: {
        silentZone: "Stiller Bereich",
    },
};

export default camera;
