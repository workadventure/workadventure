import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "اختر كاميرا 📹", // Select a camera
        selectMicrophone: "اختر ميكروفون 🎙️", // Select a microphone
        liveMessage: {
            startMegaphone: "ابدأ الميكروفون", // Start megaphone
            goingToStream: "ستقوم بالبث", // You are going to stream
            yourMicrophone: "الميكروفون الخاص بك", // Your microphone
            yourCamera: "الكاميرا الخاصة بك", // Your camera
            yourScreen: "شاشتك", // Your screen
            title: "رسالة مباشرة", // Live message
            button: "ابدأ رسالة مباشرة", // Start live message
            and: "و", // and
            toAll: "إلى جميع المشاركين", // to all participants
            confirm: "تأكيد", // Confirm
            cancel: "إلغاء", // Cancel
            notice: `
            تتيح لك الرسالة المباشرة أو "الميكروفون" إرسال رسالة مباشرة باستخدام الكاميرا والميكروفون الخاصين بك إلى جميع الأشخاص في الغرفة أو في العالم.

            ستظهر هذه الرسالة في الزاوية السفلية من الشاشة، مثل مكالمة فيديو أو فقاعة كلام.

            مثال على استخدام رسالة مباشرة: "مرحبًا جميعًا، هل نبدأ المؤتمر؟ 🎉 اتبعوا صورتي الرمزية إلى منطقة المؤتمر وافتحوا تطبيق الفيديو 🚀"
            `, // The live message or "megaphone" allows you to send a live message with your camera and microphone to everyone in the room or in the world. This message will appear in the corner of the screen, like a video call or speech bubble. An example of using a live message: "Hello everyone, shall we start the conference? 🎉 Follow my avatar to the conference area and open the video app 🚀"
            settings: "الإعدادات", // Settings
        },
        textMessage: {
            title: "رسالة نصية", // Text message
            notice: `
            تتيح لك الرسالة النصية إرسال رسالة إلى جميع الأشخاص في الغرفة أو في العالم.

            ستظهر هذه الرسالة كنافذة منبثقة في أعلى الصفحة، مصحوبة بصوت للإشارة إلى أن المعلومات قابلة للقراءة.

            مثال على رسالة: "يبدأ المؤتمر في الغرفة 3 بعد دقيقتين 🎉. يمكنك الذهاب إلى منطقة المؤتمر 3 وفتح تطبيق الفيديو 🚀"
            `, // The text message allows you to send a message to everyone in the room or in the world. This message will appear as a popup at the top of the page, accompanied by a sound to indicate that the information is readable. An example of a message: "The conference in room 3 starts in 2 minutes 🎉. You can go to conference area 3 and open the video app 🚀"
            button: "إرسال رسالة نصية", // Send a text message
            noAccess: "ليس لديك حق الوصول إلى هذه الميزة 😱 يرجى الاتصال بالمسؤول 🙏", // You do not have access to this feature 😱 Please contact the administrator 🙏
        },
        audioMessage: {
            title: "رسالة صوتية", // Audio message
            notice: `
            الرسالة الصوتية هي رسالة من نوع "MP3, OGG..." يتم إرسالها إلى جميع المستخدمين في الغرفة أو في العالم.

            سيتم تنزيل هذه الرسالة الصوتية وإرسالها إلى جميع الأشخاص الذين يتلقون هذا الإشعار.

            يمكن أن تتكون الرسالة الصوتية من تسجيل صوتي يشير إلى أن المؤتمر سيبدأ في غضون دقائق قليلة.
            `, // The audio message is a message of type "MP3, OGG..." that is sent to all users in the room or in the world. This audio message will be downloaded and sent to all people who receive this notification. An audio message can consist of an audio recording indicating that a conference will start in a few minutes.
            button: "إرسال رسالة صوتية", // Send an audio message
            noAccess: "ليس لديك حق الوصول إلى هذه الميزة 😱 يرجى الاتصال بالمسؤول 🙏", // You do not have access to this feature 😱 Please contact the administrator 🙏
        },
    },
};

export default megaphone;
