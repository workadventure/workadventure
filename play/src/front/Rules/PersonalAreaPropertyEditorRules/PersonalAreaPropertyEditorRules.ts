import { PersonalAreaAccessClaimMode, PersonalAreaPropertyData } from "@workadventure/map-editor";
import { derived, get, Readable } from "svelte/store";
import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";

export type Option = {
    value: string;
    label: string;
    created: undefined | boolean;
};

export class PersonalAreaPropertyEditorRules {
    private readonly selectedAreaPersonalAreaPropertyStore: Readable<PersonalAreaPropertyData | undefined>;
    private readonly defaultPersonalAreaProperty: PersonalAreaPropertyData = {
        id: crypto.randomUUID(),
        type: "personalAreaPropertyData",
        accessClaimMode: "dynamic",
        allowedTags: [],
        isPersonalArea: false,
        owner: "",
    };

    constructor() {
        this.selectedAreaPersonalAreaPropertyStore = derived(
            mapEditorSelectedAreaPreviewStore,
            (currentAreaPreview) => {
                if (currentAreaPreview === undefined) {
                    return;
                }
                for (const areaPropertyData of currentAreaPreview.getProperties()) {
                    if (areaPropertyData.type === "personalAreaPropertyData") {
                        return areaPropertyData;
                    }
                }
                currentAreaPreview.addProperty({ ...this.defaultPersonalAreaProperty });
                return this.defaultPersonalAreaProperty;
            }
        );
    }

    get defaultAllowedTags(): Option[] {
        return [
            {
                value: "member",
                label: "member",
                created: false,
            },
            {
                value: "admin",
                label: "admin",
                created: false,
            },
        ];
    }

    public mapExistingAllowedTagsToTagOption(allowedTags: string[]): Option[] {
        return allowedTags.map((allowedTag) => ({
            value: allowedTag,
            label: allowedTag,
            created: false,
        }));
    }

    public getPersonalAreaPropertyDataUnSubscriber(
        onEvent: (personalAreaPropertyData: PersonalAreaPropertyData | undefined) => void
    ) {
        return this.selectedAreaPersonalAreaPropertyStore.subscribe(onEvent);
    }

    public setIsPersonalArea(isPersonalArea: boolean) {
        const areaPreview = get(mapEditorSelectedAreaPreviewStore);
        const personalAreaPropertyData = get(this.selectedAreaPersonalAreaPropertyStore);
        if (areaPreview !== undefined && personalAreaPropertyData !== undefined) {
            areaPreview.updateProperty({ id: personalAreaPropertyData.id, isPersonalArea: isPersonalArea });
        }
    }

    public setAccessClaimMode(claimMode: PersonalAreaAccessClaimMode) {
        const areaPreview = get(mapEditorSelectedAreaPreviewStore);
        const personalAreaPropertyData = get(this.selectedAreaPersonalAreaPropertyStore);
        if (areaPreview !== undefined && personalAreaPropertyData !== undefined) {
            areaPreview.updateProperty({ id: personalAreaPropertyData.id, accessClaimMode: claimMode });
        }
    }

    public setOwner(owner: string) {
        const areaPreview = get(mapEditorSelectedAreaPreviewStore);
        const personalAreaPropertyData = get(this.selectedAreaPersonalAreaPropertyStore);
        if (areaPreview !== undefined && personalAreaPropertyData !== undefined) {
            areaPreview.updateProperty({ id: personalAreaPropertyData.id, owner });
        }
    }

    public setAllowedTags(allowedTags: Option[] | undefined) {
        const areaPreview = get(mapEditorSelectedAreaPreviewStore);
        const personalAreaPropertyData = get(this.selectedAreaPersonalAreaPropertyStore);
        if (areaPreview !== undefined && personalAreaPropertyData !== undefined) {
            areaPreview.updateProperty({
                id: personalAreaPropertyData.id,
                allowedTags: allowedTags === undefined ? [] : allowedTags.map((tag) => tag.value),
            });
        }
    }

    public removeOwner() {
        const areaPreview = get(mapEditorSelectedAreaPreviewStore);
        const personalAreaPropertyData = get(this.selectedAreaPersonalAreaPropertyStore);
        if (areaPreview !== undefined && personalAreaPropertyData !== undefined) {
            areaPreview.updateProperty({ id: personalAreaPropertyData.id, owner: "" });
        }
    }
}
