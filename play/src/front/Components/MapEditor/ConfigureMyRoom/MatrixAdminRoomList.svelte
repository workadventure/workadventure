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
    }

    const modifyRoom = (roomID : string , name : string,memberTags: string[],moderatorTags: string[],historyVisibility : string) =>  {
        //TODO : open modal to modify room

        console.log({roomID})
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
                //TODO : a ramener de l'admin 
            }
        });
    }

    let roomDataPromise = connection.queryAllAdminManageChatRoomQuery();

    const openCreateAutoInviteRoom = () => {

        //TODO : recuperer le parent ID 
        openModal(CreateRoomWithAutoInviteModal, {
            parentID : "",
        });
    } 

</script>

<div class="tw-flex tw-flex-col tw-gap-4">
    <h3>Matrix Room List</h3>

    <div class="tw-flex tw-flex-row tw-justify-center">
        <button class={`light tw-mt-5`} type="button" on:click={openCreateAutoInviteRoom}>Create New Room</button>
    </div>

    {#await roomDataPromise}
	<p>...rolling</p>
{:then roomData}
{@debug roomData}
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