<script lang="ts">
    import SettingsIcon from "../Icons/SettingsIcon.svelte";
    import CopyIcon from "../Icons/CopyIcon.svelte";
    import ExternalLinkIcon from "../Icons/ExternalLinkIcon.svelte";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";

    export let title = "GitHub - Workadventure";
    export let url = "https://git.thecodingmachine.com/workadventure-saas";
    export let active = false;
    export let isLoading = false;
</script>

<div
    class="text flex items-center px-2 mr-2 rounded transition-all {active
        ? 'text-contrast bg-white hover:bg-white/90 translate-y-2 rounded-b-none pt-1'
        : 'text-white hover:bg-white/10'}"
    on:click={() => (active = !active)}
>
    {#if isLoading}
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            class="m-1 {active ? 'fill-contrast' : 'fill-white'}"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M8.65642 19.2969C8.48956 19.328 8.41666 19.4063 8.43756 19.5312C8.45836 19.6561 8.55211 19.6979 8.71875 19.6561C8.88562 19.6145 8.95846 19.5415 8.9375 19.4374C8.91681 19.3229 8.82307 19.2759 8.65642 19.2969Z"
            />
            <path
                d="M7.76573 19.422C7.59903 19.422 7.51573 19.479 7.51573 19.5938C7.51573 19.7292 7.60434 19.7863 7.78133 19.7655C7.94803 19.7655 8.03143 19.7082 8.03143 19.5938C8.03143 19.4585 7.94283 19.401 7.76573 19.422Z"
            />
            <path
                d="M6.547 19.3748C6.50541 19.4894 6.57316 19.5673 6.7501 19.6092C6.90634 19.6714 7.00535 19.6403 7.04694 19.5154C7.07824 19.401 7.01049 19.3178 6.84384 19.2654C6.68754 19.2239 6.58865 19.2598 6.547 19.3748Z"
            />
            <path
                d="M22.6796 1.32019C21.7994 0.440119 20.7398 0 19.4999 0H4.49997C3.2605 0 2.20048 0.440119 1.32019 1.32019C0.440119 2.20043 0 3.26045 0 4.49997V19.5001C0 20.7397 0.440119 21.7996 1.32019 22.6797C2.20043 23.5599 3.2605 24.0001 4.49997 24.0001H7.99996C8.22894 24.0001 8.40095 23.9922 8.5155 23.9769C8.62999 23.9611 8.74448 23.8933 8.85913 23.7734C8.97384 23.6537 9.03098 23.4792 9.03098 23.2501C9.03098 23.219 9.02824 22.8645 9.0231 22.1875C9.01779 21.5102 9.01521 20.9738 9.01521 20.5779L8.65582 20.6405C8.42667 20.6821 8.1376 20.7004 7.78861 20.6952C7.43977 20.6899 7.07769 20.6536 6.70276 20.5858C6.3276 20.518 5.97877 20.3618 5.65582 20.1172C5.33304 19.8722 5.10389 19.552 4.96844 19.1563L4.81214 18.7967C4.70799 18.5573 4.54403 18.2916 4.32003 18.0002C4.09603 17.7084 3.86951 17.5104 3.64037 17.4063L3.53097 17.3281C3.45812 17.2761 3.39043 17.2133 3.32787 17.1404C3.26543 17.0674 3.21858 16.9944 3.18733 16.9217C3.15608 16.8486 3.18202 16.7887 3.26543 16.7417C3.34883 16.6949 3.49972 16.6717 3.71857 16.6717L4.03096 16.7185C4.23936 16.7601 4.49702 16.885 4.80448 17.0934C5.11172 17.3017 5.36428 17.5725 5.56223 17.9058C5.80194 18.333 6.09074 18.6583 6.42945 18.8823C6.76788 19.1065 7.10911 19.2185 7.4528 19.2185C7.79649 19.2185 8.09333 19.1924 8.34343 19.1405C8.59326 19.0883 8.82766 19.01 9.04652 18.9059C9.14027 18.208 9.39552 17.6713 9.81205 17.2963C9.21836 17.2338 8.68455 17.1401 8.21045 17.015C7.73661 16.8899 7.24697 16.6869 6.74183 16.4056C6.23648 16.1243 5.81726 15.7755 5.48392 15.3586C5.15063 14.9417 4.8771 14.3949 4.66372 13.718C4.45023 13.0408 4.34345 12.2594 4.34345 11.3741C4.34345 10.1138 4.75506 9.04066 5.57794 8.15533C5.19244 7.20745 5.22883 6.14508 5.68723 4.96789C5.98933 4.87409 6.43733 4.94447 7.03101 5.17887C7.62481 5.41343 8.05956 5.61401 8.33572 5.78043C8.61187 5.94691 8.83314 6.08767 8.99984 6.20238C9.96879 5.93154 10.9687 5.79614 11.9999 5.79614C13.031 5.79614 14.0311 5.93154 15.0001 6.20238L15.5938 5.82739C16.0003 5.57728 16.4793 5.34814 17.0315 5.1399C17.5836 4.93161 18.0054 4.87425 18.2972 4.96806C18.7657 6.14525 18.8077 7.20762 18.4219 8.15544C19.2448 9.04088 19.6565 10.1139 19.6565 11.3742C19.6565 12.2597 19.5497 13.0437 19.3362 13.7258C19.1229 14.4081 18.847 14.9552 18.5082 15.3666C18.1698 15.7781 17.7478 16.1242 17.2427 16.4057C16.7374 16.6868 16.2478 16.8902 15.7738 17.0149C15.2998 17.14 14.766 17.234 14.1723 17.2966C14.7136 17.7652 14.9844 18.5045 14.9844 19.5151V23.2496C14.9844 23.4268 15.0102 23.5699 15.0623 23.6793C15.1148 23.7886 15.198 23.8639 15.3125 23.9059C15.4275 23.9475 15.5286 23.9735 15.6174 23.9839C15.7061 23.9943 15.8335 23.9996 16.0002 23.9996H19.5002C20.7397 23.9996 21.7997 23.5594 22.6796 22.6792C23.5598 21.799 23.9999 20.7389 23.9999 19.4994V4.49997C23.9998 3.26045 23.5597 2.20027 22.6796 1.32019Z"
            />
            <path
                d="M4.74997 17.4688C4.67713 17.5206 4.68752 17.604 4.78127 17.7186C4.88558 17.8227 4.96882 17.8384 5.03138 17.7654C5.10422 17.7135 5.09382 17.6301 4.99991 17.5153C4.89582 17.4217 4.81252 17.406 4.74997 17.4688Z"
            />
            <path
                d="M4.23449 17.0781C4.20329 17.1512 4.23974 17.2137 4.34389 17.2656C4.42713 17.3179 4.49505 17.3076 4.54698 17.2345C4.57818 17.1615 4.54173 17.0989 4.43758 17.0466C4.33344 17.0153 4.26574 17.0259 4.23449 17.0781Z"
            />
            <path
                d="M5.23447 18.0782C5.14061 18.1301 5.14061 18.2241 5.23447 18.3593C5.32822 18.495 5.4166 18.5313 5.50006 18.4687C5.59387 18.3957 5.59387 18.2967 5.50006 18.1717C5.41682 18.0366 5.32822 18.005 5.23447 18.0782Z"
            />
            <path
                d="M5.78147 18.7811C5.68767 18.8646 5.70836 18.9631 5.84397 19.0781C5.9688 19.2029 6.07301 19.2186 6.15636 19.1246C6.23976 19.0415 6.21891 18.9426 6.09386 18.828C5.96902 18.7032 5.86482 18.6874 5.78147 18.7811Z"
            />
        </svg>
    {:else}
        <div class="h-6 w-6 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}">
            <LoaderIcon
                size="24"
                color1={active ? "stroke-contrast" : "stroke-white"}
                color2={active ? "stroke-contrast" : "stroke-white"}
            />
        </div>
    {/if}
    <div class="p-2 text-ellipsis overflow-hidden">
        <div class="bold leading-3 text-ellipsis max-w-[150px] whitespace-nowrap overflow-hidden">
            {#if isLoading}
                {title}
            {:else}
                <div class="w-[100px] h-2 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}" />
            {/if}
        </div>
        <div class="text-xxs opacity-50 text-ellipsis max-w-[150px] whitespace-nowrap overflow-hidden">
            {#if isLoading}
                {url}
            {:else}
                <div class="w-[150px] h-1 mt-1 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}" />
            {/if}
        </div>
    </div>
    <div
        class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
    >
        <ExternalLinkIcon
            classList="h-4 w-4 aspect-ratio transition-all"
            strokeColor={active
                ? "group-hover:stroke-white stroke-contrast fill-transparent"
                : "stroke-white fill-transparent"}
        />
    </div>
    <div
        class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
    >
        <CopyIcon
            classList="h-4 w-4 aspect-ratio transition-all"
            strokeColor={active
                ? "group-hover:stroke-white stroke-contrast fill-transparent"
                : "stroke-white fill-transparent"}
        />
    </div>
    <div
        class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
    >
        <SettingsIcon
            classList="h-4 w-4 aspect-ratio transition-all"
            strokeColor={active
                ? "group-hover:stroke-white stroke-contrast fill-transparent"
                : "stroke-white fill-transparent"}
        />
    </div>
</div>
