<script lang="ts">
    import {PUSHER_URL} from '../../../Enum/EnvironmentVariable'
   
    export const redirectUri = PUSHER_URL + '/third-party-login/login/discord'

</script>

<div class=" tw-flex tw-flex-col tw-w-full tw-gap-2">
    <a  href={redirectUri}
    class="tw-w-full tw-p-2 tw-bg-[#4156F6] tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center tw-gap-2">
    <svg width="21" height="16" viewBox="0 0 21 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_4009_21095)">
            <path d="M17.4419 1.69037C16.1284 1.08945 14.741 0.661578 13.3158 0.420898C13.1207 0.77012 12.9445 1.12878 12.7872 1.4953C11.2692 1.26721 9.72603 1.26721 8.20802 1.4953C8.05072 1.12878 7.87453 0.77012 7.67947 0.420898C6.25427 0.664724 4.86525 1.0926 3.55017 1.69351C0.938871 5.55697 0.23099 9.32447 0.584931 13.0385C2.11395 14.1679 3.82545 15.0284 5.64549 15.579C6.05449 15.0284 6.41787 14.4432 6.72934 13.8313C6.13786 13.6111 5.56684 13.3374 5.02256 13.0165C5.16571 12.9126 5.30571 12.8057 5.44099 12.7018C8.64534 14.2088 12.3546 14.2088 15.559 12.7018C15.6958 12.8135 15.8358 12.9205 15.9774 13.0165C15.4331 13.3389 14.8605 13.6111 14.2675 13.8329C14.579 14.4448 14.9408 15.0284 15.3513 15.579C17.1729 15.03 18.886 14.1711 20.415 13.0401C20.8303 8.733 19.7056 5.0001 17.4419 1.69037ZM7.17766 10.7544C6.19135 10.7544 5.3765 9.85931 5.3765 8.75816C5.3765 7.65702 6.16303 6.75407 7.17452 6.75407C8.186 6.75407 8.99456 7.65702 8.97725 8.75816C8.95995 9.85931 8.18285 10.7544 7.17766 10.7544ZM13.8223 10.7544C12.8344 10.7544 12.0227 9.85931 12.0227 8.75816C12.0227 7.65702 12.8092 6.75407 13.8223 6.75407C14.8354 6.75407 15.6376 7.65702 15.6203 8.75816C15.603 9.85931 14.8275 10.7544 13.8223 10.7544Z" fill="white"/>
        </g>
        <defs>
            <clipPath id="clip0_4009_21095">
                <rect width="20" height="15.1581" fill="white" transform="translate(0.5 0.420898)"/>
            </clipPath>
        </defs>
    </svg>


        
        <span class="tw-cursor-pointer">
            Connect to Discord
        </span>
    </a>
    <p class=" tw-text-sm tw-text-gray-500">
        Lorem ipsum odor amet, consectetuer adipiscing elit. Tincidunt nisl sed laoreet praesent nascetur nunc. Bibendum ad per arcu sodales, hac etiam eu porta egestas. See the docs
    </p>
</div>

<style>
</style>