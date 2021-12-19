<script lang="ts">
    import { contactPageStore } from "../../Stores/MenuStore";
    import { translator } from "../../Translator/Translator";

    function goToGettingStarted() {
        const sparkHost = "https://workadventu.re/getting-started";
        window.open(sparkHost, "_blank");
    }

    function goToBuildingMap() {
        const sparkHost = "https://workadventu.re/map-building/";
        window.open(sparkHost, "_blank");
    }
</script>

<div class="create-map-main">
    <section class="container-overflow">
        <section>
            <h3>{translator._("menu.contact.getting-started.title")}</h3>
            <p>{translator._("menu.contact.getting-started.description")}</p>
            <button type="button" class="nes-btn is-primary" on:click={goToGettingStarted}
                >{translator._("menu.contact.getting-started.title")}</button
            >
        </section>

        <section>
            <h3>{translator._("menu.contact.create-map.title")}</h3>
            <p>{translator._("menu.contact.create-map.description")}</p>
            <button type="button" class="nes-btn" on:click={goToBuildingMap}
                >{translator._("menu.contact.create-map.title")}</button
            >
        </section>

        <iframe
            title="contact"
            src={$contactPageStore}
            allow="clipboard-read; clipboard-write self {$contactPageStore}"
            allowfullscreen
        />
    </section>
</div>

<style lang="scss">
    div.create-map-main {
        height: calc(100% - 56px);

        text-align: center;

        section {
            margin-bottom: 50px;
        }

        section.container-overflow {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: auto;
        }
    }

    iframe {
        border: none;
        height: calc(100% - 56px);
        width: 100%;
        margin: 0;
    }
</style>
