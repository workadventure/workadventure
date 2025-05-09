import type { BaseTranslation } from "../i18n-types";

const say: BaseTranslation = {
    type: {
        say: "Say",
        think: "Think",
    },
    placeholder: "Type your message here...",
    button: "Create bubble",
    tooltip: {
        description: {
            say: "Displays a chat bubble above your character. Visible to everyone on the map, it remains displayed for 5 seconds.",
            think: "Displays a thought bubble above your character. Visible to all players on the map, it remains displayed as long as you don't move.",
        },
    },
};

export default say;
