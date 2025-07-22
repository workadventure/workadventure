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
    import PopUpContainer from "./PopUpContainer.svelte";
    import DropFileEntityPicker from "./DropFileEntityPicker.svelte";

    // export let x: number;
    // export let y: number;
    export let file: File;

    // let property = {
    //     link: null,
    //     name: null,
    //     buttonLabel: "Open",
    //     newTab: false,
    //     hideButtonLabel: false,
    //     triggerMessage: "",
    //     closable: true,
    //     width: 50,
    // };

    let entity = {
        prefabRef: {
            id: "basic office decoration:Books (Variant 5):black:Down",
            collectionName: "basic office decoration",
        },
        name: file.name,
    };

    // let entityPrefabPreview: Phaser.GameObjects.Image | undefined = undefined;

    let entityPrefab: EntityPrefab = {
        collectionName: "basic office decoration",
        collisionGrid: undefined,
        color: "black",
        depthOffset: 0,
        direction: "Down" as "Down" | "Left" | "Up" | "Right",
        id: "basic office decoration:Books (Variant 5):black:Down",
        imagePath: "http://play.workadventure.localhost/collections/Office/Props/Book5.png",
        name: "Books (Variant 5)",
        tags: ["furniture", "book", "furniture", "office", "basic"],
        type: "Default" as "Default" | "Custom",
    };

    // onMount(() => {
    //     showEntityPreviewAtPosition().catch((error) => {
    //         console.error("Error showing entity preview:", error);
    //     });

    //     return () => {
    //         destroyEntityPreview();
    //     };
    // });

    async function onSave() {
        const scene = gameManager.getCurrentGameScene();

        if (!scene) {
            console.error("No current game scene found.");
            return;
        }

        // if (!canEntityBePlaced(scene)) {
        //     console.error("Entity cannot be placed at the current position.");
        //     return;
        // }

        // const pointerX = x;
        // const pointerY = y;

        const propertyId = uuidv4();
        // const entityId = uuidv4();

        const lastDot = file.name.lastIndexOf(".");
        const name = file.name.slice(0, lastDot);
        const fileExt = file.name.slice(lastDot + 1);
        const fileUrl = `${get(
            gameSceneStore
        )?.room.mapStorageUrl?.toString()}private/files/${name}-${propertyId}.${fileExt}`;

        // const entityData: WAMEntityData = {
        //     x: Math.floor(pointerX) - (entityPrefabPreview?.displayWidth ?? 32) / 2,
        //     y: Math.floor(pointerY) - (entityPrefabPreview?.displayHeight ?? 32) / 2,
        //     prefabRef: {
        //         id: entity.prefabRef.id,
        //         collectionName: entity.prefabRef.collectionName,
        //     },
        //     properties: [],
        //     name: name,
        // };
        // console.log("Creating entity with data:", entityData);

        // const propertyObj: OpenFilePropertyData = {
        //     type: "openFile",
        //     newTab: property.newTab,
        //     link: fileUrl,
        //     id: propertyId,
        //     name: file.name,
        //     buttonLabel: property.buttonLabel,
        //     trigger: ON_ACTION_TRIGGER_BUTTON,
        //     triggerMessage: property.triggerMessage,
        //     closable: property.closable,
        //     width: property.width,
        // };

        // entityData.properties?.push(propertyObj);

        const fileBuffer = await file.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        const fileToUpload = {
            id: uuidv4(),
            file: fileAsUint8Array,
            name: file.name,
            propertyId,
        };

        const roomConnection = scene.connection;
        if (!roomConnection) throw new Error("No room connection");

        new UploadFileFrontCommand(fileToUpload).emitEvent(roomConnection);

        // const mapEditorModeManager = scene.getMapEditorModeManager();
        // const entitiesManager = scene.getGameMapFrontWrapper().getEntitiesManager();

        // console.log("Executing CreateEntityFrontCommand with entityData:", entityData);

        // await mapEditorModeManager.executeCommand(
        //     new CreateEntityFrontCommand(scene.getGameMap(), entityId, entityData, undefined, entitiesManager, {
        //         width: 32,
        //         height: 32,
        //     })
        // );
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
        };

        mapEditorCopiedEntityDataPropertiesStore.update((properties) => {
            const newProperties = properties ? [...properties] : [];
            newProperties.push(property);
            return newProperties;
        });

        // const openEntity = new Entity(scene, entityId, entityData, entityPrefab);
        // mapEditorSelectedEntityStore.set(openEntity);
        analyticsClient.toggleMapEditor(true);
        mapEditorModeStore.switchMode(true);
        mapEditorEntityFileDroppedStore.set(true);
        mapEditorEntityModeStore.set("ADD");
        mapEditorSelectedEntityPrefabStore.set(entityPrefab);
        isTodoListVisibleStore.set(false);
        isCalendarVisibleStore.set(false);

        // destroyEntityPreview();
        removePopup();
    }

    // async function showEntityPreviewAtPosition(): Promise<void> {
    //     const scene = gameManager.getCurrentGameScene();

    //     if (!scene) {
    //         console.error("No current game scene found.");
    //         return;
    //     }

    //     if (!entityPrefab || !entityPrefab.imagePath) {
    //         console.error("Entity prefab or image path is not defined.");
    //         return;
    //     }

    //     if (!scene.textures.exists(entityPrefab.imagePath)) {
    //         try {
    //             await TexturesHelper.loadEntityImage(scene, entityPrefab.imagePath, entityPrefab.imagePath);
    //         } catch {
    //             console.error("Failed to load entity preview texture.");
    //             return;
    //         }
    //     }

    //     const offset = getEntityPrefabAlignWithGridOffset(entityPrefab);
    //     const snappedX = Math.floor(x) + offset.x - (entityPrefabPreview?.displayWidth ?? 32) / 2;
    //     const snappedY = Math.floor(y) + offset.y - (entityPrefabPreview?.displayHeight ?? 32) / 2;
    //     console.log("Snapped position for entity preview:", snappedX, snappedY);

    //     if (!entityPrefabPreview) {
    //         entityPrefabPreview = scene.add.image(snappedX, snappedY, entityPrefab.imagePath).setOrigin(0);
    //     } else {
    //         entityPrefabPreview.setTexture(entityPrefab.imagePath);
    //     }

    //     scene.markDirty?.();
    // }

    // function getEntityPrefabAlignWithGridOffset(
    //     entityPrefab: EntityPrefab,
    // ): { x: number; y: number } {
    //     const collisionGrid = entityPrefab.collisionGrid;
    //     if (collisionGrid && collisionGrid.length > 0) {
    //         console.log("Collision grid found, calculating offset.");
    //         return {
    //             x: collisionGrid[0].length % 2 === 1 ? 16 : 0,
    //             y: collisionGrid.length % 2 === 1 ? 16 : 0,
    //         };
    //     }

    //     return { x: 0, y: 0 };
    // }

    function selectEntity(selectedEntityPrefab: EntityPrefab) {
        entity.prefabRef.id = selectedEntityPrefab.id;
        entity.prefabRef.collectionName = selectedEntityPrefab.collectionName;

        entityPrefab = selectedEntityPrefab;

        // showEntityPreviewAtPosition().catch((error) => {
        //     console.error("Error showing entity preview:", error);
        // });
    }

    // function canEntityBePlaced(scene: GameScene) {
    //     const gameMapFrontWrapper = scene.getGameMapFrontWrapper();
    //     if (!entityPrefabPreview || !entityPrefab) {
    //         return false;
    //     }
    //     return gameMapFrontWrapper.canEntityBePlacedOnMap(
    //         entityPrefabPreview.getTopLeft(),
    //         entityPrefabPreview.displayWidth,
    //         entityPrefabPreview.displayHeight,
    //         entityPrefab.collisionGrid,
    //         undefined
    //     );
    // }

    function removePopup() {
        //destroyEntityPreview();
        popupStore.removePopup("popupDropFileEntity");
    }

    // function destroyEntityPreview() {
    //     if (entityPrefabPreview) {
    //         entityPrefabPreview.destroy();
    //         entityPrefabPreview = undefined;
    //     }
    // }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="flex flex-col gap-4 p-2 max-h-[80vh] overflow-y-auto">
        <DropFileEntityPicker on:select={(event) => selectEntity(event.detail)} />

        <Input label={$LL.mapEditor.entityEditor.objectName()} id="linkButton" type="text" bind:value={entity.name} />
    </div>

    <svelte:fragment slot="buttons">
        <button
            class="btn btn-primary btn-sm w-full max-w-96 justify-center"
            on:click={onSave}
            data-test-id="dropFileSave">Save</button
        >
        <button class="btn btn-secondary btn-sm w-full max-w-96 justify-center" on:click={removePopup}>Cancel</button>
    </svelte:fragment>
</PopUpContainer>
