<script lang="ts">
    import "emoji-picker-element";
    import type { Picker } from "emoji-picker-element";
    import { clickOutside } from "svelte-outside";
    import { onDestroy, onMount } from "svelte";
    import { EmojiClickEvent } from "emoji-picker-element/shared";
    import { emoteMenuStore } from "../../Stores/EmoteStore";
    import { locale } from "../../../i18n/i18n-svelte";

    export let onEmojiClick: (event: EmojiClickEvent) => void = () => {};
    // onClose is triggered when the "Esc" key is pressed
    export let onClose: () => void = () => {};

    let emojiPicker: Picker;

    const emojiClickEventHandler = onEmojiClick;

    function loadLanguage(language: string, country: string) {
        switch (language) {
            // See list of supported languages here: https://github.com/nolanlawson/emoji-picker-element/tree/master/src/picker/i18n
            case "ar": {
                import("emoji-picker-element/i18n/ar.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "de": {
                import("emoji-picker-element/i18n/de.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "es": {
                import("emoji-picker-element/i18n/es.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "fa": {
                import("emoji-picker-element/i18n/fa.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "fr": {
                import("emoji-picker-element/i18n/fr.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "hi": {
                import("emoji-picker-element/i18n/hi.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "id": {
                import("emoji-picker-element/i18n/id.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "it": {
                import("emoji-picker-element/i18n/it.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "ja": {
                import("emoji-picker-element/i18n/ja.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "ms": {
                if (country === "MY") {
                    import("emoji-picker-element/i18n/ms_MY.js")
                        .then((module) => {
                            emojiPicker.i18n = module.default;
                        })
                        .catch((e) => console.error(e));
                }
                break;
            }
            case "nl": {
                import("emoji-picker-element/i18n/nl.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "pl": {
                import("emoji-picker-element/i18n/pl.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "pt": {
                if (country === "BR") {
                    import("emoji-picker-element/i18n/pt_BR.js")
                        .then((module) => {
                            emojiPicker.i18n = module.default;
                        })
                        .catch((e) => console.error(e));
                } else {
                    import("emoji-picker-element/i18n/pt_PT.js")
                        .then((module) => {
                            emojiPicker.i18n = module.default;
                        })
                        .catch((e) => console.error(e));
                }
                break;
            }
            case "ru": {
                import("emoji-picker-element/i18n/ru_RU.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "tr": {
                import("emoji-picker-element/i18n/tr.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "vi": {
                import("emoji-picker-element/i18n/vi.js")
                    .then((module) => {
                        emojiPicker.i18n = module.default;
                    })
                    .catch((e) => console.error(e));
                break;
            }
            case "zh": {
                if (country === "CN") {
                    import("emoji-picker-element/i18n/zh_CN.js")
                        .then((module) => {
                            emojiPicker.i18n = module.default;
                        })
                        .catch((e) => console.error(e));
                }
                break;
            }
            default: {
                // Use default English
            }
        }
    }

    $: {
        const language = $locale.split("-")[0];
        const country = $locale.split("-")[1];

        loadLanguage(language, country);
    }

    onMount(() => {
        emojiPicker.addEventListener("emoji-click", emojiClickEventHandler);
        emoteMenuStore.openEmoteMenu();
    });

    onDestroy(() => {
        emojiPicker.removeEventListener("emoji-click", emojiClickEventHandler);
        emoteMenuStore.closeEmoteMenu();
    });

    function close() {
        emoteMenuStore.closeEmoteMenu();
        onClose();
    }
</script>

<svelte:window
    on:keydown={(e) => {
        if (e.key === "Escape") {
            close();
        }
    }}
/>
<emoji-picker id="emoji-picker" class="pointer-events-auto" use:clickOutside={close} bind:this={emojiPicker} />

<style>
    @media screen and (max-width: 640px) {
        emoji-picker {
            --num-columns: 6;
            --category-emoji-size: 1.125rem;
        }
    }
</style>
