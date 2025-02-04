<script type="ts">
    import LL from "../../../../i18n/i18n-svelte";
</script>

<div class="transition-all w-6 h-6 aspect-square text-center">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
    <!-- TODO Hugo : SVG inline -->
</div>
<div>{$LL.actionbar.mapEditor()}</div>
