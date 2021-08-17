<script lang="ts">

    function goToCreateMapPage() {
        //const sparkHost = 'https://'+window.location.host.replace('play.', '')+'/choose-map.html';
        //TODO fix me: this button can to send us on WorkAdventure BO.
        //const sparkHost = ADMIN_URL + "/getting-started";

        //The redirection must be only on workadventu.re domain
        //To day the domain staging cannot be use by customer
        //TODO: go to getting started ? or map-building ? or two different buttons ?
        const sparkHost = "https://workadventu.re/getting-started";
        window.open(sparkHost, "_blank");
    }

    function goToScriptingApiPage() {
        //The redirection must be only on workadventu.re domain
        //The scripting API function could change on other domain and that could break map created with the old function
        const sparkHost = "https://workadventu.re/map-building/scripting";
        window.open(sparkHost, "_blank");
    }

</script>

<div class="create-map-main">
    <section class="container-overflow">
        <section>
            <h3>Create your map</h3>
            <p>
                WorkAdventure allows you to create an online space to communicate spontaneously with others.
                And it all starts with creating your own space. Choose from a large selection of prefabricated maps by our team.
                Or create your own map from scratch.
            </p>
            <button type="button" class="nes-btn is-primary" on:click={goToCreateMapPage}>Create a map</button>
        </section>
        <section>
            <h3>Use the scripting API</h3>
            <p>Make your map more interactive, more alive and totally unique with the scripting API.</p>
            <p>(Programming skills are required to use the scripting API).</p>
            <button type="button" class="nes-btn" on:click={goToScriptingApiPage}>Use a script</button>
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