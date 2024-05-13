<script lang="ts">
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import { marked } from "marked";
    import { Message } from "../../Model/Message";
    import { HtmlUtils } from "../../../WebRtc/HtmlUtils";
    import { settingsViewStore } from "../../Stores/ActiveThreadStore";
    import { scriptUtils } from "../../../Api/ScriptUtils";

    export let html: string;
    export let message: Message;

    beforeUpdate(async () => {
        // eslint-disable-next-line require-atomic-updates
        html = await marked.parse(html);
    });

    onMount(() => {
        //generate tag mention
        if (message.mentions != undefined) {
            message.mentions.forEach((mentionUser, index) => {
                const name = HtmlUtils.htmlDecode(mentionUser.name);
                const span = document.createElement("span");
                span.classList.add("mention");
                span.append(`@${name}`);
                span.id = `${mentionUser.jid}-${message.id}-${index}`;
                html = html.replace(`@${name}`, span.outerHTML);

                setTimeout(() => {
                    const element = document.getElementById(`${mentionUser.jid}-${message.id}-${index}`);
                    if (element == undefined) return;

                    element.addEventListener("click", (event: Event) => {
                        settingsViewStore.set(true);
                        //TODO add tag name in search
                        event.stopPropagation();
                        event.preventDefault();
                    });
                }, 100);
            });
        }
    });

    let elements: NodeListOf<Element>;
    const aListner = (event: Event) => {
        event.stopPropagation();
        event.preventDefault();

        // Open link in new tab
        const target = event.target as HTMLAnchorElement;
        scriptUtils.openTab(target.href);
    };
    afterUpdate(() => {
        elements = document.querySelectorAll(`#message_${message.id} div a`);
        elements.forEach((element) => {
            element.addEventListener("click", aListner);
        });
    });

    onDestroy(() => {
        // Unsubscribe element event listner click
        elements.forEach((element) => {
            element.removeEventListener("click", aListner);
        });
    });

    /* eslint-disable svelte/no-at-html-tags */
</script>

{@html html}
