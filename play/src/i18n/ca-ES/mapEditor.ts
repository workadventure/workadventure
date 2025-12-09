import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    properties: {
        listenerMegaphoneProperties: {
            waitingMedialLinkError:
                "Sembla que hi ha un problema amb l'enllaç que has proporcionat. El podries comprovar de nou? 🙏",
            waitingMedialLinkHelp: "L'enllaç correcte hauria de ser 'https://monlienmedia.com/…'.",
            waitingSpeaker: "Esperant el ponent 🎤✨",
        },
    },
    settings: {
        loading: "Carregant",
        megaphone: {
            title: "Megàfon",
            description:
                "El megàfon és una eina que permet transmetre un flux de vídeo/àudio a tots els jugadors de la sala/món.",
            inputs: {
                spaceName: "Nom de l'espai",
                spaceNameHelper:
                    "Si voleu transmetre un flux a tots els usuaris que es troben en diferents sales però en el mateix món, heu d'establir el mateix nom d'espai per a tots els paràmetres del megàfon a cada sala i establir l'abast a 'Món'.",
                scope: "Abast",
                world: "Món",
                room: "Sala",
                rights: "Drets",
                rightsHelper:
                    "Els drets defineixen qui pot utilitzar el megàfon. Si el deixeu buit, qualsevol persona el pot utilitzar. Si el configureu, només els usuaris que tenen una d'aquestes 'etiquetes' el poden utilitzar.",
                bigBrowserActivated: "Mode auditori activat",
                bigBrowserActivatedDisabled: "Mode auditori desactivat",
                bigBrowserActivatedHelper:
                    "Mode auditori activat: Rep el flux de càmera i micròfon de tots els usuaris (amb càmera i micròfon activats) a la sala/món. Però l'assistent no podrà veure els altres assistents. Desactivat per defecte.",
                error: {
                    title: "Siusplau, introduïu un nom",
                    save: {
                        success: "Paràmetres del megàfon desats",
                        fail: "Error en desar els paràmetres del megàfon",
                    },
                },
            },
        },
    },
};

export default mapEditor;
