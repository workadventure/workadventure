export const defaultOptions = {
    icon: "/static/images/logo-WA-min.png",
    image: "/static/images/logo-WA-min.png",
    badge: "/static/images/logo-WA-min.png",
};

export interface NotificationWA {
    sendNotification: () => Promise<void>;
}

export const TIME_NOTIFYING_MILLISECOND = 10000;
