import Debug from "debug";
import { ExtensionModule, ExtensionModuleOptions } from "../../ExternalModule/ExtensionModule";
import { LaSuiteDocsAreaController } from "../../controllers/laSuiteDocsAreaController";

const debug = Debug("LaSuiteNumerique-Docs");

class LaSuiteNumeriqueDocs implements ExtensionModule {
    public id = "lasuitenumerqiue-docs";

    init(options: ExtensionModuleOptions) {
        debug("init la suite numerique docs");
        new LaSuiteDocsAreaController(options.app);
    }
}

export default new LaSuiteNumeriqueDocs();
