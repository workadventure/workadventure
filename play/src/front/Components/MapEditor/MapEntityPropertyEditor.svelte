<script lang="ts">
    import { onDestroy, SvelteComponent } from "svelte";
    import {mapEditorSelectedEntityStore} from "../../Stores/MapEditorStore"
    import PropertyField from "./PropertyField.svelte";
    import { slide } from 'svelte/transition';
    import crossImg from "../images/cross-icon.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte"
    import NewTabPropertyEditor from "./PropertyEditor/NewTabPropertyEditor.svelte"
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte"

  interface EntityPropertyDescription{
    key:string,
    name:string,
    active:boolean,
    currentValue:any,
    component:any,
    defaultValue:any
  };

    let possibleProperties:EntityPropertyDescription[] = [
        {key:"jitsiRoom",name:"jitsi room", active:false, currentValue:undefined, component:JitsiRoomPropertyEditor, defaultValue:{buttonLabel:"Open Jitsi", roomName:"" }},
        {key:"playAudio",name:"audio file",  active:false, currentValue:undefined,component:PlayAudioPropertyEditor, defaultValue:{buttonLabel:"Play Audio", audioLink:"" }},
        {key:"openTab",name : "link", active:false, currentValue:undefined, component:NewTabPropertyEditor, defaultValue:{buttonLabel:"Open Tab", link:"" }}]

    let selectedEntityUnsubscriber = mapEditorSelectedEntityStore.subscribe(currentEntity=>
    {
        if(currentEntity)
        {
            for(let property of possibleProperties)
            {
                property.active = currentEntity.getEntityData().properties[property.key] !== undefined;
                property.currentValue = currentEntity.getEntityData().properties[property.key];
                if(!property.currentValue)
                {
                    property.currentValue = property.defaultValue;
                }
            }
        }
        possibleProperties = possibleProperties;
    });
    
    onDestroy(()=>
    {
        selectedEntityUnsubscriber();
    });

    function onPropertyChecked(property:any)
    {
        if($mapEditorSelectedEntityStore)
        {
            if(property.active)
            {
                if(!property.currentValue)
                {
                    property.currentValue = possibleProperties.find(v=>v.key === property.key)?.defaultValue;//initialize here the property value
                }

                $mapEditorSelectedEntityStore.getEntityData().properties[property.key] = property.currentValue;
            }
            else
            {
                $mapEditorSelectedEntityStore.getEntityData().properties[property.key] = undefined;
            }
        }
    }

    function onUpdateProperty(property:any)
    {
      if($mapEditorSelectedEntityStore)
      {
        $mapEditorSelectedEntityStore.getEntityData().properties[property.key] = property.currentValue;
      }
    }

    function onTestInteraction()
    {
      if($mapEditorSelectedEntityStore)
      {
          $mapEditorSelectedEntityStore.TestActivation();
      }
    }

    function onDeleteEntity()
    {
      if($mapEditorSelectedEntityStore)
      {
        $mapEditorSelectedEntityStore.delete();
        mapEditorSelectedEntityStore.set(undefined);
      }
    }
