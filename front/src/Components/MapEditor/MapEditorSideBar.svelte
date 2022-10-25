<script lang="ts">
    import { onDestroy } from 'svelte';
    import { EditorToolName } from '../../Phaser/Game/MapEditor/MapEditorModeManager';
    import { mapEditorSelectedToolStore } from '../../Stores/MapEditorStore';
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AreaToolImg from "../images/icon-tool-area.png";
    import FloorToolImg from "../images/icon-tool-floor.png";
    
    const gameScene = gameManager.getCurrentGameScene();
    
    let currentTool : EditorToolName | undefined ;
    
    let availableTools = [
        {toolName: EditorToolName.AreaEditor, img : AreaToolImg},
        {toolName : EditorToolName.FloorEditor, img : FloorToolImg}
    ]

    let mapEditorSelectToolStoreUnsubscriber = mapEditorSelectedToolStore.subscribe((newCurrentTool)=>currentTool = newCurrentTool);
    
    onDestroy(()=> {
        if(mapEditorSelectToolStoreUnsubscriber)
        {
            mapEditorSelectToolStoreUnsubscriber();
        }
    });

    function switchTool(newTool: EditorToolName){
        console.log("switche tool "+newTool);
        gameScene.getMapEditorModeManager().equipTool(newTool);
    }
</script>


<section class="side-bar-container" style="pointer-events:auto;"> <!--put a section to avoid lower div to be affected by some css-->
    <div class="side-bar  " style="pointer-events:auto;">
        {#each availableTools as tool (tool.toolName)}
        <div class="tool-button" style="pointer-events:auto;">
            <button class="{tool.toolName==currentTool?'active':''}" on:click|preventDefault={()=>switchTool(tool.toolName)} type="button" ><img src={tool.img} alt="open tool {tool.toolName}"/></button>
        </div>
        {/each}
    </div>
</section>


<style lang="scss">
    .side-bar-container{
        position: absolute;
        bottom:0;
        left: 0;
        pointer-events:auto;
    }
    .side-bar{
        display:flex;
        flex-direction: column;
        width:fit-content;
        height: fit-content;
        position :absolute;
        bottom:10%;
        left:2rem;
        align-content: bottom;
        .tool-button{
            position: relative !important;
            display : flex;
            //height: fit-content;
            padding: 0;
            button{
                height: 3em;
                width: 3em;
                padding:10px;
                margin:0;
                background-color: rgb(27 27 41 / 0.95);
                border-radius: 0;
                img{
                    object-fit: contain;
                    max-width: 100%;
                    max-height: 100%;
                }
            }
            button.active
            {
                background-color: rgb(45 45 65);
            }
        }
        .tool-button:first-child button
        {
            border-top-left-radius: 0.5em;
            border-top-right-radius: 0.5em;
        }
        .tool-button:last-child button
        {
            border-bottom-left-radius: 0.5em;
            border-bottom-right-radius: 0.5em;
        }
    }
</style>