<script lang="ts">
    import { Direction, MapEntity } from "../../Stores/MapObjectsStore";
    import { onDestroy, subscribe } from "svelte/internal";
    import { mapEditorSelectedEntityStore, mapObjectsStore  } from "../../Stores/MapEditorStore";
    import { object } from "zod";
    import { map } from "rxjs/operators";
    import AboutRoomSubMenu from "../Menu/AboutRoomSubMenu.svelte";

    let pickedItem : MapEntity = $mapObjectsStore[0];
    let pickedVariant : MapEntity | undefined = undefined;

    let rootItem : MapEntity[] = []; //A sample of each object
    let itemVariants : MapEntity[] = []


    function onPickItemVariant(variant:MapEntity)
    {
        pickedVariant = variant;
        mapEditorSelectedEntityStore.set(pickedVariant);
    }

    function onPickItem(item : MapEntity)
    {
        pickedItem = item;
        itemVariants = $mapObjectsStore.filter((item)=>item.itemName == pickedItem.itemName)
        pickedVariant = undefined;
    }

    onPickItem(pickedItem);

    let mapObjectStoreUnsubscriber = mapObjectsStore.subscribe((newMap)=>
    {
        let uniqId = new Set<string>();
        for(let mapObject of newMap)
        {
            if(!uniqId.has(mapObject.itemName))
            {
                uniqId.add(mapObject.itemName);
                rootItem.push(mapObject);
            }
        }
    });

    onDestroy(()=>
    {
        if(mapObjectStoreUnsubscriber !== undefined)
        {
            mapObjectStoreUnsubscriber();
        }
    });
</script>

<div class="item-picker">
    <div class="item-name">{pickedItem.itemName}</div>
    <div class="item-colour">{pickedItem.color}</div>
    <div class="item-direction">{pickedItem.direction}</div>
    <div class="item-picker-container">
        {#each rootItem as item (item.itemName) }
        <div class="pickable-item {item.itemName === pickedItem.itemName? 'active':''}" on:click={()=>onPickItem(item)}>
            <img class="item-image" src={item.itemPath} alt={item.itemName}/>
        </div>
        {/each}
    </div>
    <div class="separator">Select a variation</div>
    <div class="item-picker-container">
        {#each itemVariants as item }
        <div class="pickable-item {item.direction === pickedVariant?.direction && item.color === pickedVariant.color? 'active':''}" on:click={()=>onPickItemVariant(item)}>
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