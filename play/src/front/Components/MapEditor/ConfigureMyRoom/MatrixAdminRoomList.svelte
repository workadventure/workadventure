<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import InputText from "../../Input/InputText.svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import InputTextArea from "../../Input/InputTextArea.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import { UpdateWAMMetadataFrontCommand } from "../../../Phaser/Game/MapEditor/Commands/WAM/UpdateWAMMetadataFrontCommand";
    import ButtonState from "../../Input/ButtonState.svelte";
    import { InputTagOption } from "../../Input/InputTagOption";
    import { IconInfoCircle,IconTrash,IconPencil } from "@wa-icons";
    import { openModal } from "svelte-modals";
    import CreateRoomWithAutoInviteModal from "../../../Chat/Components/Room/CreateRoomWithAutoInviteModal.svelte";
    import { Deferred } from "ts-deferred";
    let dynamicStrings = {
        error: {
            name: false,
            confirmSave: false,
        },
    };
    let name = "";
    let description = "";
    let thumbnail = "";
    let copyright = "";
    let tags: InputTagOption[] = [];
    let _tag: InputTagOption[] = [
        {
            value: "member",
            label: "member",
            created: false,
        },
        {
            value: "admin",
            label: "admin",
            created: false,
        },
    ];

    let confirmSaving = writable<boolean>(false);
    
    const connection = gameManager.getCurrentGameScene().connection;


    onMount(() => {
        name = gameManager.getCurrentGameScene()?.wamFile?.metadata?.name ?? "";
        description = gameManager.getCurrentGameScene()?.wamFile?.metadata?.description ?? "";
        thumbnail = gameManager.getCurrentGameScene()?.wamFile?.metadata?.thumbnail ?? "";
        copyright = gameManager.getCurrentGameScene()?.wamFile?.metadata?.copyright ?? "";
        (gameManager.getCurrentGameScene()?.wamFile?.vendor as { tags: string[] })?.tags?.forEach((tag) => {
            tags.push({ value: tag, label: tag, created: false });
            _tag.push({ value: tag, label: tag, created: false });
        });
    });

    const save = () => {}


    const deleteRoom = (roomId : string) =>  {
        //TODO : open confirmation modal : 
        connection.emitDeleteAdminManageChatRoom(roomId);
        roomDataPromise = roomDataPromise.then(roomData => {
            return roomData.filter(room => room.roomId !== roomId);
        });

    }

    const modifyRoom = async (roomID : string , name : string,memberTags: string[],moderatorTags: string[],historyVisibility : string) =>  {

        console.log({roomID})


        const saveRoomPromise = new Deferred<{
            memberTags: string[],
            moderatorTags: string[],
            historyVisibility: historyVisibility,
            name: string
        }>();

        openModal(CreateRoomWithAutoInviteModal, {
            roomID,
            memberTags: memberTags.map((tag)=>({
                label : tag ,
                value : tag
            })),
            moderatorTags: moderatorTags.map((tag)=>({
                label : tag ,
                value : tag
            })),
            topic : "",
            createRoomOptions : {
                name,
                historyVisibility
            },
            saveRoomPromise
        });

        const newRoomData = await saveRoomPromise.promise;

        // Update the room data in the current list
        roomDataPromise = roomDataPromise.then(roomData => {
            return roomData.map(room => {
                if (room.roomId === roomID) {
                    return {
                        ...room,
                        roomName: newRoomData.name,
                        roomMemberTags: newRoomData.memberTags || room.roomMemberTags,
                        roomModeratorTags: newRoomData.moderatorTags || room.roomModeratorTags,
                        visibility: newRoomData.historyVisibility || room.visibility
                    };
                }
                return room;
            });
        });

    }

    let roomDataPromise = connection.queryAllAdminManageChatRoomQuery();

    const createNewRoom = async () => {

        const saveRoomPromise = new Deferred<{
            memberTags: string[],
            moderatorTags: string[],
            historyVisibility: historyVisibility,
            name: string
        }>(); 

        //TODO : recuperer le parent ID 
        openModal(CreateRoomWithAutoInviteModal, {
            parentID : "",
            saveRoomPromise
        });

        const newRoomData = await saveRoomPromise.promise;

// Update the room data in the current list
roomDataPromise = roomDataPromise.then(roomData => {
    return [...roomData,{
        roomId : newRoomData.roomId,
        roomName: newRoomData.name,
        roomMemberTags: newRoomData.memberTags || [],
        roomModeratorTags: newRoomData.moderatorTags || [],
            visibility: newRoomData.historyVisibility || "public"
        }];     
        });
    } 

</script>

<div class="tw-flex tw-flex-col tw-gap-4">
    <h3>Matrix Room List</h3>

    <div class="tw-flex tw-flex-row tw-justify-center">
        <button class={`light tw-mt-5`} type="button" on:click={createNewRoom}>Create New Room</button>
    </div>

    {#await roomDataPromise}
	<p>...rolling</p>
{:then roomData}
<table class="tw-table-auto">
    <thead>
        <tr>
            <th scope="col">Room Name</th>
            <th scope="col">Member tags</th>
            <th scope="col">Moderator Tags</th>  
            <th scope="col">Actions</th>
        </tr>
    </thead>
    <tbody class="">
        {#each roomData as data (data.roomId) }
            <tr>
                <th scope="row">{data.roomName}</th>
                <td class="tw-gap-2">
                    {#each data.roomMemberTags as tag (tag) }
                        <span>
                            {tag}
                        </span>
                    {/each} 
                </td>
                <td class="tw-gap-2">
                    {#each data.roomModeratorTags as tag (tag) }
                        <span>
                            {tag}
                        </span>
                    {/each} 
                </td>
                <td class="tw-flex">
                    <button on:click={()=>modifyRoom(data.roomId , data.roomName,data.roomMemberTags,data.roomModeratorTags,data.visibility)}>
                        <IconPencil  stroke={2}/>
                    </button>
                    <button on:click={()=>deleteRoom(data.roomId)}>
                        <IconTrash  stroke={2}/>
                    </button>
                </td>
            </tr> 
        {/each}
    </tbody>
</table>
{:catch error}
<!-- TODO : changer l'erreur + traduction -->
	<p style="color: red">ERROR 404 ...</p>
{/await}
</div>


<style lang="scss">
    tbody tr:nth-child(even) {
        @apply tw-bg-lighter-purple;
    }
</style>