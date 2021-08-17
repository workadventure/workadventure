<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import {onMount} from "svelte";

    let gameScene = gameManager.getCurrentGameScene();

    let HTMLShareLink: HTMLInputElement;
    let expandedMapCopyright = false;
    let expandedTilesetCopyright = false;

    let mapName: string = 'The map has not a name.';
    let mapDescription: string = "The creator of the map didn't use the property to describe the map.";
    let mapCopyright: string = "There is not copyright and this map.";
    let tilesetCopyright: string[] = [];

    onMount(() => {
        if (gameScene.mapFile.properties !== undefined) {
            const propertyName = gameScene.mapFile.properties.find((property) => property.name === 'mapName')
            if ( propertyName !== undefined && typeof propertyName.value === 'string') {
                mapName = propertyName.value;
            }
            const propertyDescription = gameScene.mapFile.properties.find((property) => property.name === 'mapDescription')
            if (propertyDescription !== undefined && typeof propertyDescription.value === 'string') {
                mapDescription = propertyDescription.value;
            }
            const propertyCopyright = gameScene.mapFile.properties.find((property) => property.name === 'mapCopyright')
            if (propertyCopyright !== undefined && typeof propertyCopyright.value === 'string') {
                mapCopyright = propertyCopyright.value;
            }
        }

        for (const tileset of gameScene.mapFile.tilesets) {
            if (tileset.properties !== undefined) {
                const propertyTilesetCopyright = tileset.properties.find((property) => property.name === 'tilesetCopyright')
                if (propertyTilesetCopyright !== undefined && typeof propertyTilesetCopyright.value === 'string') {
                    tilesetCopyright = [...tilesetCopyright, propertyTilesetCopyright.value]; //Assignment needed to trigger Svelte's reactivity
                }
            }
        }
    })

    function copyLink() {
        HTMLShareLink.select();
        document.execCommand('copy');
    }
</script>

<div class="about-room-main">
    <section class="share-url">
        <h3>Share the link of the room !</h3>
        <input type="text" readonly bind:this={HTMLShareLink} value={location.toString()}>
        <button type="button" class="nes-btn is-primary" on:click={copyLink}>Copy</button>
    </section>
    <h2>Informations on the map</h2>
    <section class="container-overflow">
        <h3>{mapName}</h3>
        <p class="string-HTML">{mapDescription}</p>
        <h3 class="nes-pointer hoverable" on:click={() => expandedMapCopyright = !expandedMapCopyright}>Copyrights of the map</h3>
        <p class="string-HTML" hidden="{!expandedMapCopyright}">{mapCopyright}</p>
        <h3 class="nes-pointer hoverable" on:click={() => expandedTilesetCopyright = !expandedTilesetCopyright}>Copyrights of the tilesets</h3>
        <section hidden="{!expandedTilesetCopyright}">
            {#each tilesetCopyright as copyright}
                <p class="string-HTML">{copyright}</p>
            {:else}
                <p>None of the tilesets of this map have a property copyright. This doesn't mean that those tilesets have no license.</p>
            {/each}
        </section>
    </section>
</div>


<style lang="scss">
  .string-HTML{
    white-space: pre-line;
  }

  div.about-room-main {
    height: calc(100% - 56px);

    section.share-url {
      text-align: center;
      margin-bottom: 20px;

      input {
        width: 85%;
        border-radius: 32px;
        padding: 3px;
      }
      input::selection {
        background-color: #209cee;
      }
    }

    h2, h3 {
      width: 100%;
      text-align: center;
    }

    h3.hoverable:hover {
      background-color: #3c3e40;
      border-radius: 32px;
    }

    section.container-overflow {
      height: calc(100% - 220px);
      margin: 0;
      padding: 0;
      overflow-y: auto;
      }
  }

  @media only screen and (max-height: 900px) {
    div.about-room-main {
      section.share-url input {
        display: none;
      }

      section.container-overflow {
        height: calc(100% - 120px);
      }
    }
  }
</style>