<script lang="ts">
    import followImg from "../images/follow.svg";

    export let hidden: boolean;

    let cancelButton = false;
</script>

<div class="btn-follow" class:hide={hidden} class:cancel={cancelButton}>
    <img src={followImg} alt="" />
</div>

<style lang="scss">
    .btn-follow {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border: solid 0px black;
        width: 44px;
        height: 44px;
        background: #666;
        box-shadow: 2px 2px 24px #444;
        border-radius: 48px;
        transform: translateY(15px);
        transition-timing-function: ease-in-out;
        margin: 0 4%;

        img {
            filter: brightness(0) invert(1);
        }
    }
</style>
