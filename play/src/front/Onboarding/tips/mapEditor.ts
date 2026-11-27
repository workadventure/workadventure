import { get } from "svelte/store";
import { LL } from "../../../i18n/i18n-svelte";
import { mapEditorMenuVisibleStore } from "../../Stores/MenuStore";
import type { BuiltinOnboardingItem } from "../onboardingRules";

/** Tours of the map editor, for the users who can edit the map. */

export const furnitureTip: BuiltinOnboardingItem = {
    id: "wa.mapEditor.furniture",
    kind: "tour",
    title: () => get(LL).onboarding.mapEditorTour.title(),
    // The Tools menu starts the tour for everyone, so editor rights are checked here. On touch devices the
    // map editor has no entity list.
    audience: { allowed: mapEditorMenuVisibleStore, touch: false },
    when: { minDaysSinceFirstVisit: 1 },
    steps: [
        {
            type: "popover",
            anchor: "actionBar.mapMenu",
            advance: "click",
            title: () => get(LL).onboarding.mapEditorTour.openMenu.title(),
            text: () => get(LL).onboarding.mapEditorTour.openMenu.text({ menu: get(LL).actionbar.map() }),
        },
        {
            type: "popover",
            anchor: "mapMenu.editMap",
            side: "left",
            advance: "click",
            text: () => get(LL).onboarding.mapEditorTour.openEditor({ editor: get(LL).actionbar.mapEditor() }),
        },
        {
            type: "popover",
            anchor: "mapEditor.entityList",
            side: "left",
            title: () => get(LL).onboarding.mapEditorTour.placeObject.title(),
            text: () => get(LL).onboarding.mapEditorTour.placeObject.text(),
        },
    ],
};
