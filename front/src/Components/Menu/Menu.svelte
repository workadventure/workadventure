<script lang="typescript">
    import GameQualityMenu from "./GameQualityMenu.svelte";
    import EditProfileMenu from "./EditProfileMenu.svelte";

    enum SubMenus {
        settings = 1,
        editProfile,
        shareUrl,
    }

    let activeSubMenu: SubMenus = 2;

    function switchMenu(menu: SubMenus) {
        activeSubMenu = menu;
    }

    function gotToCreateMapPage() {
        //const sparkHost = 'https://'+window.location.host.replace('play.', '')+'/choose-map.html';
        //TODO fix me: this button can to send us on WorkAdventure BO.
        const sparkHost = "https://workadventu.re/getting-started";
        window.open(sparkHost, "_blank");
    }
</script>


<aside class="menuContainer">
    <section class="menuNav">
        <nav>
            <ul>
                <li class:active={activeSubMenu === SubMenus.settings } on:click={() => switchMenu(SubMenus.settings)}>Settings</li>
                <li class:active={activeSubMenu === SubMenus.shareUrl } on:click={() => switchMenu(SubMenus.shareUrl)}>Share Url</li>
                <li class:active={activeSubMenu === SubMenus.editProfile } on:click={() => switchMenu(SubMenus.editProfile)}>Edit Profile</li>
                <li on:click={() => gotToCreateMapPage()}>Create Map</li>
                <li>Go to Menu</li>
            </ul>
        </nav>
    </section>

    <section class="subMenuContainer">
        {#if activeSubMenu === SubMenus.settings}
            <GameQualityMenu></GameQualityMenu>
        {:else if activeSubMenu === SubMenus.editProfile}
            <EditProfileMenu></EditProfileMenu>
        {/if}
    </section>

</aside>

<style lang="scss">
    aside.menuContainer{
        pointer-events: auto;
        background: #7a7a7a;
        position: absolute;
        width: 30vw;
        height: 70vh;
        border-radius: 8px;
        display: flex;
        padding:5px;
        color: white;

    }

    section.menuNav{
        width:30%;
        border-right:white solid 4px;
        nav{
          ul{
            padding: 10px;
            list-style: none;
            li{
              cursor: pointer;
            }
            li.active{
                background: #6f6f6f ;
            }
          }
        }
    }

</style>