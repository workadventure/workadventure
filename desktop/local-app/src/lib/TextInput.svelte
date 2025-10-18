<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let id: string;
    export let value: string = "";
    export let required: boolean = false;

    const dispatch = createEventDispatcher<{
        change: string;
    }>();
</script>

<div
    class={`flex items-center w-full h-10 border-1 rounded-md overflow-hidden text-gray-200 text-md appearance-none focus:outline-none`}
>
    <input
        {id}
        type="text"
        class="flex-grow h-full border-none mx-2 bg-transparent appearance-none focus:outline-none"
        {value}
        {required}
        on:change={(e) => {
            const target = e.target;
            if (target && 'value' in target && typeof target.value === 'string') {
                value = target.value;
                dispatch("change", value);
            }
        }}
    />
</div>
