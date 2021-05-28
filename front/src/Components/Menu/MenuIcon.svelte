<script lang="typescript">

</script>

<main class="menuIcon">
    <section>
        <button>
            <img src="/static/images/menu.svg" alt="Open menu">
        </button>
    </section>
</main>

<style lang="scss">
    .menuIcon button {
        background-color: black;
        color: white;
        border-radius: 7px;
        padding: 2px 8px;
        img {
            width: 14px;
            padding-top: 0;
            /*cursor: url('/resources/logos/cursor_pointer.png'), pointer;*/
        }
    }
    .menuIcon section {
        margin: 10px;
    }
    @media only screen and (max-height: 700px) {
        .menuIcon section {
            margin: 2px;
        }
    }
</style>
