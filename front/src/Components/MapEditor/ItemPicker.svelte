<script lang="ts">
    import { Direction, MapEntity } from "../../Stores/MapObjectsStore";
    import { onDestroy, subscribe } from "svelte/internal";
    import { mapEditorSelectedEntityStore, mapObjectsStore  } from "../../Stores/MapEditorStore";
    import { object } from "zod";
    import { map } from "rxjs/operators";
    import deleteTagButton from "../images/close.png";
    import AboutRoomSubMenu from "../Menu/AboutRoomSubMenu.svelte";

    let pickedItem : MapEntity = $mapObjectsStore[0];
    let pickedVariant : MapEntity | undefined = undefined;
    let currentColor : string;

    let currentMapObjects : MapEntity[] = [];
    let rootItem : MapEntity[] = []; //A sample of each object
    let itemVariants : MapEntity[] = [];
    let currentVariants : MapEntity[] = [];
    let variantColors : string[] = []; 

    let filter : string = "";

    let selectedTag = "";

    let tagsStore = mapObjectsStore.tagsStore;

    function onPickItemVariant(variant:MapEntity)
    {
        pickedVariant = variant;
        mapEditorSelectedEntityStore.set(pickedVariant);
    }

    function onPickItem(item : MapEntity)
    {
        pickedItem = item;
        itemVariants = $mapObjectsStore.filter((item)=>item.name == pickedItem.name );
        itemVariants = itemVariants.sort((a,b)=> a.direction.localeCompare(b.direction) +a.color.localeCompare(b.color) * 10 +(a.color === pickedItem.color? - 100:0) + (b.color === pickedItem.color? 100:0));
        let variantColorSet = new Set<string>();
        itemVariants.forEach(item => variantColorSet.add(item.color));
        variantColors = [...variantColorSet].sort();
        onColorChange(pickedItem.color);
        pickedVariant = undefined;
    }

    function onColorChange(color: string)
    {
        currentColor = color;
        currentVariants = itemVariants.filter(item => item.color === color);
        if(pickedVariant != undefined)
        {
            pickedVariant = currentVariants.find(item => item.direction === pickedVariant?.direction);
        }
    }

    function onTagPick()
    {
        if(selectedTag !== "")
        {
            filter = selectedTag
            selectedTag = "";
            onFilterChange();
        }
    }

    function onFilterChange()
    {
        mapObjectsStore.setNameFilter(filter);
    }

    onPickItem(pickedItem);

    let mapObjectStoreUnsubscriber = mapObjectsStore.subscribe((newMap)=>
    {
        currentMapObjects = newMap;
        let tags = new Set<string>();
        let uniqId = new Set<string>();
        rootItem = [];
        for(let mapObject of newMap)
        {
            mapObject.tags.forEach(v => tags.add(v));
            if(!uniqId.has(mapObject.name))
            {
                uniqId.add(mapObject.name);
                rootItem.push(mapObject);
            }
        }
        
        if(!rootItem.includes(pickedItem) && rootItem.length != 0)//if the item is not available due to filtering, we change it
        {
            onPickItem(rootItem[0]);
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
    <div class="item-filter">
        <input class="filter-input" type="search" bind:value={filter} on:input={onFilterChange} placeholder="Search for name or tags"/>
        <select class="tag-selector" bind:value={selectedTag} on:change={()=>onTagPick()}>
            {#each $tagsStore as tag}
            <option>{tag}</option>
            {/each}
        </select>
    </div>
    <div class="item-name">{pickedItem.name}</div>
    <div class="item-picker-container">
        {#each rootItem as item (item.name) }
        <div class="pickable-item {item.name === pickedItem.name? 'active':''}" on:click={()=>onPickItem(item)}>
            <img class="item-image" src={item.path} alt={item.name}/>
        </div>
        {/each}
    </div>
    <div class="separator">Select a variation</div>
    {#if pickedItem !== null}
    <div class="item-variant-picker-container">
        {#each currentVariants as item }
        <div class="pickable-item {item.path === pickedVariant?.path ? 'active':''}" on:click={()=>onPickItemVariant(item)}>
            <img class="item-image" src={item.path} alt={item.name}/>
        </div>
        {/each}
    </div>
    <div class="color-container">
    {#each variantColors as color}
    <div class="{currentColor === color ? "active" :""}"><button class="color-selector" style="background-color: {color};" on:click={()=>onColorChange(color)}/></div>
    {/each}
    </div>
    {/if}

</div>

<style lang="scss">
    .item-picker{
        align-content: center;
        padding: 1.5em;
        .item-filter{
            .filter-input
            {
                max-width: 90%;
            }
            .tag-selector
            {
                max-width: 10%;
                margin-bottom: 0;
                position : absolute;
            }
        }
        .tag-container
        {
            display: flex;
            flex-wrap: wrap;
            .tag-button{
                background-color: rgb(77 75 103);
                border-radius: 1em;
                border:  0.01rem solid grey;
                .tag-delete
                {
                    margin-left: 0.5em;
                    max-inline-size: 0.65em;
                    margin-right: -0.25em;
                }
            }
        }
        .item-picker-container, .item-variant-picker-container{
            width: 19em;
            height: 16em;
            padding:0.5em;
            display: flex;
            flex-wrap: wrap;
            overflow-y: auto;
            pointer-events: auto;
            .pickable-item{
                flex : 0 0 4em;
                height: 4em;
                display: flex;
                cursor: url("/style/images/cursor_pointer.png"), pointer;
                *{
                    cursor: url("/style/images/cursor_pointer.png"), pointer;
                }
                .item-image {
                    margin:auto;
                    max-width: 3.6em;
                    max-height: 3.6em;
                }
            }
            .pickable-item:hover
            {
                border-radius: 0.8em;
                border:  0.2rem solid white;
            }
            .pickable-item.active
            {
                border-radius: 0.8em;
                border:  0.2rem solid yellow;
            }
        }
        .item-variant-picker-container
        {
            overflow-y: hidden;
            height: 5em;
        }
        .color-container
        {
            display: flex;
            flex-wrap: wrap;
            div{
                .color-selector
                {
                    border-radius: 1em;
                    border : 0.1rem solid black;
                    max-width: 1em;
                }
            }
            .active{
                background-color: yellow;
                padding: 0.05em;
                border-radius: 0.5em;
            }
        }
        div{
            margin:auto;
            width:fit-content;
        }
    }

</style>