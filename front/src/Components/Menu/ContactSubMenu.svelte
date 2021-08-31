<script lang="ts">
    import {contactPageStore} from "../../Stores/MenuStore";

</script>

<iframe title="contact" src="{$contactPageStore}"></iframe>

<style lang="scss">
    iframe {
      border: none;
      height: calc(100% - 56px);
      width: 100%;
      margin: 0;
    }
</style>