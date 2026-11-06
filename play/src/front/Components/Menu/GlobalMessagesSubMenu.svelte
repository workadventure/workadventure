<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import TextGlobalMessage, { type TextGlobalMessageHandle } from "./TextGlobalMessage.svelte";

    let handleSendText: TextGlobalMessageHandle | undefined = $state();
    let broadcastToWorld = $state(false);

    function send(): void {
        handleSendText?.sendTextMessage(broadcastToWorld);
    }
</script>

<div>
    <div class="global-message-content">
        <TextGlobalMessage bind:handleSending={handleSendText} />
    </div>
    <div>
        <label>
            <input type="checkbox" bind:checked={broadcastToWorld} />
            <span>{$LL.menu.globalMessage.warning()}</span>
        </label>
        <section class="centered-column">
            <button
                class="light"
                onclick={(event) => {
                    event.preventDefault();
                    send();
                }}
            >
                {$LL.menu.globalMessage.send()}
            </button>
        </section>
    </div>
</div>
