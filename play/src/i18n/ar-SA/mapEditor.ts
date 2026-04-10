import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    map: {
        refreshPrompt: "تم اكتشاف إصدار جديد من الخريطة. يتطلب التحديث", // Neue Version der Karte erkannt. Aktualisierung erforderlich
        deletePrompt: "تم حذف هذه الخريطة",
        deletePromptSubtitle: "تم قطع اتصالك بهذه الغرفة.",
        deletePromptDetails: "لن تؤدي إعادة التحميل إلى استعادة هذه الخريطة لأنها لم تعد موجودة.",
    },
    sideBar: {
        areaEditor: "تحرير المنطقة", // Fläche bearbeiten
        entityEditor: "تحرير الكيان", // Entität bearbeiten
        tileEditor: "تحرير البلاطة", // Kachel bearbeiten
        configureMyRoom: "تكوين غرفتي", // Mein Zimmer konfigurieren
        trashEditor: "سلة المهملات", // Papierkorb
        exploreTheRoom: "استكشاف الغرفة", // Raum erkunden
        closeMapEditor: "إغلاق محرر الخريطة", // Karteneditor schließen
        mapManagerActivated: "تم تفعيل مدير الخريطة", // Kartenmanager aktiviert
        mapExplorerActivated: "تم تفعيل مستكشف الخريطة", // Kartenübersicht
        exploreTheRoomActivated: "تم تفعيل استكشاف الغرفة", // Raum erkunden aktiviert
        areaEditorActivated: "تم تفعيل تحرير المنطقة", // Fläche bearbeiten aktiviert
        entityEditorActivated: "تم تفعيل تحرير الكيان", // Entität bearbeiten aktiviert
        trashEditorActivated: "تم تفعيل سلة المهملات", // Papierkorb aktiviert
        configureMyRoomActivated: "تم تفعيل تكوين غرفتي", // Mein Zimmer konfigurieren aktiviert
    },
    properties: {
        silent: {
            label: "صامت",
            description: "عدم السماح بإجراء محادثات داخل المنطقة.",
            actionButtonLabel: "عدم الإزعاج",
        },
        text: {
            label: "نص العنوان",
            placeholder: "أدخل هنا النص الذي سيظهر عند التفاعل مع الكائن",
        },
        focusable: {
            label: "قابل للتركيز",
            description: "تركيز الكاميرا على هذه المنطقة عند الدخول.",
            zoomMarginLabel: "هامش التكبير",
            defaultButtonLabel: "التركيز على",
        },
        highlight: {
            label: "تمييز",
            description: "إضافة تأثير تمييز عند دخول المنطقة.",
            opacityLabel: "الشفافية",
            gradientWidthLabel: "عرض التدرج",
            colorLabel: "اللون",
            durationLabel: "مدة الانتقال (بالميلي ثانية)",
        },
        jitsiRoomProperty: {
            label: "غرفة Jitsi",
            description: "بدء اجتماع Jitsi عند الدخول.",
            roomNameLabel: "اسم الغرفة",
            jitsiUrl: "رابط Jitsi",
            jitsiUrlPlaceholder: "meet.jit.si",
            roomNamePlaceholder: "اسم الغرفة",
            defaultButtonLabel: "فتح غرفة Jitsi",
            audioMutedLabel: "كتم الميكروفون افتراضيًا",
            moreOptionsLabel: "خيارات إضافية",
            trigger: "التفاعل",
            triggerMessage: "رسالة منبثقة",
            triggerShowImmediately: "عرض فورًا عند الدخول",
            triggerOnClick: "بدء مصغرًا في الشريط السفلي",
            triggerOnAction: "إظهار إشعار إجراء مع رسالة",
            closable: "قابل للإغلاق",
            noPrefix: "مشاركة مع غرف أخرى",
            width: "العرض",
            jitsiRoomConfig: {
                addConfig: "إضافة خيار",
                startWithAudioMuted: "بدء مع ميكروفون مكتوم",
                startWithVideoMuted: "بدء مع كاميرا مغلقة",
                disableChat: "تعطيل الدردشة",
                jitsiRoomAdminTag: "وسم المشرف لغرفة الاجتماع",
                cancel: "إلغاء",
                validate: "اعتماد",
            },
            disabled: "تم تعطيل تكامل Jitsi لهذه الغرفة ❌",
            actionButtonLabel: "بدء اجتماع Jitsi",
        },
        playAudio: {
            label: "تشغيل ملف صوتي",
            description: "تشغيل صوت مع إمكانية ضبط مستوى الصوت.",
            volumeLabel: "مستوى الصوت",
            audioLinkLabel: "رابط الصوت",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "تشغيل الموسيقى",
            error: "تعذر تحميل الصوت",
            actionButtonLabel: "تشغيل الموسيقى",
        },
        openWebsite: {
            label: "فتح رابط",
            description: "فتح موقع ويب داخل WorkAdventure أو في تبويب جديد.",
            linkLabel: "عنوان الرابط",
            newTabLabel: "فتح في تبويب جديد",
            trigger: "التفاعل",
            triggerMessage: "رسالة منبثقة",
            triggerShowImmediately: "عرض فورًا عند الدخول",
            triggerOnClick: "بدء مصغرًا في الشريط السفلي",
            triggerOnAction: "إظهار إشعار إجراء مع رسالة",
            closable: "قابل للإغلاق",
            allowAPI: "السماح بواجهة Scripting API",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "فتح الرابط",
            width: "العرض",
            policy: "سماح iFrame",
            policyPlaceholder: "fullscreen",
            errorEmbeddableLink: "الرابط غير قابل للتضمين",
            messageNotEmbeddableLink: "هذا الرابط غير قابل للتضمين. لا يمكن فتحه إلا في تبويب جديد",
            warningEmbeddableLink: "لا يمكن تضمين هذا الرابط.",
            errorInvalidUrl: 'يرجى إدخال رابط صالح (يبدأ بـ "https://")',
            findOutMoreHere: "اعرف المزيد هنا",
            openPickerSelector: "فتح منتقي العناصر",
            forcedInNewTab: "إجبار على فتح تبويب جديد",
            openApplication: "فتح التطبيق",
            hideUrlLabel: "إخفاء الرابط",
            actionButtonLabel: "فتح الرابط",
        },
        advancedOptions: "خيارات متقدمة",
        speakerMegaphone: {
            label: "المنصة",
            description: 'يمكن للمستخدمين على المنصة (المسرح) التحدث إلى جميع الحاضرين في منطقة "الجمهور" المطابقة.',
            nameLabel: "الاسم",
            namePlaceholder: "المسرح الرئيسي",
            disabled: "المنصة معطلة لهذه الغرفة ❌",
            actionButtonLabel: "الانضمام إلى المنصة",
        },
        listenerMegaphone: {
            label: "الجمهور",
            description: "يمكن للمستخدمين في منطقة الجمهور سماع المتحدث على المنصة المرتبطة.",
            nameLabel: "اسم المنصة",
            disabled: "الجمهور معطل لهذه الغرفة ❌",
            waitingMediaLinkLabel: "الوسائط المعروضة قبل بدء البث",
            waitingMediaLinkPlaceholder: "https://www… (أدخل رابط الوسائط)",
            waitingMedialLinkError: "يبدو أن هناك مشكلة في الرابط الذي قدمته. هل يمكنك التحقق منه مرة أخرى؟ 🙏",
            waitingMedialLinkHelp: "يجب أن يكون الرابط الصحيح هو 'https://monlienmedia.com/…'.",
            waitingSpeaker: "بانتظار المتحدث",
            namePlaceholder: "منطقة المتحدث الخاصة بي",
            actionButtonLabel: "الانضمام إلى الجمهور",
        },
        chatEnabled: "ربط قناة دردشة مخصصة",
        seeAttendees: "عرض الحضور",
        start: {
            label: "منطقة البداية",
            description: "مكان يبدأ فيه الأشخاص على الخريطة.",
            nameLabel: "اسم البداية",
            namePlaceholder: "Enter1",
            type: "نوع موضع البداية",
            defaultMenuItem: "استخدام كافتراضي",
            hashMenuItem: "استخدام إذا احتوى الرابط على #[اسم المنطقة]",
            infoAreaName:
                "سيتم استخدام اسم المنطقة في محدد منطقة الخروج. يجب أن يكون فريدًا على الخريطة ولا يمكن أن يحتوي على مسافات أو أحرف خاصة.",
            actionButtonLabel: "الانتقال إلى نقطة البداية",
        },
        exit: {
            label: "منطقة الخروج",
            description: "مكان يغادر منه الأشخاص الخريطة إلى أخرى.",
            exitMap: "الخريطة الوجهة",
            exitMapStartAreaName: "اسم منطقة البداية",
            defaultStartArea: "منطقة البداية الافتراضية",
            actionButtonLabel: "الانتقال إلى الخروج",
        },
        youtube: {
            label: "فتح فيديو يوتيوب",
            description: "فتح فيديو يوتيوب داخل WorkAdventure أو في تبويب جديد.",
            error: "يرجى إدخال رابط يوتيوب صالح",
            disabled: "تم تعطيل تكامل يوتيوب.",
            actionButtonLabel: "فتح فيديو يوتيوب",
        },
        googleDocs: {
            label: "فتح مستندات جوجل",
            description: "فتح مستندات جوجل داخل WorkAdventure أو في تبويب جديد.",
            error: "يرجى إدخال رابط مستندات جوجل صالح",
            disabled: "تم تعطيل تكامل مستندات جوجل.",
            actionButtonLabel: "فتح مستندات جوجل",
        },
        klaxoon: {
            label: "فتح Klaxoon",
            description: "فتح Klaxoon داخل WorkAdventure أو في تبويب جديد.",
            error: "يرجى إدخال رابط Klaxoon صالح",
            disabled: "تم تعطيل تكامل Klaxoon.",
            actionButtonLabel: "فتح Klaxoon",
        },
        googleSheets: {
            label: "فتح جداول جوجل",
            description: "فتح جداول جوجل داخل WorkAdventure أو في تبويب جديد.",
            error: "يرجى إدخال رابط جداول جوجل صالح",
            disabled: "تم تعطيل تكامل جداول جوجل.",
            actionButtonLabel: "فتح جداول جوجل",
        },
        googleSlides: {
            label: "فتح عروض جوجل",
            description: "فتح عروض جوجل داخل WorkAdventure أو في تبويب جديد.",
            error: "يرجى إدخال رابط عروض جوجل صالح",
            disabled: "تم تعطيل تكامل عروض جوجل.",
            actionButtonLabel: "فتح عروض جوجل",
        },
        eraser: {
            label: "ممحاة",
            description: "مسح كل الرسوم على الخريطة.",
            defaultButtonLabel: "مسح",
            error: "يرجى إدخال رابط ممحاة صالح",
            disabled: "تم تعطيل تكامل الممحاة.",
            actionButtonLabel: "مسح الرسوم",
        },
        googleDrive: {
            label: "فتح Google Drive",
            description: "فتح Google Drive داخل WorkAdventure أو في تبويب جديد.",
            error: "يرجى إدخال رابط Google Drive صالح",
            disabled: "تم تعطيل تكامل Google Drive.",
            actionButtonLabel: "فتح Google Drive",
        },
        restrictedRightsPropertyData: {
            label: "إضافة حقوق",
            rightTitle: "حقوق الوصول/التحرير حسب وسم المستخدم",
            rightDescription:
                "الحقوق تحدد من يمكنه التفاعل مع المنطقة. إذا تركتها فارغة فالجميع يمكنه استخدامها. إن وضعتها، فلا يمكن استخدامها إلا لمن لديهم أحد هذه الوسوم.",
            rightWriteTitle: "حقوق التحرير",
            rightWriteDescription:
                "حقوق التحرير تحدد من يمكنه تعديل المنطقة. المستخدمون المطابقون لأحد هذه الوسوم يمكنهم إنشاء أو تحديث أو حذف كائن في المنطقة.",
            rightReadTitle: "حقوق الوصول",
            rightReadDescription:
                "حقوق الوصول تحدد من يمكنه التفاعل مع المنطقة. المستخدمون المطابقون لأحد هذه الوسوم يمكنهم دخول المنطقة واستخدام الكائنات داخلها.",
            actionButtonLabel: "الانتقال إلى الغرفة الخاصة",
        },
        personalAreaPropertyData: {
            label: "منطقة شخصية",
            description: "يمكن للمستخدمين المطالبة بمناطق شخصية كمساحتهم الخاصة. كمسؤول، يمكنك تعيين/سحب ملكية منطقة",
            accessClaimMode: "وضع المطالبة بالوصول",
            dynamicAccessClaimMode: "ديناميكي",
            staticAccessClaimMode: "ثابت",
            dynamicAccessDescription: "يمكن لأي شخص لديه وسوم مناسبة المطالبة بملكية المنطقة.",
            staticAccessDescription: "حدد مالك المنطقة يدويًا.",
            allowedTags: "وسوم المستخدمين المسموح بها",
            allowedUser: "مستخدم مسموح",
            owner: "المالك",
            revokeAccess: "سحب الوصول",
            actionButtonLabel: "الانتقال إلى المكتب الشخصي",
        },
        excalidraw: {
            label: "فتح Excalidraw",
            description: "لوحة بيضاء مفتوحة المصدر بأسلوب مرسوم يدويًا. تعاونية ومشفرة طرفًا لطرف.",
            error: "يرجى إدخال رابط Excalidraw صالح",
            disabled: "تم تعطيل تكامل Excalidraw.",
            actionButtonLabel: "فتح Excalidraw",
        },
        cards: {
            label: "فتح Cards",
            description: "أسرع وأسهل طريقة لمشاركة المعرفة عبر الإنترنت وعلى Teams والجوال.",
            error: "يرجى إدخال رابط Cards صالح",
            disabled: "تم تعطيل تكامل Cards.",
            actionButtonLabel: "فتح Cards",
        },
        tldraw: {
            label: "فتح tldraw",
            description: "لوحة بيضاء / لوحة قماشية لا نهائية SDK.",
            error: "يرجى إدخال رابط tldraw صالح",
            disabled: "تم تعطيل تكامل tldraw.",
            actionButtonLabel: "فتح tldraw",
        },
        matrixRoomPropertyData: {
            label: "ربط غرفة Matrix",
            description: "اربط غرفة Matrix بمنطقتك",
            openAutomaticallyChatLabel: "فتح الدردشة تلقائيًا",
            roomNameLabel: "اسم عرض الغرفة",
            roomNameLabelPlaceholder: "غرفتي",
            defaultChatRoomAreaName: "منطقة الغرفة",
            actionButtonLabel: "بدء الدردشة",
        },
        tooltipPropertyData: {
            label: "فقاعة معلومات",
            description: "أضف فقاعة معلومات إلى منطقتك ℹ️",
            contentPlaceholder: "اكتب المحتوى هنا ✍️",
            duration: "المدة (بالثواني) ⏱️",
            infinityDuration: "مدة غير محدودة ⏱️",
            actionButtonLabel: "عرض فقاعة المعلومات",
        },
        openFile: {
            label: "فتح ملف",
            description: "افتح ملفًا داخل WorkAdventure.",
            error: "يرجى إدخال ملف صالح",
            disabled: "تم تعطيل تكامل الملفات.",
            fileUrlLabel: "رابط الملف",
            uploadFile: {
                title: "أضف ملفك",
                description: "اسحب وأفلت أو اختر ملفك",
                dragDrop: "اسحب وأفلت أو",
                chooseFile: "اختر ملف",
                errorOnFileFormat: "تنسيق الملف غير مدعوم",
                errorOnFileNumber: "إسقاط ملفات متعددة غير مدعوم",
                errorOnFileSize: "الملف كبير جدًا، الحد الأقصى للحجم هو {size} ميجابايت",
            },
            hideUrlLabel: "إخفاء الرابط",
            actionButtonLabel: "فتح الملف",
        },
        livekitRoomProperty: {
            label: "غرفة الاجتماع",
            description: "بدء اجتماع عند الدخول.",
            roomNameLabel: "اسم الغرفة",
            roomNamePlaceholder: "اسم الغرفة",
            highlightAreaOnEnter: "تمييز المنطقة عند الدخول",
            moreOptionsLabel: "خيارات إضافية",
            livekitRoomConfig: {
                addConfig: "إضافة خيار",
                startWithAudioMuted: "بدء مع ميكروفون مكتوم",
                startWithVideoMuted: "بدء مع كاميرا مغلقة",
                disableChat: "تعطيل الدردشة",
                livekitRoomAdminTag: "وسم المشرف لغرفة الاجتماع",
                cancel: "إلغاء",
                validate: "اعتماد",
            },
            actionButtonLabel: "بدء الاجتماع",
        },
        maxUsersInAreaPropertyData: {
            label: "الحد الأقصى للمستخدمين",
            description: "تعيين الحد الأقصى لعدد المستخدمين في المنطقة.",
            placeholder: "15",
        },
        lockableAreaPropertyData: {
            label: "منطقة قابلة للقفل",
            description: "قفل المنطقة لمنع الدخول من الخارج.",
            lockLabel: "قفل المنطقة",
            allowedTagsLabel: "الوسوم المسموح بها للقفل/الفتح",
            allowedTagsInfo:
                "يمكن فقط للمستخدمين الذين لديهم هذه الوسوم قفل أو فتح هذه المنطقة. اتركه فارغًا للسماح للجميع.",
        },
        noProperties: "لا توجد خصائص محددة",
    },
    areaEditor: {
        editInstructions: "انقر على منطقة لتعديل خصائصها", // Click on an area to edit its properties
        nameLabel: "الاسم", // Name
        nameLabelPlaceholder: "منطقتي", // MyArea
        areaDescription: "الوصف", // Description
        areaDescriptionPlaceholder: "منطقتي هي", // My area is
        areaSerchable: "قابل للبحث في وضع الاستكشاف", // Searchable in exploration mode
        addDescriptionField: "إضافة وصف", // Add description
        clickAgainToSelectAnotherZone: "يمكنك النقر مرة أخرى لتحديد منطقة أخرى", // You can click again to select another zone
        actionPopupOnPersonalAreaWithEntities: {
            title: "إجراء مطلوب", // Action required
            description: "يحتوي هذا المجال الشخصي على كائن واحد أو أكثر. ماذا تريد أن تفعل معه؟", // This personal area contains one or more objects. What would you like to do with it?
            buttons: {
                keep: "احتفظ", // Keep
                remove: "أزل", // Remove
                cancel: "إلغاء", // Cancel
            },
        },
        nameHelpText: "سيتم عرض هذا الاسم للمستخدمين عند دخولهم المنطقة.", // This name will be shown to users when they enter the area.
    },
    areaEditorInstructions: {
        title: "كيف يعمل؟", // How does it work?
        description: "ارسم منطقة على الخريطة لإنشاء منطقة جديدة.", // Draw an area on the map to create a new one.
    },
    entityEditor: {
        header: {
            title: "أضف كائن إلى خريطتك", // Add an object to your map
            description: "ابحث، حمِّل أو اختر كائنًا موجودًا وأضفه إلى الخريطة.", // Search, upload, or select an existing object and add it to the map.
            choose: "اختر كائنًا",
        },
        title: "وضع الكائن", // Place object
        editing: "تعديل: {name}", // Editing: {name}
        drop: "أسقط ملفك في أي مكان",
        itemPicker: {
            searchPlaceholder: "بحث", // Search
            backToSelectObject: "العودة لاختيار الكائن", // Back to select object
        },
        trashTool: {
            delete: "انقر على الكائن لحذفه!", // Click on the object to delete it!
        },
        deleteButton: "حذف", // Delete
        testInteractionButton: "اختبار التفاعل", // Test interaction
        buttonLabel: "تصنيف الأزرار", // Button label
        editInstructions: "انقر على كائن لتعديل خصائصه", // Click on an entity to edit its properties
        selectObject: "انقر على كائن لاختياره", // Click on an object to select it
        objectName: "اسم الكائن", // Object name
        objectNamePlaceholder: "كائني", // MyObject
        objectDescription: "وصف الكائن", // Object description
        objectDescriptionPlaceholder: "كائني هو...", // My object is...
        objectSearchable: "قابل للبحث في وضع الاستكشاف", // Searchable in exploration mode
        addDescriptionField: "إضافة وصف", // Add description
        uploadEntity: {
            title: "إضافة صورة", // Add image
            description: "اسحب وأفلت صورتك أو اخترها لإضافتها إلى الخريطة.", // Drag & drop your image or select it to add it to the map.
            dragDrop: "اسحب وأفلت أو", // Drag and drop or
            chooseFile: "اختر ملف", // Choose file
            errorOnFileFormat: "تنسيق الملف غير مدعوم", // File format not supported
            errorOnFileNumber: "التحميل المتعدد للملفات غير مدعوم", // Multiple file uploads are not supported
            errorOnFileSize: "الملف كبير جدًا، الحد الأقصى للحجم هو {size} ميجابايت", // File is too large, max size is {size} MB
        },
        images: "صورة{{s}}", // Image{{s}}
        noImage: "لا توجد صورة", // No image
        customEntityEditorForm: {
            imageName: "اسم الصورة", // Image name
            tags: "وسوم", // Tags
            writeTag: "اكتب وسمًا...",
            objectType: "نوع الكائن", // Object type
            floatingObject: "كائن عائم", // Floating object
            floatingObjectDescription: "يمكن وضع الكائن العائم بحرية على الخريطة. وإلا، سيتم ضبطه على شبكة الخريطة.", // A floating object can be placed freely on the map. Otherwise, it will snap to the map's grid.
            depth: "العمق", // Depth
            groundLevel: "مستوى الأرض", // Ground level
            custom: "مخصص", // Custom
            standing: "واقف", // Standing
            collision: "تصادم",
            wokaAbove: "وكا فوق",
            wokaBelow: "وكا تحت",
        },
        buttons: {
            editEntity: "تعديل الكائن", // Edit entity
            back: "عودة", // Back
            cancel: "إلغاء", // Cancel
            delete: "حذف", // Delete
            save: "حفظ", // Save
            upload: "تحميل", // Upload
        },
        errors: {
            dragNotConnected: "لا يمكنك تحميل الملفات إذا لم تكن مسجلاً الدخول وليس لديك الحقوق اللازمة.",
            dragNotAllowed: "ليست لديك صلاحية لتحميل الملفات على هذه الخريطة",
        },
    },
    settings: {
        loading: "جارٍ التحميل...",
        megaphone: {
            title: "الميغافون",
            description: "الميغافون أداة تتيح لك بث فيديو/صوت لجميع اللاعبين في الغرفة/العالم.",
            inputs: {
                spaceName: "اسم الفضاء",
                spaceNameHelper:
                    "إذا أردت البث لكل المستخدمين عبر غرف مختلفة ضمن نفس العالم، ضع نفس اسم الفضاء لكل إعدادات الميغافون واضبط النطاق على 'العالم'.",
                scope: "النطاق",
                world: "العالم",
                room: "الغرفة",
                notificationSound: "صوت الإشعار",
                notificationSoundNoSound: "بدون صوت",
                notificationSoundCustom: "مخصص",
                enableSoundNotifications: "تمكين إشعارات الصوت",
                rights: "الحقوق",
                rightsHelper:
                    "الحقوق تُحدد من يمكنه استخدام الميغافون. إن تركته فارغًا فالجميع يمكنه استخدامه. وإن وضعته فلا يمكن استخدامه إلا لمن لديه أحد هذه الوسوم.",
                audienceVideoFeedbackActivated: "وضع القاعة مفعّل",
                audienceVideoFeedbackActivatedDisabled: "وضع القاعة معطّل",
                audienceVideoFeedbackActivatedHelper:
                    "وضع القاعة مفعّل: استقبل تدفق الكاميرا والميكروفون لجميع المستخدمين (مع تفعيل الكاميرا والميكروفون) في الغرفة/العالم. لكن الحاضر لن يتمكن من رؤية الحاضرين الآخرين. معطّل افتراضيًا.",
                error: {
                    title: "يرجى إدخال عنوان",
                    save: {
                        success: "تم حفظ إعدادات الميغافون",
                        fail: "حدث خطأ أثناء حفظ إعدادات الميغافون",
                    },
                },
            },
        },
        recording: {
            title: "التسجيل",
            description: "حدد من يمكنه بدء التسجيل في الفقاعات وغرف الاجتماعات.",
            inputs: {
                rights: "الصلاحيات",
                rightsHelper:
                    "يمكن لأي شخص لديه وسم واحد على الأقل من هذه الأوسمة بدء التسجيل. اتركه فارغًا للسماح لأي مستخدم مسجّل الدخول.",
                enableSounds: "تشغيل إشعار صوتي عند بدء التسجيل وإيقافه",
                enableSoundsHelper: "عند التفعيل، سيسمع جميع المشاركين إشعارًا صوتيًا عند بدء أو إيقاف التسجيل.",
                error: {
                    save: {
                        success: "تم حفظ إعدادات التسجيل",
                        fail: "حدث خطأ أثناء حفظ إعدادات التسجيل",
                    },
                },
            },
        },
        room: {
            title: "إعدادات الغرفة", // Room settings
            description: "قم بتكوين غرفتك", // Configure your room
            inputs: {
                name: "اسم الغرفة", // Room name
                description: "وصف الغرفة", // Room description
                tags: "وسوم", // Tags
                copyright: "ترخيص الغرفة", // Room license
                thumbnail: "صورة مصغرة للغرفة", // Room thumbnail
            },
            helps: {
                description:
                    "وصف للخريطة. يمكن استخدامه في شبكات التواصل الاجتماعي عند مشاركة رابط الخريطة. // A description of the map. Can be used on social networks when sharing a map link.",
                tags: "قائمة من الوسوم. يمكن استخدامها لمنح الوصول إلى الخريطة. // A list of tags. Can be used to grant access to the map.",
                thumbnail:
                    "رابط إلى صورة مصغرة. تُستخدم هذه الصورة في شبكات التواصل الاجتماعي عند مشاركة رابط الخريطة. // URL to a thumbnail image. This image is used on social networks when sharing a map link.",
                copyright:
                    "إشعار حقوق الطبع والنشر لهذه الخريطة. يمكن أن يكون رابطًا لترخيص. قد تحتوي أجزاء من هذه الخريطة مثل مجموعات البلاط أو الصور على حقوق طبع ونشر خاصة بها. // Copyright notice for this map. Can be a link to a license. Parts of this map like tilesets or images may have their own copyrights.",
            },
            actions: {
                save: "حفظ", // Save
                confirm: "تأكيد", // Confirm
                success: "تم حفظ إعدادات الغرفة", // Room settings saved
                error: "خطأ في حفظ إعدادات الغرفة", // Error saving room settings
            },
            confirmSave:
                "أكد أنك تريد حفظ التغييرات على الخريطة. سيؤدي هذا إلى إنشاء إصدار جديد من الخريطة، وفصل جميع اللاعبين، وإعادة تحميل الخريطة لجميع اللاعبين.", // Confirm that you want to save changes to the map. This will create a new version of the map, disconnect all players, and reload the map for all players.
        },
    },
    explorer: {
        title: "استكشاف الغرفة", // Explore room
        description:
            "يسمح باستكشاف الغرفة. يمكنك التحرك في الغرفة والتفاعل مع الكائنات. هناك وضعان: 'استكشاف' و 'بحث'. في 'وضع البحث'، يمكنك البحث عن الكيانات والمناطق في الغرفة أو تصفيتها. في 'وضع الاستكشاف'، يمكنك التحرك بحرية في الغرفة.", // Allows exploring the room. You can move around the room and interact with objects. There are 2 modes: 'Exploration' and 'Search'. In 'Search mode', you can search for entities and areas in the room or filter them. In 'Exploration mode', you can move freely in the room.
        noEntitiesFound: "لم يتم العثور على كائن في الغرفة 🙅‍♂️", // No entity found in the room 🙅‍♂️
        entitiesFound: "تم العثور على {{s}} كائنات", // {{s}} objects found
        noAreasFound: "لم يتم العثور على منطقة في الغرفة 🙅‍♀️", // No area found in the room 🙅‍♀️
        areasFound: "تم العثور على {{s}} مناطق", // {{s}} areas found
        noDescriptionFound: "لم يتم العثور على وصف 🫥", // No description found 🫥
        details: {
            close: "إغلاق", // Close
            moveToEntity: "الانتقال إلى الكائن {name}", // Move to entity {name}
            moveToArea: "الانتقال إلى المنطقة {name}", // Move to area {name}
            errorMovingToObject: "الكائن غير متاح بعد 🚫", // The object is not accessible yet 🚫
        },
        zoomIn: "تكبير", // Zoom In +
        zoomOut: "تصغير", // Zoom Out -
        showMyLocation: "إظهار موقعي", // Show my location
    },
    listRoom: {
        isFetching: "جارٍ تحميل قائمة الغرف... ⤵️", // Fetching room list... ⤵️
        noRoomFound: "لم يتم العثور على غرفة 🙅‍♂️", // No room found 🙅‍♂️
        items: "{countEntity} كائنات / {countArea} مناطق", // {countEntity} entities / {countArea} areas
        close: "إغلاق", // Close
        movingToRoom: "الانتقال إلى الغرفة: {roomNameSelected}... إلى اللقاء... 🫡", // Moving to room: {roomNameSelected}... See you soon... 🫡
        searchLabel: "ابحث عن غرفة", // Search for a room
        searchPlaceholder: "اكتب...", // Type...
    },
};

export default mapEditor;
