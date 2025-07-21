---
sidebar_position: 100
---

# Deprecated Functions

The list of functions below is **deprecated**. You should not use those but. use the replacement functions.

- Method `WA.sendChatMessage` is deprecated. It has been renamed to [`WA.chat.sendChatMessage`](api-chat.md#sending-a-message-in-the-chat).
- Method `WA.disablePlayerControls` is deprecated. It has been renamed to [`WA.controls.disablePlayerControls`](api-controls.md#disabling--restoring-controls).
- Method `WA.restorePlayerControls` is deprecated. It has been renamed to [`WA.controls.restorePlayerControls`](api-controls.md#disabling--restoring-controls).
- Method `WA.displayBubble` is deprecated. It has been renamed to `WA.ui.displayBubble`.
- Method `WA.removeBubble` is deprecated. It has been renamed to `WA.ui.removeBubble`.
- Method `WA.openTab` is deprecated. It has been renamed to [`WA.nav.openTab`](api-nav.md#opening-a-web-page-in-a-new-tab).
- Method `WA.loadSound` is deprecated. It has been renamed to [`WA.sound.loadSound`](api-sound.md#load-a-sound-from-an-url).
- Method `WA.goToPage` is deprecated. It has been renamed to [`WA.nav.goToPage`](api-nav.md#opening-a-web-page-in-the-current-tab).
- Method `WA.goToRoom` is deprecated. It has been renamed to [`WA.nav.goToRoom`](api-nav.md#going-to-a-different-map-from-the-script).
- Method `WA.openCoWebSite` is deprecated. It has been renamed to [`WA.nav.openCoWebSite`](api-nav.md#openingclosing-web-page-in-co-websites).
- Method `WA.closeCoWebSite` is deprecated. It has been remove and [replace by a function close](api-nav.md#openingclosing-web-page-in-co-websites).
- Method `WA.openPopup` is deprecated. It has been renamed to [`WA.ui.openPopup`](api-ui.md#opening-a-popup).
- Method `WA.onChatMessage` is deprecated. It has been renamed to [`WA.chat.onChatMessage`](api-chat.md#listening-to-messages-from-the-chat).
- Method `WA.onEnterZone` is deprecated. It has been renamed to [`WA.room.onEnterZone`](api-room.md#detecting-when-the-user-entersleaves-a-layer).
- Method `WA.onLeaveZone` is deprecated. It has been renamed to [`WA.room.onLeaveZone`](api-room.md#detecting-when-the-user-entersleaves-a-layer).
- Method `WA.ui.registerMenuCommand` parameter `callback` is deprecated. Use [`WA.ui.registerMenuCommand(commandDescriptor: string, options: MenuOptions)`](api-ui.md#add-custom-menu).
- Method `WA.room.onEnterZone` is deprecated. Use instead [`WA.room.onEnterLayer`](api-room.md#detecting-when-the-user-entersleaves-a-layer).
- Method `WA.room.onLeaveZone` is deprecated. Use instead [`WA.room.onLeaveLayer`](api-room.md#detecting-when-the-user-entersleaves-a-layer).
