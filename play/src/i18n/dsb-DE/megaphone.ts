import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Slědk k wuběranjeju komunikacije",
        selectCommunication: "Komunikaciju wubraś",
        title: "Globalna komunikacija",
        selectCamera: "Kameru wubraś 📹",
        selectMicrophone: "Mikrofon wubraś 🎙️",
        liveMessage: {
            startMegaphone: "Megafon startowaś",
            stopMegaphone: "Megafon zastajiś",
            goingToStream: "Buźośo streamowaś",
            yourMicrophone: "waš mikrofon",
            yourCamera: "wašu kameru",
            yourScreen: "wašu wobrazowku",
            title: "Megafon",
            button: "Žywy powěsć startowaś",
            and: "a",
            toAll: "na wšyknych wobźělnikow",
            confirm: "Wobkšuśiś",
            cancel: "Pśetergnuś",
            notice: `
            Žywa powěsć abo "Megafon" wam zmóžnja, žywu powěsć z wašej kameru a wašym mikrofonu na wšykne luźe pósłaś, kótarež su w rumje abo w swěśe zwězane.

            Toś ta powěsć buźo se w dolnem rožku wobrazowki pokazowaś, ako widejowowolanje abo diskusijowa bublina.

            Pśikład wužywanja žyweje powěsći: "Witajśo wšykni, zachopimy konferencu? 🎉 Slědujśo mójomu avataroju k konferencowej conje a wócyńśo widejo-nałoženje 🚀"
            `,
            settings: "Nastajenja",
        },
        textMessage: {
            title: "Tekstowa powěsć",
            notice: `
            Tekstowa powěsć wam zmóžnja, powěsć na wšykne luźe pósłaś, kótarež su w rumje abo w swěśe zwězane.

            Toś ta powěsć buźo se ako popup górjejce na boku pokazowaś a buźo se ze zwukom pśidawaś, aby se identifikěrowało, až informacija jo cytajobna.

            Pśikład powěsći: "Konferenca w rumje 3 zachopijo se za 2 minuty 🎉. Móžośo k konferencowej conje 3 hyś a widejo-nałoženje wócyniś 🚀"
            `,
            button: "Tekstowu powěsć pósłaś",
            noAccess: "Njamaśo pśistup k toś tej funkciji 😱 Pšosym stajśo se z administratorom do zwiska 🙏",
        },
        audioMessage: {
            title: "Awdijowa powěsć",
            notice: `
            Awdijowa powěsć jo powěsć typa "MP3, OGG...", kótaraž se na wšyknych wužywarjow pósćelo, kótarež su w rumje abo w swěśe zwězane.

            Toś ta awdijowa powěsć buźo se ześěgnuś a startowaś na wšyknych luźach, kótarež dostanu toś tu powěźeńku.

            Pśikład awdijoweje powěsći móžo awdijowy nagraśe byś, kótarež wukazujo, až konferenca zachopijo se za někotare minuty.
            `,
            button: "Awdijowu powěsć pósłaś",
            noAccess: "Njamaśo pśistup k toś tej funkciji 😱 Pšosym stajśo se z administratorom do zwiska 🙏",
        },
    },
};

export default megaphone;