</script>
<div>
{#if $mapEditorSelectedEntityStore === undefined}
Select an object modify its properties
{:else}
{#each possibleProperties as property (property.key)}
  <div class="property-enabler">
      <label for={property.key}>{property.name}</label> <input id={property.key} type="checkbox" class="input-switch" bind:checked={property.active} on:change={()=>onPropertyChecked(property)}/>
  </div>
  {#if property.active}
  <div class="property-container" transition:slide|local{{delay:1000}} >
  <svelte:component this={property.component} bind:property={property.currentValue} on:change={() => onUpdateProperty(property)}/>
  </div>
  {/if}
{/each}
<div class="action-button">
    <button on:click={onTestInteraction}>Test Interaction</button>
    <button class="delete-button" on:click={onDeleteEntity}><div>Delete</div><img src={crossImg} alt=""/></button>
</div>
{/if}
</div>

<style lang="scss">
.property-enabler
{
    border-radius: 0.1em;
    display: flex;
    background-color: rgb(77 75 103);
    margin-top: 1px;
    margin-top: 1px;
    align-items: center;
      padding-right: 1em;
    label{
      padding-top: 1em;
      padding-bottom: 1em;
      padding-left: 1em;
      flex-grow:1;
      margin:0;
    }
}
.property-enabler:hover
{
  background-color: rgb(85 85 113);

}
.property-container
{
  padding-left: 1em;
}

.action-button
{
    margin-top: 2em;
    display : flex;
    button{
        flex:1 1 0px;
        border: 1px solid grey;
    }
    button:hover{
        background-color: rgb(77 75 103);
    }
    .delete-button
    {
        border-color: red;
        color:red;
        display:flex;
        div{
          text-align: left;
          flex-grow: 1;
        }
        img{
            object-fit: contain;
            max-width: 2em;
            max-height: 2em;
        }
    }
    .delete-button:hover{
      background-color: rgb(103 75 75);

    }
}

.input-switch {
  position: relative;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  display: inline-block;
  height: 1rem;
  width: 2rem;
  -webkit-appearance: none;
     -moz-appearance: none;
          appearance: none;
  border-radius: 9999px;
  border-width: 1px;
  border-style: solid;
  --tw-border-opacity: 1;
  border-color: rgb(77 75 103 / var(--tw-border-opacity));
  --tw-bg-opacity: 1;
  background-color: rgb(15 31 45 / var(--tw-bg-opacity));
  padding: 0px;
  --tw-text-opacity: 1;
  color: rgb(242 253 255 / var(--tw-text-opacity));
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.input-switch::before {
  position: absolute;
  left: -3px;
  top: -3px;
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 9999px;
  --tw-bg-opacity: 1;
  background-color: rgb(146 142 187 / var(--tw-bg-opacity));
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  --tw-content: "";
  content: var(--tw-content);
}

.input-switch:checked {
  --tw-border-opacity: 1;
  border-color: rgb(146 142 187 / var(--tw-border-opacity));
}

.input-switch:checked::before {
  left: 13px;
  top: -3px;
  --tw-bg-opacity: 1;
  background-color: rgb(86 234 255 / var(--tw-bg-opacity));
  content: var(--tw-content);
  --tw-shadow: 0 0 7px 0 rgba(4,255,210,1);
  --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.input-switch:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.input-switch.input-error {
  border-width: 1px;
  border-style: solid;
  --tw-border-opacity: 1;
  border-color: rgb(255 101 101 / var(--tw-border-opacity));
  --tw-bg-opacity: 1;
  background-color: rgb(57 37 37 / var(--tw-bg-opacity));
  --tw-text-opacity: 1;
  color: rgb(255 101 101 / var(--tw-text-opacity));
}

.input-switch.input-error::-moz-placeholder {
  --tw-text-opacity: 1;
  color: rgb(160 84 84 / var(--tw-text-opacity));
}

.input-switch.input-error::placeholder {
  --tw-text-opacity: 1;
  color: rgb(160 84 84 / var(--tw-text-opacity));
}

.input-switch.input-error::before {
  content: var(--tw-content);
  --tw-bg-opacity: 1;
  background-color: rgb(160 84 84 / var(--tw-bg-opacity));
}

.input-switch.input-error:checked::before {
  --tw-bg-opacity: 1;
  background-color: rgb(255 101 101 / var(--tw-bg-opacity));
  content: var(--tw-content);
  --tw-shadow: 0 0 7px 0 #FF6565;
  --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.input-switch ~ .two-label {
  pointer-events: auto;
  opacity: 0.4;
}

.input-switch ~ .two-label.order-first {
  pointer-events: none;
  opacity: 1;
}

.input-switch:checked ~ .two-label {
  pointer-events: auto;
  opacity: 0.4;
}

.input-switch:checked ~ .two-label.order-last {
  pointer-events: none;
  opacity: 1;
}
</style>