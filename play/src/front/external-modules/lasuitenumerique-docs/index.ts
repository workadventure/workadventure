import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import Debug from "debug";
import { ExtensionModule, ExtensionModuleOptions } from "../../ExternalModule/ExtensionModule";
import {
    LaSuiteNumeriqueDocsPropertyData,
} from "../../../common/external-modules/lasuitenumerique-docs/MapEditor/types";
import LaSuiteNumeriqueDocsAreaPropertyEditor from "./Components/LaSuiteNumeriqueDocsAreaPropertyEditor.svelte";
import AddLaSuiteNumeriqueDocsAreaPropertyButton from "./Components/AddLaSuiteNumeriqueDocsAreaPropertyButton.svelte";

const debug = Debug("LaSuiteNumerique-Docs");

class LaSuiteNumeriqueDocs implements ExtensionModule {
    public id = "lasuitenumerqiue-docs";
    private options: ExtensionModuleOptions|undefined;

    calendarSynchronised: boolean = false;
    todoListSynchronized: boolean = false;

    init(metadata: unknown, options: ExtensionModuleOptions) {
        this.options = options;
    }

    destroy() {
    }

    areaMapEditor() {
        return {
            laSuiteNumeriqueDocs: {
                AreaPropertyEditor: LaSuiteNumeriqueDocsAreaPropertyEditor,
                AddAreaPropertyButton: AddLaSuiteNumeriqueDocsAreaPropertyButton,
                handleAreaPropertyOnEnter: this.handleAreaPropertyOnEnter.bind(this),
                handleAreaPropertyOnLeave: this.handleAreaPropertyOnLeave.bind(this),
                shouldDisplayButton: (areaDataProperties: AreaDataProperties) => true,
                //getOnlineMeetingByJoinMeetingId: this.getOnlineMeetingByJoinMeetingId.bind(this),
            },
        };
    }

    components() {
        return [];
    }

    private cowebsiteIds: string[] = [];

    private handleAreaPropertyOnEnter(area: AreaData) {
        debug("Enter extension module area");

        if (!this.options) {
            throw new Error("ExtensionModule options are not defined");
        }

        // Check if the LaSuiteNumeriqueDocs property is defined
        console.log("area", area.properties);
        const docsAreaProperties = area.properties?.filter(
            (property) => property.type === "extensionModule" && property.subtype === "laSuiteNumeriqueDocs"
        ) as LaSuiteNumeriqueDocsPropertyData[];
        if (docsAreaProperties === undefined) {
            return;
        }

        for (const docsAreaProperty of docsAreaProperties) {
            const url = docsAreaProperty.serverData?.url;
            if (url === undefined) {
                console.warn("LaSuiteNumeriqueDocs URL is not defined in the area property", docsAreaProperty);
                continue;
            }
            const { id } = this.options.openCoWebSite({
                url,
                widthPercent: docsAreaProperty?.data?.width ?? 50,
            }, null);
            this.cowebsiteIds.push(id);
        }
    }

    private handleAreaPropertyOnLeave(area?: AreaData) {
        if (!this.options) {
            throw new Error("ExtensionModule options are not defined");
        }
        for (const id of this.cowebsiteIds) {
            this.options.closeCoWebsite(id);
        }
        this.cowebsiteIds = [];
    }
}

export default new LaSuiteNumeriqueDocs();
