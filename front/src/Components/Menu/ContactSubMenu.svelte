<script lang="ts">
    import { contactPageStore } from "../../Stores/MenuStore";
</script>

<div class="create-map-main">
    <section class="container-overflow">
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
