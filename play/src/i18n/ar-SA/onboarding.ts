import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Welcome to {worldName}! 🚀",
        description:
            "Get ready to explore a virtual world where you can move around, chat with others, and collaborate in real-time. Let's take a quick tour to help you get started!",
    },
    movement: {
        title: "Move around",
        descriptionDesktop:
            "Use your keyboard arrow keys or WASD to move your character. You can also right-click to move. Try moving now!",
        descriptionTouch: "Tap on the map to walk there, and drag to look around. Try moving now!",
        next: "Next",
    },
    communication: {
        title: "Communication bubbles",
        description:
            "When you get close to other players, you'll automatically enter a communication bubble. You can chat with others in the same bubble!",
    },
    lockBubble: {
        title: "Lock your conversation",
        description:
            "Click the lock button to prevent others from joining your conversation bubble. This is useful for private discussions!",
    },
    screenSharing: {
        title: "Share your screen",
        description:
            "Share your screen with others in your conversation bubble. Perfect for presentations and collaboration!",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Use Picture in Picture mode to keep video calls visible while you navigate the map. Great for multitasking!",
    },
    complete: {
        title: "You're all set! 🎉",
        description:
            "You've learned the basics of {worldName}! Feel free to explore, meet new people, and have fun. You can always access help from the menu if you need it.",
    },
    tips: {
        label: "نصيحة",
        next: "التالي",
        previous: "السابق",
        gotIt: "فهمت",
        close: "إغلاق",
        stopShowing: "إيقاف عرض النصائح",
        restartTutorial: "إعادة تشغيل الدليل التعليمي",
        showMe: "أرني",
        notNow: "ليس الآن",
    },
    help: {
        inConversation: "أثناء محادثة",
        inMapEditor: "في محرر الخريطة",
        notHere: "غير متاح هنا حاليًا",
        remindMe: "ذكّرني",
        showTips: "عرض النصائح تلقائيًا",
    },
    releaseNotes: {
        title: "ما الجديد في WorkAdventure {version}",
    },
    mapEditorTour: {
        title: "ضع الأثاث باستخدام محرر الخريطة",
        openMenu: {
            title: "اجعل هذا المكان مكانك",
            text: "يمكنك تعديل هذه الخريطة. افتح قائمة **{menu}** للبدء.",
        },
        openEditor: "انقر على **{editor}**.",
        placeObject: {
            title: "ضع الأثاث",
            text: "اختر عنصرًا من هذه القائمة، ثم انقر على الخريطة لوضعه.",
        },
    },
} satisfies Translation["onboarding"];
