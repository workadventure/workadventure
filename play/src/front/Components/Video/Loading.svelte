<script lang="ts">
    import megaphoneIcon from "../images/megaphone.svg";
</script>

<div id="loading" class="media-box-camera-off-size">
    <div class="wrapper">
        <div aria-label="Loading..." role="status">
            <svg class="tw-h-6 tw-w-6 tw-animate-spin tw-mr-3" viewBox="3 3 18 18">
                <path
                    class="tw-fill-brand-blue"
                    d="M16.9497 7.05015C14.2161 4.31648 9.78392 4.31648 7.05025 7.05015C6.65973 7.44067 6.02656 7.44067 5.63604 7.05015C5.24551 6.65962 5.24551 6.02646 5.63604 5.63593C9.15076 2.12121 14.8492 2.12121 18.364 5.63593C18.7545 6.02646 18.7545 6.65962 18.364 7.05015C17.9734 7.44067 17.3403 7.44067 16.9497 7.05015Z"
                />
            </svg>
        </div>
        Announcement
        <div
            class="svg"
            style={`-webkit-mask: url(${megaphoneIcon}) no-repeat center;mask: url(${megaphoneIcon}) no-repeat center;`}
        />
    </div>
</div>
