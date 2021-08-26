<script lang="ts">

    function goToGettingStarted() {
        const sparkHost = "https://workadventu.re/getting-started";
        window.open(sparkHost, "_blank");
    }

    function goToBuildingMap() {
        const sparkHost = "https://workadventu.re/map-building";
        window.open(sparkHost, "_blank");
    }

</script>

<div class="create-map-main">
    <section class="container-overflow">
        <section>
            <h3>Getting started</h3>
            <p>
                WorkAdventure allows you to create an online space to communicate spontaneously with others.
                And it all starts with creating your own space. Choose from a large selection of prefabricated maps by our team.
            </p>
            <button type="button" class="nes-btn is-primary" on:click={goToGettingStarted}>Getting started</button>
        </section>
        <section>
            <h3>Create your map</h3>
            <p>You can also create your own custom map by following the step of the documentation.</p>
            <button type="button" class="nes-btn" on:click={goToBuildingMap}>Create your map</button>
        </section>
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

</style>