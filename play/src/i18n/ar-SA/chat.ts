import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "هنا هو سجل رسائلك:", // Here is your message history:
    enter: "أدخل رسالتك...", // Enter your message...
    menu: {
        visitCard: "بطاقة الزيارة", // Visit card
        addFriend: "إضافة صديق", // Add friend
    },
    typing: "يكتب...", // typing...
    users: "المستخدمين", // Users
    userList: {
        disconnected: "غير متصل", // Disconnected
        isHere: "هنا على هذه الخريطة", // Is here on this map
        inAnotherMap: "في خريطة أخرى", // In another map
        in: "في ", // In
        teleport: "الانتقال الفوري", // Teleport
        search: "ابحث بسهولة!", // Just search!
        TalkTo: "المشي إلى", // Walk to
        teleporting: "الانتقال الفوري...", // Teleporting...
        businessCard: "بطاقة العمل", // Business card
    },
    connecting: "الاتصال بخادم الحضور...", // Connecting to presence server...
    waitingInit: "انتظار تهيئة الخادم...", // Waiting for server initialization...
    waitingData: "انتظار بيانات المستخدم...", // Waiting for user data...
    searchUser: "البحث عن مستخدم، خريطة، إلخ...", // Search for user, map, etc...
    searchChat: "البحث عن قناة، رسالة، إلخ...", // Search for channel, message, etc...
    role: {
        admin: "مدير", // Administrator
        member: "عضو", // Member
        visitor: "زائر", // Visitor
    },
    status: {
        online: "متصل", // Online
        away: "بعيد", // Away
        unavailable: "غير متاح", // Unavailable
    },
    logIn: "تسجيل الدخول", // Log in
    signIn: "سجل أو سجل الدخول لاستخدام جميع ميزات الدردشة!", // Register or sign in to use all chat features!
    invite: "دعوة", // Invite
    roomEmpty: "هذه الغرفة فارغة، ادعُ زميلًا أو صديقًا للانضمام إليك!", // This room is empty, invite a colleague or friend to join you!
    userOnline: "مستخدم متصل", // User online
    usersOnline: "مستخدمين متصلين", // Users online
    open: "فتح", // Open
    me: "أنا", // Me
    you: "أنت", // You
    ban: {
        title: "حظر", // Ban
        content: "حظر المستخدم {userName} من العالم الحالي. يمكن للإدارة التراجع عن هذا.", // Ban user {userName} from the current world. This can be undone by the administration.
        ban: "حظر هذا المستخدم", // Ban this user
    },
    loading: "جار التحميل", // Loading
    loadingUsers: "جار تحميل المستخدمين...", // Loading users...
    load: "تحميل", // Load
    rankUp: "ترقية", // Rank up
    rankDown: "تنزيل", // Rank down
    reinit: "إعادة التهيئة", // Reinitialize
    enterText: "أدخل رسالة...", // Enter a message...
    timeLine: {
        title: "خطك الزمني", // Your timeline
        open: "افتح خطك الزمني!", // Open your timeline!
        description: "سجل الرسائل والأحداث", // Message and event history
        incoming: "{userName} انضم إلى النقاش", // {userName} joined the discussion
        outcoming: "{userName} غادر النقاش", // {userName} left the discussion
    },
    form: {
        placeholder: "أدخل رسالتك...", // Enter your message...
        typing: " يكتب...", // typing...
        application: {
            klaxoon: {
                title: "كلاكسون", // Klaxoon
                description: "أرسل استطلاع كلاكسون في الدردشة!", // Send a Klaxoon survey in the chat!
            },
            youtube: {
                title: "يوتيوب", // Youtube
                description: "أرسل فيديو يوتيوب في الدردشة!", // Send a Youtube video in the chat!
            },
            googleDocs: {
                title: "مستندات جوجل", // Google Docs
                description: "أرسل مستند جوجل في الدردشة!", // Send a Google Docs document in the chat!
            },
            googleSlides: {
                title: "شرائح جوجل", // Google Slides
                description: "أرسل عرض شرائح جوجل في الدردشة!", // Send a Google Slides presentation in the chat!
            },
            googleSheets: {
                title: "جداول بيانات جوجل", // Google Sheets
                description: "أرسل جدول بيانات جوجل في الدردشة!", // Send a Google Sheets document in the chat!
            },
            eraser: {
                title: "ممحاة", // Eraser
                description: "أرسل لوحة ممحاة في الدردشة!", // Send an Eraser board in the chat!
            },
            weblink: {
                error: "الرابط غير صالح", // The URL is not valid
            },
        },
    },
    notification: {
        discussion: "يريد مناقشتك", // wants to discuss with you
        message: "يرسل رسالة", // sends a message
        forum: "في المنتدى", // in the forum
    },
    see: "رؤية", // See
    show: "عرض", // Show
    less: "أقل", // Less
    more: "أكثر", // More
    sendBack: "إعادة الإرسال", // Send back
    delete: "حذف", // Delete
    messageDeleted: "تم حذف هذه الرسالة بواسطة ", // This message was deleted by
    emoji: {
        icon: "رمز لفتح أو إغلاق نافذة الرموز التعبيرية المحددة", // Icon to open or close the selected emoji popup
        search: "البحث عن الرموز التعبيرية...", // Search emojis...
        categories: {
            recents: "الأخيرة", // Recents
            smileys: "الوجوه التعبيرية والمشاعر", // Smileys & Emotion
            people: "الأشخاص والأجسام", // People & Body
            animals: "الحيوانات والطبيعة", // Animals & Nature
            food: "الطعام والشراب", // Food & Drink
            activities: "الأنشطة", // Activities
            travel: "السفر والأماكن", // Travel & Places
            objects: "الأشياء", // Objects
            symbols: "الرموز", // Symbols
            flags: "الأعلام", // Flags
            custom: "مخصص", // Custom
        },
        notFound: "لم يتم العثور على رموز تعبيرية", // No emojis found
    },
    said: "قال:", // said:
    reply: "رد", // Reply
    react: "تفاعل", // React
    copy: "نسخ", // Copy
    copied: "تم النسخ!", // Copied!
    file: {
        fileContentNoEmbed: "المحتوى غير متاح. يرجى التحميل", // Content not available. Please download
        download: "تحميل", // Download
        openCoWebsite: "افتح في موقع Co", // Open in Co-Website
        copy: "نسخ الرابط", // Copy link
        tooBig: "{fileName} كبير جدًا {maxFileSize}.", // {fileName} is too big {maxFileSize}.
        notLogged: "يجب أن تكون مسجلاً لتحميل ملف.", // You must be logged in to upload a file.
    },
    needRefresh: "انتهت صلاحية اتصالك. يرجى تحديث الصفحة لاستعادة الاتصال بالدردشة.", // Your connection has expired. Please refresh the page to restore the connection to the chat.
    refresh: "تحديث", // Refresh
    upgrade: "ترقية", // Upgrade
    upgradeToSeeMore: "قم بالترقية لرؤية المزيد من الرسائل", // Upgrade to see more messages
    disabled: "تم تعطيل هذه الميزة.", // This feature is disabled.
    disabledByAdmin: "تم تعطيل هذه الميزة من قبل المسؤول.", // This feature is disabled by the administrator.
    anAdmin: "مسؤول", // an administrator
    messageDeletedByYou: "لقد حذفت هذه الرسالة", // You have deleted this message
    waiting: "انتظار", // Waiting
};

export default chat;
