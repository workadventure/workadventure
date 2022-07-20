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
  playersStore,
  timelineOpenedStore,
  writingStatusMessageStore,
} from "./Stores/ChatStore";
import { setCurrentLocale } from "./i18n/locales";
import { Locales } from "./i18n/i18n-types";
import { get } from "svelte/store";

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
                iframeEvent.data.author?.userId == undefined ||
                iframeEvent.data.text == undefined
              ) {
                break;
              }
              const userId: number = iframeEvent.data.author?.userId;
              const author = playersStore.get(userId);
              if (!author) {
                playersStore.set(userId, iframeEvent.data.author);
              }
              for (const chatMessageText of iframeEvent.data.text) {
                chatMessagesStore.addExternalMessage(userId, chatMessageText);
              }
              break;
            }
            case "comingUser": {
              const userId: number = iframeEvent.data.author?.userId;
              const author = playersStore.get(userId);
              if (!author) {
                playersStore.set(userId, iframeEvent.data.author);
              }
              for (const target of iframeEvent.data.targets) {
                const author = playersStore.get(target.userId);
                if (!author) {
                  playersStore.set(target.userId, target);
                }
                if (ChatMessageTypes.userIncoming === iframeEvent.data.type) {
                  chatMessagesStore.addIncomingUser(target.userId);
                }
                if (ChatMessageTypes.userOutcoming === iframeEvent.data.type) {
                  chatMessagesStore.addOutcomingUser(target.userId);
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
