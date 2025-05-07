<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { contactPageStore } from "../../Stores/MenuStore";

    function goToGettingStarted() {
        const sparkHost = "https://workadventu.re/getting-started";
        window.open(sparkHost, "_blank");
    }

    function goToBuildingMap() {
        const sparkHost = "https://workadventu.re/map-building/";
        window.open(sparkHost, "_blank");
    }
</script>

<div>
    <section>
        {#if $contactPageStore}
            <iframe
                title="contact"
                src={$contactPageStore}
                allow="clipboard-read; clipboard-write self {$contactPageStore}"
                allowfullscreen
                class="border-0 w-full h-dvh"
                allowtransparency
                style="color-scheme: auto"
            />
        {:else}
            <section>
                <h3 class="blue-title">{$LL.menu.contact.gettingStarted.title()}</h3>
                <p>{$LL.menu.contact.gettingStarted.description()}</p>
                <div class="centered-column">
                    <button type="button" class="light" on:click={goToGettingStarted}
                        >{$LL.menu.contact.gettingStarted.title()}</button
                    >
                </div>
            </section>

            <section>
                <h3 class="blue-title">{$LL.menu.contact.createMap.title()}</h3>
                <p>{$LL.menu.contact.createMap.description()}</p>
                <div class="centered-column">
                    <button type="button" class="light" on:click={goToBuildingMap}
                        >{$LL.menu.contact.createMap.title()}</button
                    >
                </div>
            </section>
        {/if}
    </section>
</div>
