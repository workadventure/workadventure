<script lang="ts">
    import LL from "../../i18n/i18n-svelte";

    function copyLink() {
        const input: HTMLInputElement = document.getElementById("input-share-link") as HTMLInputElement;
        input.focus();
        input.select();
        document.execCommand("copy");
    }

    async function shareLink() {
        const shareData = { url: location.toString() };

        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error("Error: " + err);
            copyLink();
        }
    }
</script>

<div class="guest-main">
    <section class="container-overflow">
        <section class="share-url not-mobile">
            <h3>{$LL.menu.invite.description()}</h3>
            <input type="text" readonly id="input-share-link" value={location.toString()} />
            <button type="button" class="nes-btn is-primary" on:click={copyLink}>{$LL.menu.invite.copy()}</button>
        </section>
        <section class="is-mobile">
            <h3>{$LL.menu.invite.description()}</h3>
            <input type="hidden" readonly id="input-share-link" value={location.toString()} />
            <button type="button" class="nes-btn is-primary" on:click={shareLink}>{$LL.menu.invite.share()}</button>
        </section>
    </section>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    div.guest-main {
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

        section.is-mobile {
            display: none;
        }
    }

    @include media-breakpoint-up(md) {
        div.guest-main {
            section.share-url.not-mobile {
                display: none;
            }

            section.is-mobile {
                display: block;
                text-align: center;
                margin-bottom: 20px;
            }

            section.container-overflow {
                height: calc(100% - 120px);
            }
        }
    }
</style>
