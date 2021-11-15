<script lang="ts">
    let HTMLShareLink: HTMLInputElement;

    function copyLink() {
        HTMLShareLink.select();
        document.execCommand('copy');
    }

    async function shareLink() {
        const shareData = {url: location.toString()};

        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error('Error: ' + err);
            copyLink();
        }
    }
</script>

<div class="guest-main">
    <section class="container-overflow">
        <section class="share-url not-mobile">
            <h3>Share the link of the room !</h3>
            <input type="text" readonly bind:this={HTMLShareLink} value={location.toString()}>
            <button type="button" class="nes-btn is-primary" on:click={copyLink}>Copy</button>
        </section>
        <section class="is-mobile">
            <h3>Share the link of the room !</h3>
            <input type="hidden" readonly bind:this={HTMLShareLink} value={location.toString()}>
            <button type="button" class="nes-btn is-primary" on:click={shareLink}>Share</button>
        </section>
    </section>
</div>

<style lang="scss">
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

    @media only screen and (max-width: 900px), only screen and (max-height: 600px) {
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