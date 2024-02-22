import { writable } from 'svelte/store';

export let bannerVisible = writable(true)
export let currentBannerIndex = writable(0);
