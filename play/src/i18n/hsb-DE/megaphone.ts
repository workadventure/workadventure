import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Wróćo k wuběranju komunikacije",
        selectCommunication: "Komunikaciju wubrać",
        title: "Globalna komunikacija",
        selectCamera: "Kameru wubrać 📹",
        selectMicrophone: "Mikrofon wubrać 🎙️",
        liveMessage: {
            startMegaphone: "Megafon startować",
            stopMegaphone: "Megafon zastajić",
            goingToStream: "Budźeće streamować",
            yourMicrophone: "waš mikrofon",
            yourCamera: "wašu kameru",
            yourScreen: "wašu wobrazowku",
            title: "Megafon",
            button: "Žiwu powěsć startować",
            and: "a",
            toAll: "na wšěch wobdźělnikow",
            confirm: "Wobkrućić",
            cancel: "Přetorhnyć",
            notice: `
            Žiwa powěsć abo "Megafon" wam zmóžnja, žiwu powěsć z wašej kameru a wašym mikrofonu na wšěch ludźi pósłać, kotřiž su w rumje abo w swěće zwjazani.

            Tuta powěsć budźe so w dolnim rožku wobrazowki pokazować, kaž widejowowolanje abo diskusijowa bublina.

            Přikład wužiwanja žiweje powěsće: "Witajće wšitcy, započnemy konferencu? 🎉 Slědujće mojemu avatarej k konferencowej conje a wočińće widejo-nałoženje 🚀"
            `,
            settings: "Nastajenja",
        },
        textMessage: {
            title: "Tekstowa powěsć",
            notice: `
            Tekstowa powěsć wam zmóžnja, powěsć na wšěch ludźi pósłać, kotřiž su w rumje abo w swěće zwjazani.

            Tuta powěsć budźe so jako popup horjeka na stronje pokazować a budźe so ze zwukom přidawać, zo by so identifikowało, zo informacija je čitajomna.

            Přikład powěsće: "Konferenca w rumje 3 započnje so za 2 minuty 🎉. Móžeće k konferencowej conje 3 hić a widejo-nałoženje wočinić 🚀"
            `,
            button: "Tekstowu powěsć pósłać",
            noAccess: "Nimaće přistup k tutej funkciji 😱 Prošu stajće so z administratorom do zwiska 🙏",
        },
        audioMessage: {
            title: "Awdijowa powěsć",
            notice: `
            Awdijowa powěsć je powěsć typa "MP3, OGG...", kotraž so na wšěch wužiwarjow pósćele, kotřiž su w rumje abo w swěće zwjazani.

            Tuta awdijowa powěsć budźe so sćahnyć a startować na wšěch ludźach, kotřiž dostanu tutu powěźeńku.

            Přikład awdijoweje powěsće móže awdijowy nagraće być, kotrež wukazuje, zo konferenca započnje so za někotre minuty.
            `,
            button: "Awdijowu powěsć pósłać",
            noAccess: "Nimaće přistup k tutej funkciji 😱 Prošu stajće so z administratorom do zwiska 🙏",
        },
    },
};

export default megaphone;
