// import { writable } from "svelte/store";
// import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite"
// import type { Unsubscriber } from "svelte/store";

// export let TabActive = writable(true);


// function cowebsiteList() {
//     const { subscribe, set, update } = writable(Array<CoWebsite>());
//     set(Array<CoWebsite>());
//     const unsubscribers = new Map<string, Unsubscriber>();
//     return {
//         subscribe,
//         add: (coWebsite: CoWebsite, position?: number) => {
//             unsubscribers.set(
//                 coWebsite.getId(),
//                 coWebsite.getStateSubscriber().subscribe(() => {
//                     update((currentArray) => currentArray);
//                 })
//             );
//             if (position || position === 0) {
//                 update((currentArray) => {
//                     if (position === 0) {
//                         return [coWebsite, ...currentArray];
//                     } else if (currentArray.length > position) {
//                         return [...currentArray.splice(position, 0, coWebsite)];
//                     }
//                     return [...currentArray, coWebsite];
//                 });
//                 return;
//             }
//             update((currentArray) => [...currentArray, coWebsite]);
//         },
//         remove: (coWebsite: CoWebsite) => {
//             unsubscribers.get(coWebsite.getId())?.();
//             unsubscribers.delete(coWebsite.getId());
//             update((currentArray) => [
//                 ...currentArray.filter((currentCoWebsite) => currentCoWebsite.getId() !== coWebsite.getId()),
//             ]);
//         },
//         empty: () => {
//             unsubscribers.forEach((unsubscriber) => unsubscriber());
//             unsubscribers.clear();
//             set(Array<CoWebsite>());
//         },
//     };
// }
