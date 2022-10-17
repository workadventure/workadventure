<script lang="ts">
    import walk from "../../../public/static/images/logo-WA-min.png";

    export let title = "Title";
    export let description = "Description";
</script>

<div class="map-editor-property-option-box">
    <img src={walk} alt="icon" class="option-box-icon" />
    <div class="option-box-text">
        <h3>{title}</h3>
        <p>{description}</p>
    </div>
    <input type="checkbox" id="silent" />
</div>

<style lang="scss">
    .map-editor-property-option-box {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        max-width: 100%;
        gap: 10px;
        border-top: 1px solid black;
        border-bottom: 1px solid black;
        padding: 5px 15px 5px 15px;
    }

    .option-box-icon {
        max-width: 64px;
    }

    .option-box-icon {
        flex-grow: 1;
    }

    .option-box-text {
        h3 {
            margin: 0;
        }
        p {
            margin: 0;
        }
        flex-grow: 2;
    }
</style>
