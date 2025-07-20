<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { getContacts } from "../../api/google-contacts";

    const dispatch = createEventDispatcher();

    async function fetchContacts() {
        const contacts = await getContacts();
        dispatch("contactsFetched", contacts);
    }
</script>

<button class="btn btn-primary" on:click={fetchContacts}>
    Load Google Contacts
</button>
