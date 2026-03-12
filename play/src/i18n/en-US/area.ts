import type { BaseTranslation } from "../i18n-types";

const area: BaseTranslation = {
    noAccess: "Sorry, you don't have access to this area.",
    personalArea: {
        claimDescription: "This is a personal area. Do you want to make it yours ?",
        buttons: {
            yes: "Yes",
            no: "No",
        },
        personalSpaceWithNames: "{name}'s personal space",
        alreadyHavePersonalArea: "You already have a personal area. Will be deleted if you claim this one.",
    },
};

export default area;
