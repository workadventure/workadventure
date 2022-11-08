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

    let currentMapObjects : MapEntity[] = [];
    let rootItem : MapEntity[] = []; //A sample of each object
    let itemVariants : MapEntity[] = [];

    let nameFilter : string;
    let tagAvailableFilter : string[] = [];
    let tagFilter : string[] = [];

    let selectedTag = "";

    function onPickItemVariant(variant:MapEntity)
    {
        pickedVariant = variant;
        mapEditorSelectedEntityStore.set(pickedVariant);
    }

    function onPickItem(item : MapEntity)
    {
        pickedItem = item;
        let currentTagFilter = new Set<string>(tagFilter);
        itemVariants = $mapObjectsStore.filter((item)=>item.name == pickedItem.name && (currentTagFilter.size === 0 || item.tags.some(tag=> currentTagFilter.has(tag))));
        itemVariants = itemVariants.sort((a,b)=> a.direction.localeCompare(b.direction) +a.color.localeCompare(b.color) * 10 +(a.color === pickedItem.color? - 100:0) + (b.color === pickedItem.color? 100:0));
        pickedVariant = undefined;
    }

    function onTagPick()
    {
        if(selectedTag !== "")
        {
            tagFilter.push(selectedTag);
            tagFilter.sort();
            selectedTag = "";
            mapObjectsStore.setFilter(tagFilter);
            tagFilter = tagFilter; //send update to UI;
        }
    }

    function onTagDelete(tag: string)
    {
        tagFilter = tagFilter.filter(t => t !== tag)
        mapObjectsStore.setFilter(tagFilter);
    }

    function onFilterChange()
    {
        let uniqId = new Set<string>();
        let currentFilter = new Set<string>(tagFilter);
        rootItem = [];
        for(let mapObject of currentMapObjects)
        {

        }
        rootItem = rootItem;
        if(!pickedItem.tags.some(tag=> currentFilter.has(tag)) && rootItem.length != 0)//if the item is not available due to filtering, we change it
        {
            onPickItem(rootItem[0]);
        }
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
        tagFilter.forEach(tag => tags.delete(tag));
        tagAvailableFilter = ["",...tags];
        tagAvailableFilter.sort();
        
        if(!tagFilter.every(tag => pickedItem.tags.includes(tag)) && rootItem.length != 0)//if the item is not available due to filtering, we change it
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
    <div>Name filter : <input/></div>
        <div>tag filter : <select bind:value={selectedTag} on:change={()=>onTagPick()}>
            {#each tagAvailableFilter as tag}
            <option>{tag}</option>
            {/each}
        </select>

    </div>
    <div class="tag-container">
        {#each tagFilter as tag (tag)}
            <button class="tag-button" on:click={()=>onTagDelete(tag)}>{tag}<img class="tag-delete" src={deleteTagButton} alt=""/></button>
        {/each}</div>
    <div class="item-name">{pickedItem.name}</div>
    <div class="item-picker-container">
        {#each rootItem as item (item.name) }
        <div class="pickable-item {item.name === pickedItem.name? 'active':''}" on:click={()=>onPickItem(item)}>
            <img class="item-image" src={item.path} alt={item.name}/>
        </div>
        {/each}
    </div>
    <div class="separator">Select a variation</div>
    <div class="item-picker-container">
        {#if pickedItem !== null}
        {#each itemVariants as item }
        <div class="pickable-item {item.path === pickedVariant?.path ? 'active':''}" on:click={()=>onPickItemVariant(item)}>
            <img class="item-image" src={item.path} alt={item.name}/>
        </div>
        {/each}
        {/if}
    </div>
    {#if pickedVariant !== undefined}
    <div class="item-colour">{pickedVariant.color}</div>
    <div class="item-direction">{pickedVariant.direction}</div>
    {/if}
</div>

<style lang="scss">
    .item-picker{
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
        padding: 2em;
    }

</style>