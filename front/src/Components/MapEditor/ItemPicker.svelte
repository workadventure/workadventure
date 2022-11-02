<script lang="ts">
    import { mapObjectsStore  } from "../../Stores/MapEditorStore";

    let pickedItem = $mapObjectsStore[0].itemName;

    function onPickItem(item : string)
    {
        pickedItem = item;
    }
</script>

<div class="item-picker">
    <div class="item-name">{pickedItem}</div>
    <div class="item-colour">Item colour picker</div>
    <div class="item-name">Item Direction Picker</div>
    <div class="item-picker-container">
        {#each $mapObjectsStore as item (item.itemName)}
        <div class="pickable-item {item.itemName === pickedItem? 'active':''}" on:click={()=>onPickItem(item.itemName)}>
            <img class="item-image" src={item.itemPath} alt={item.itemName}/>
        </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .item-picker{
        .item-picker-container{
            width: 18em;
            height: 16em;
            padding:0.5em;
            display: flex;
            flex-wrap: wrap;
            overflow-y: scroll;
            pointer-events: auto;
            .pickable-item{
                flex : 0 0 5em;
                height: 5em;
                display: flex;
                cursor: url("/style/images/cursor_pointer.png"), pointer;
                *{
                    cursor: url("/style/images/cursor_pointer.png"), pointer;
                }
                .item-image {
                    margin:auto;
                    max-width: 100%;
                    max-height: 100%;
                }
            }
            .pickable-item:hover
            {
                border-radius: 0.8em;
                border:  0.2rem solid yellow;
            }
            .pickable-item.active
            {
                border-radius: 0.8em;
                border:  0.2rem solid white;
            }
        }
        div{
            margin:auto;
            width:fit-content;
        }
        align-content: center;
        width: 20em;
    }

</style>