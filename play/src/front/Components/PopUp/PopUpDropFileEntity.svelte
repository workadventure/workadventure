<script lang="ts">
    import { v4 as uuidv4 } from "uuid";
    import { get } from "svelte/store";
    import type { EntityPrefab, OpenFilePropertyData } from "@workadventure/map-editor";
    import Input from "../Input/Input.svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { UploadFileFrontCommand } from "../../Phaser/Game/MapEditor/Commands/File/UploadFileFrontCommand";
    import { gameSceneStore } from "../../Stores/GameSceneStore";
    import { popupStore } from "../../Stores/PopupStore";
    import LL from "../../../i18n/i18n-svelte";
    import { ON_ACTION_TRIGGER_BUTTON } from "../../WebRtc/LayoutManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        mapEditorCopiedEntityDataPropertiesStore,
        mapEditorEntityFileDroppedStore,
        mapEditorEntityModeStore,
        mapEditorModeStore,
        mapEditorSelectedEntityPrefabStore,
    } from "../../Stores/MapEditorStore";
    import { isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { isTodoListVisibleStore } from "../../Stores/TodoListStore";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import PopUpContainer from "./PopUpContainer.svelte";
    import DropFileEntityPicker from "./DropFileEntityPicker.svelte";

    export let file: File;

    let entity = {
        prefabRef: {
            id: "basic office decoration:Books (Variant 5):black:Down",
            collectionName: "basic office decoration",
        },
        name: file.name,
    };

    let entityPrefab: EntityPrefab | undefined = undefined;

    const entitiesCollectionsManager = gameManager.getCurrentGameScene().getEntitiesCollectionsManager();
    const entitiesPrefabsVariants = entitiesCollectionsManager.getEntitiesPrefabsVariantStore();

    async function onSave() {
        const scene = gameManager.getCurrentGameScene();

        if (!scene) {
            warningMessageStore.addWarningMessage("No Game Scene found");
            console.error("No current game scene found.");
            return;
        }

        let defaultEntityPrefab = entityPrefab;

        if (!defaultEntityPrefab) {
            defaultEntityPrefab = await entitiesCollectionsManager.getEntityPrefab(
                "All Object Collection",
                "basic office decoration:Books (Variant 5):black:Down"
            );
        }

        if (!defaultEntityPrefab) {
            const variant = get(entitiesPrefabsVariants)[0];
            defaultEntityPrefab = variant.defaultPrefab;
        }

        const propertyId = uuidv4();

        const lastDot = file.name.lastIndexOf(".");
        const name = file.name.slice(0, lastDot);
        const fileExt = file.name.slice(lastDot + 1);
        const fileUrl = `${get(
            gameSceneStore
        )?.room.mapStorageUrl?.toString()}private/files/${name}-${propertyId}.${fileExt}`;

        const fileBuffer = await file.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        const fileToUpload = {
            id: uuidv4(),
            file: fileAsUint8Array,
            name: file.name,
            propertyId,
        };

        const roomConnection = scene.connection;
        if (!roomConnection) {
            warningMessageStore.addWarningMessage("No room connection");
            throw new Error("No room connection");
        }

        new UploadFileFrontCommand(fileToUpload).emitEvent(roomConnection);

        const property: OpenFilePropertyData = {
            type: "openFile",
            newTab: false,
            link: fileUrl,
            id: propertyId,
            name: file.name,
            buttonLabel: "Open File",
            trigger: ON_ACTION_TRIGGER_BUTTON,
            triggerMessage: "",
            closable: true,
            width: 50,
            hideUrl: false,
        };

        const mapEditorModeManager = scene.getMapEditorModeManager();

        analyticsClient.dragDropFile();
        mapEditorModeStore.switchMode(true);
        mapEditorModeManager.equipTool(EditorToolName.EntityEditor);
        mapEditorEntityFileDroppedStore.set(true);
        mapEditorEntityModeStore.set("ADD");
        mapEditorSelectedEntityPrefabStore.set(entityPrefab || defaultEntityPrefab);
        isTodoListVisibleStore.set(false);
        isCalendarVisibleStore.set(false);

        mapEditorCopiedEntityDataPropertiesStore.update((properties) => {
            const newProperties = properties ? [...properties] : [];
            newProperties.push(property);
            return newProperties;
        });

        removePopup();
    }

    function selectEntity(selectedEntityPrefab: EntityPrefab) {
        entity.prefabRef.id = selectedEntityPrefab.id;
        entity.prefabRef.collectionName = selectedEntityPrefab.collectionName;

        entityPrefab = selectedEntityPrefab;
    }

    function removePopup() {
        popupStore.removePopup("popupDropFileEntity");
    }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="flex flex-col gap-4 p-2 max-h-[80vh] overflow-y-auto">
        <DropFileEntityPicker {entitiesPrefabsVariants} on:select={(event) => selectEntity(event.detail)} />

        <Input label={$LL.mapEditor.entityEditor.objectName()} id="linkButton" bind:value={entity.name} />
    </div>

    <svelte:fragment slot="buttons">
        <button
            class="btn btn-secondary btn-sm w-full max-w-96 justify-center"
            on:click={onSave}
            data-testid="dropFileSave"
        >
            {$LL.mapEditor.entityEditor.buttons.save()}
        </button>
        <button class="btn bg-white/10 hover:bg-white/30 btn-sm w-full max-w-96 justify-center" on:click={removePopup}>
            {$LL.mapEditor.entityEditor.buttons.cancel()}
        </button>
    </svelte:fragment>
</PopUpContainer>
