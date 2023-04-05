<script lang="ts">
    import megaphoneIcon from "../images/megaphone.svg";
</script>

<div id="loading" class="media-box-camera-off-size">
    <div class="wrapper">
        Announcement
        <div
            style={`-webkit-mask: url(${megaphoneIcon}) no-repeat center;mask: url(${megaphoneIcon}) no-repeat center;`}
        />
    </div>
</div>

<style lang="scss">
    #loading {
        @apply tw-h-fit tw-flex tw-bg-orange tw-relative tw-rounded tw-py-2 tw-my-2;
        transition: all 0.2s ease;

        .wrapper {
            @apply tw-flex tw-flex-wrap tw-justify-items-center tw-items-center tw-justify-center tw-text-brand-blue tw-text-center tw-mx-auto tw-animate-pulse;
            div {
                @apply tw-bg-contain tw-bg-no-repeat tw-bg-center tw-bg-brand-blue tw-w-7 tw-h-7;
                content: "";
                margin-left: 10px;
            }
        }
    }
</style>
