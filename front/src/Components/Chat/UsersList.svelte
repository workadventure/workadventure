<script lang="ts">
    import type {UsersStore} from "../../Xmpp/MucRoom";
    export let usersListStore: UsersStore;

</script>

<ul>
{#each [...$usersListStore] as user}
    <li>{ user }</li>
{/each}
</ul>

<style>
  ul {
    list-style: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='10' height='10'><circle id='green_circle' fill='%2364dd17' cx='5' cy='5' r='5' /></svg>");
  }
</style>

