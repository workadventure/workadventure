import {
  isLookingLikeIframeEventWrapper,
  isIframeEventWrapper,
} from "./Event/IframeEvent";
import { userStore } from "./Stores/LocalUserStore";
import { ChatConnection } from "./Connection/ChatConnection";
import { connectionStore } from "./Stores/ConnectionStore";
import {
  chatMessagesStore,
  ChatMessageTypes,
  chatPeerConnectionInProgress,
  newChatMessageSubject,
  newChatMessageWritingStatusSubject,
  timelineOpenedStore,
  writingStatusMessageStore,
} from "./Stores/ChatStore";
import { setCurrentLocale } from "./i18n/locales";
import { Locales } from "./i18n/i18n-types";
import { get } from "svelte/store";
import { mucRoomsStore } from "./Stores/MucRoomsStore";
import { defaultUserData } from "./Xmpp/MucRoom";

class IframeListener {
  init() {
    window.addEventListener("message", (message: MessageEvent): void => {
      const payload = message.data;
      const lookingLikeEvent =
        isLookingLikeIframeEventWrapper.safeParse(payload);
      if (lookingLikeEvent.success) {
        const iframeEventGuarded = isIframeEventWrapper.safeParse(
          lookingLikeEvent.data
        );
        if (iframeEventGuarded.success) {
          const iframeEvent = iframeEventGuarded.data;
          switch (iframeEvent.type) {
            case "userData": {
              //console.info("UserData received from WorkAdventure !");
              userStore.set(iframeEvent.data);
              connectionStore.set(
                new ChatConnection(
                  iframeEvent.data.authToken ?? "",
                  iframeEvent.data.playUri,
                  iframeEvent.data.uuid
                )
              );
              break;
            }
            case "setLocale": {
              setCurrentLocale(iframeEvent.data.locale as Locales).catch(
                (err) => console.error(err)
              );
              break;
            }
            case "joinMuc": {
              get(connectionStore)
                .getXmppClient()
                ?.joinMuc(
                  iframeEvent.data.name,
                  iframeEvent.data.url,
                  iframeEvent.data.type
                );
              break;
            }
            case "leaveMuc": {
              get(connectionStore)
                .getXmppClient()
                ?.leaveMuc(iframeEvent.data.url);
              break;
            }
            case "updateWritingStatusChatList": {
              writingStatusMessageStore.set(iframeEvent.data);
              break;
            }
            case "addChatMessage": {
              if (
                iframeEvent.data.author?.userUuid == undefined ||
                iframeEvent.data.text == undefined
              ) {
                break;
              }

              let userData = defaultUserData;
              const mucRoomDefault = mucRoomsStore.getDefaultRoom();
              if (mucRoomDefault) {
                userData = mucRoomDefault.getUserDataByUuid(
                  iframeEvent.data.author?.userUuid
                );
              }

              for (const chatMessageText of iframeEvent.data.text) {
                chatMessagesStore.addExternalMessage(userData, chatMessageText);
              }
              break;
            }
            case "comingUser": {
              for (const target of iframeEvent.data.targets) {
                let userData = defaultUserData;
                const mucRoomDefault = mucRoomsStore.getDefaultRoom();
                if (mucRoomDefault) {
                  userData = mucRoomDefault.getUserDataByUuid(target.userUuid);
                }

                if (ChatMessageTypes.userIncoming === iframeEvent.data.type) {
                  chatMessagesStore.addIncomingUser(userData);
                }
                if (ChatMessageTypes.userOutcoming === iframeEvent.data.type) {
                  chatMessagesStore.addOutcomingUser(userData);
                }
              }
              break;
            }
            case "peerConexionStatus": {
              chatPeerConnectionInProgress.set(iframeEvent.data);
              if (iframeEvent.data) {
                timelineOpenedStore.set(true);
              }
              break;
            }
          }
        }
      }
    });
  }
}

export const iframeListener = new IframeListener();

/* @deprecated with new service chat messagerie */
//publis new message when user send message in chat timeline
newChatMessageSubject.subscribe((messgae) => {
  window.parent.postMessage(
    {
      type: "addPersonnalMessage",
      data: messgae,
    },
    "*"
  );
});
newChatMessageWritingStatusSubject.subscribe((status) => {
  window.parent.postMessage(
    {
      type: "newChatMessageWritingStatus",
      data: status,
    },
    "*"
  );
});
