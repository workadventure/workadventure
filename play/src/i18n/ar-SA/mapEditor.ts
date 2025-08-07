import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    map: {
        refreshPrompt: "تم اكتشاف إصدار جديد من الخريطة. يتطلب التحديث", // Neue Version der Karte erkannt. Aktualisierung erforderlich
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
        silentProperty: {
            label: "صامت", // Stumm
            description: "عدم السماح بأي محادثات في الداخل", // Keine Gespräche im Inneren erlauben
        },
        textProperties: {
            label: "عنوان", // Überschrift
            placeholder: "أدخل النص الذي سيتم عرضه عند التفاعل مع الكائن هنا.", // Geben Sie hier den Text ein, der angezeigt wird, wenn Sie mit dem Objekt interagieren.
        },
        focusableProperties: {
            label: "قابل للتركيز", // Fokussierbar
            description: "ركز الكاميرا عند دخول هذا القطاع.", // Fokussieren Sie die Kamera beim Betreten dieses Bereichs.
            zoomMarginLabel: "هامش التكبير", // Zoom-Marge
            defaultButtonLabel: "التركيز على", // Fokussieren auf
        },
        jitsiProperties: {
            label: "غرفة جتسي", // Jitsi-Raum
            description: "ابدأ اجتماع جتسي عند الدخول.", // Starten Sie ein Jitsi-Meeting beim Betreten.
            roomNameLabel: "اسم الغرفة", // Raumname
            jitsiUrl: "رابط جتسي", // Jitsi-URL
            jitsiUrlPlaceholder: "meet.jit.si", // meet.jit.si
            roomNamePlaceholder: "اسم الغرفة", // Raumname
            defaultButtonLabel: "فتح غرفة جتسي", // Jitsi-Raum öffnen
            audioMutedLabel: "الصوت مكتوم افتراضيًا", // Standardmäßig stummgeschaltet
            moreOptionsLabel: "مزيد من الخيارات", // Mehr Optionen
            trigger: "تفاعل", // Interaktion
            triggerMessage: "رسالة توست", // Toast-Nachricht
            triggerShowImmediately: "عرض فوراً عند الدخول", // Sofort beim Betreten anzeigen
            triggerOnClick: "بدء كصغير في الشريط السفلي", // Als minimiert in der unteren Leiste starten
            triggerOnAction: "عرض رسالة توست عند الإجراء", // Aktionstoast mit Nachricht anzeigen
            closable: "يمكن إغلاقه", // Kann geschlossen werden
            noPrefix: "مشاركة مع غرف أخرى", // Mit anderen Räumen teilen
            width: "العرض", // Breite
            jitsiRoomConfig: {
                addConfig: "إضافة خيار", // Option hinzufügen
                startWithAudioMuted: "بدء مع ميكروفون معطل", // Mit deaktiviertem Mikrofon starten
                startWithVideoMuted: "بدء مع كاميرا معطلة", // Mit deaktivierter Kamera starten
                jitsiRoomAdminTag: "وسم المشرف لغرفة الاجتماع", // Moderator-Tag für den Meeting-Raum
                cancel: "إلغاء", // Abbrechen
                validate: "تحقق", // Validieren
            },
        },
        audioProperties: {
            label: "تشغيل ملف صوتي", // Audiodatei abspielen
            description: "تشغيل الصوت مع التحكم في مستوى الصوت.", // Audio mit einstellbarer Lautstärke abspielen.
            volumeLabel: "مستوى الصوت", // Lautstärke
            audioLinkLabel: "رابط الصوت", // Audiolink
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3", // https://xxx.yyy/smthing.mp3
            defaultButtonLabel: "تشغيل الموسيقى", // Musik abspielen
            error: "تعذر تحميل الصوت", // Sound konnte nicht geladen werden
        },
        linkProperties: {
            label: "فتح الرابط", // Link öffnen
            description: "فتح موقع ويب داخل WorkAdventure أو في تبويب جديد.", // Website innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            linkLabel: "رابط URL", // Link-URL
            newTabLabel: "فتح في تبويب جديد", // In neuem Tab öffnen
            trigger: "تفاعل", // Interaktion
            triggerMessage: "رسالة توست", // Toast-Nachricht
            triggerShowImmediately: "عرض فوراً عند الدخول", // Sofort beim Betreten anzeigen
            triggerOnClick: "بدء كصغير في الشريط السفلي", // Als minimiert in der unteren Leiste starten
            triggerOnAction: "عرض رسالة توست عند الإجراء", // Aktionstoast mit Nachricht anzeigen
            closable: "يمكن إغلاقه", // Kann geschlossen werden
            allowAPI: "السماح بـ API البرمجة النصية", // Scripting API erlauben
            linkPlaceholder: "https://example.com", // https://example.com
            defaultButtonLabel: "فتح الرابط", // Link öffnen
            width: "العرض", // Breite
            policy: "السماح بـ iFrame", // iFrame erlauben
            policyPlaceholder: "كامل الشاشة", // fullscreen
            errorEmbeddableLink: "الرابط غير قابل للتضمين", // Der Link ist nicht einbettbar
            messageNotEmbeddableLink: "الرابط غير قابل للتضمين. يمكن فتحه فقط في تبويب جديد", // Der Link ist nicht einbettbar. Er kann nur in einem neuen Tab geöffnet werden
            warningEmbeddableLink: "لا يمكن تضمين هذا الرابط.", // Dieser Link kann nicht eingebettet werden.
            errorInvalidUrl: 'يرجى إدخال URL صالح يبدأ بـ "https://")', // Bitte geben Sie eine gültige URL ein (beginnend mit "https://")
            findOutMoreHere: "تعرف على المزيد هنا", // Hier erfahren Sie mehr
            openPickerSelector: "فتح محدد المنتقي", // Picker-Selector öffnen
            forcedInNewTab: "فتح في تبويب جديد", // In neuem Tab öffnen
        },
        advancedOptions: "خيارات متقدمة", // Erweiterte Optionen
        speakerMegaphoneProperties: {
            label: "منطقة المتحدث", // Sprecherzone
            description: "", // ""
            nameLabel: "الاسم", // Name
            namePlaceholder: "منطقة المتحدث الخاصة بي", // MySpeakerZone
        },
        listenerMegaphoneProperties: {
            label: "منطقة الزائر", // Besucherzone
            description: "", // ""
            nameLabel: "اسم منطقة المتحدث", // Sprecherzonen-Name
            namePlaceholder: "منطقة المتحدث الخاصة بي", // MySpeakerZone
        },
        chatEnabled: "تم تفعيل الدردشة", // Chat aktiviert
        startProperties: {
            label: "منطقة البداية", // Startbereich
            description: "مكان يمكن للناس البدء فيه على الخريطة.", // Wo Leute auf der Karte starten können.
            nameLabel: "الاسم", // Name
            namePlaceholder: "منطقة البداية", // Startbereich
            type: "نوع نقطة البداية", // Startpositionstyp
            defaultMenuItem: "استخدام الافتراضي", // Standardmäßig verwenden
            hashMenuItem: "استخدام إذا كانت URL تحتوي على #[اسم المنطقة]", // Verwenden, wenn URL #[Bereichsname] enthält
        },
        exitProperties: {
            label: "منطقة الخروج", // Ausgangsbereich
            description: "مكان يمكن للناس فيه مغادرة الخريطة للوصول إلى أخرى.", // Wo Leute die Karte verlassen können, um zu einer anderen zu gelangen.
            exitMap: "مغادرة الخريطة", // Karte verlassen
            exitMapStartAreaName: "منطقة البداية", // Startbereich
            defaultStartArea: "منطقة البداية الافتراضية", // Standard-Startbereich
        },
        youtubeProperties: {
            label: "فتح فيديو يوتيوب", // Youtube-Video öffnen
            description: "فتح فيديو يوتيوب داخل WorkAdventure أو في تبويب جديد.", // YouTube-Video innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            error: "يرجى إدخال رابط يوتيوب صالح", // Bitte geben Sie eine gültige YouTube-URL ein
            disabled: "تم تعطيل تكامل يوتيوب.", // YouTube-Integration ist deaktiviert.
        },
        googleDocsProperties: {
            label: "فتح مستندات جوجل", // Google Docs öffnen
            description: "فتح مستندات جوجل داخل WorkAdventure أو في تبويب جديد.", // Google Docs innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            error: "يرجى إدخال رابط مستندات جوجل صالح", // Bitte geben Sie eine gültige Google Docs-URL ein
            disabled: "تم تعطيل تكامل مستندات جوجل.", // Google Docs-Integration ist deaktiviert.
        },
        klaxoonProperties: {
            label: "فتح كلكسون", // Klaxoon öffnen
            description: "فتح كلكسون داخل WorkAdventure أو في تبويب جديد.", // Klaxoon innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            error: "يرجى إدخال رابط كلكسون صالح", // Bitte geben Sie eine gültige Klaxoon-URL ein
            disabled: "تم تعطيل تكامل كلكسون.", // Klaxoon-Integration ist deaktiviert.
        },
        googleSheetsProperties: {
            label: "فتح جداول جوجل", // Google Sheets öffnen
            description: "فتح جداول جوجل داخل WorkAdventure أو في تبويب جديد.", // Google Sheets innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            error: "يرجى إدخال رابط جداول جوجل صالح", // Bitte geben Sie eine gültige Google Sheets-URL ein
            disabled: "تم تعطيل تكامل جداول جوجل.", // Google Sheets-Integration ist deaktiviert.
        },
        googleSlidesProperties: {
            label: "فتح عروض جوجل", // Google Slides öffnen
            description: "فتح عروض جوجل داخل WorkAdventure أو في تبويب جديد.", // Google Slides innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            error: "يرجى إدخال رابط عروض جوجل صالح", // Bitte geben Sie eine gültige Google Slides-URL ein
            disabled: "تم تعطيل تكامل عروض جوجل.", // Google Slides-Integration ist deaktiviert.
        },
        eraserProperties: {
            label: "ممحاة", // Eraser
            description: "مسح جميع الرسومات على الخريطة.", // Alle Zeichnungen auf der Karte löschen.
            defaultButtonLabel: "مسح", // Löschen
            error: "يرجى إدخال رابط ممحاة صالح", // Bitte geben Sie eine gültige Eraser-URL ein
            disabled: "تم تعطيل تكامل الممحاة.", // Eraser-Integration ist deaktiviert.
        },
        googleDriveProperties: {
            label: "فتح جوجل درايف", // Google Drive öffnen
            description: "فتح جوجل درايف داخل WorkAdventure أو في تبويب جديد.", // Google Drive innerhalb von WorkAdventure oder in einem neuen Tab öffnen.
            error: "يرجى إدخال رابط جوجل درايف صالح", // Bitte geben Sie eine gültige Google Drive-URL ein
            disabled: "تم تعطيل تكامل جوجل درايف.", // Google Drive-Integration ist deaktiviert.
        },
        restrictedRightsProperties: {
            label: "إضافة حقوق", // Rechte hinzufügen
            rightTitle: "حقوق الوصول / التحرير حسب وسم المستخدم", // Zugriffs- / Bearbeitungsrechte nach Benutzertag
            rightDescription:
                "تعريف الحقوق من يمكنه التفاعل مع المنطقة. إذا تركتها فارغة، يمكن للجميع استخدامها. إذا قمت بضبطها، يمكن فقط للمستخدمين الذين لديهم واحد على الأقل من هذه 'الوسوم' استخدامها.", // Rechte definieren, wer mit dem Bereich interagieren kann. Wenn Sie es leer lassen, kann jeder es verwenden. Wenn Sie es einstellen, können nur Benutzer, die mindestens einen dieser 'Tags' haben, es verwenden.
            rightWriteTitle: "حقوق التحرير", // Bearbeitungsrechte
            rightWriteDescription:
                "تعريف حقوق التحرير من يمكنه تغيير المنطقة. يمكن للمستخدمين الذين لديهم واحد من هذه الوسوم إنشاء أو تحديث أو حذف الكائنات في المنطقة.", // Bearbeitungsrechte definieren, wer den Bereich ändern kann. Benutzer, die einen dieser Tags haben, können Objekte im Bereich erstellen, aktualisieren oder löschen.
            rightReadTitle: "حقوق الوصول", // Zugriffsrechte
            rightReadDescription:
                "تعريف حقوق الوصول من يمكنه التفاعل مع المنطقة. يمكن للمستخدمين الذين لديهم واحد من هذه الوسوم دخول المنطقة واستخدام الكائنات فيها.", // Zugriffsrechte definieren, wer mit dem Bereich interagieren kann. Benutzer, die einen dieser Tags haben, können den Bereich betreten und Objekte im Bereich verwenden.
        },
        personalAreaConfiguration: {
            label: "المنطقة الشخصية", // Persönlicher Bereich
            description:
                "يمكن للمستخدمين المطالبة بالمناطق الشخصية كمساحتهم الخاصة. كمسؤول، يمكنك تحديد/سحب ملكية منطقة.", // Benutzer können persönliche Bereiche als ihren eigenen Raum beanspruchen. Als Administrator können Sie den Besitz eines Bereichs festlegen / widerrufen.
            accessClaimMode: "وضع المطالبة بالوصول", // Zugriffsbeanspruchungsmodus
            dynamicAccessClaimMode: "ديناميكي", // Dynamisch
            staticAccessClaimMode: "ثابت", // Statisch
            dynamicAccessDescription: "يمكن لأي شخص لديه وسوم مستخدمين مناسبة المطالبة بملكية المنطقة.", // Jeder mit den entsprechenden Benutzertags kann das Eigentum an der Zone beanspruchen.
            staticAccessDescription: "تعريف المالك للمنطقة يدويًا.", // Manuell den Eigentümer der Zone definieren.
            allowedTags: "وسوم المستخدمين المسموح بها", // Erlaubte Benutzertags
            allowedUser: "مستخدم مسموح", // Erlaubter Benutzer
            owner: "المالك", // Eigentümer
            revokeAccess: "سحب الوصول", // Zugriff widerrufen
        },
        excalidrawProperties: {
            label: "فتح إكسكاليدرا", // Excalidraw öffnen
            description: "لوحة بيضاء مفتوحة المصدر بأسلوب مرسوم يدويًا. تعاونية ومشفرة من النهاية إلى النهاية.", // Ein Open-Source-Whiteboard im handgezeichneten Stil. Kollaborativ und Ende-zu-Ende-verschlüsselt.
            error: "يرجى إدخال رابط إكسكاليدرا صالح", // Bitte geben Sie eine gültige Excalidraw-URL ein
            disabled: "تم تعطيل تكامل إكسكاليدرا.", // Excalidraw-Integration ist deaktiviert.
        },
    },
    areaEditor: {
        editInstructions: "انقر على منطقة لتعديل خصائصها", // Click on an area to edit its properties
        nameLabel: "الاسم", // Name
        nameLabelPlaceholder: "منطقتي", // MyArea
        areaDescription: "الوصف", // Description
        areaDescriptionPlaceholder: "منطقتي هي", // My area is
        areaSerchable: "قابل للبحث في وضع الاستكشاف", // Searchable in exploration mode
        addDescriptionField: "إضافة وصف", // Add description
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
            description: "ابحث، حمّل أو اختر كائنًا موجودًا وأضفه إلى الخريطة.", // Search, upload, or select an existing object and add it to the map.
        },
        title: "وضع الكائن", // Place object
        editing: "تعديل: {name}", // Editing: {name}
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
        },
        images: "صورة{{s}}", // Image{{s}}
        noImage: "لا توجد صورة", // No image
        customEntityEditorForm: {
            imageName: "اسم الصورة", // Image name
            tags: "وسوم", // Tags
            objectType: "نوع الكائن", // Object type
            floatingObject: "كائن عائم", // Floating object
            floatingObjectDescription: "يمكن وضع الكائن العائم بحرية على الخريطة. وإلا، سيتم ضبطه على شبكة الخريطة.", // A floating object can be placed freely on the map. Otherwise, it will snap to the map's grid.
            depth: "العمق", // Depth
            groundLevel: "مستوى الأرض", // Ground level
            custom: "مخصص", // Custom
            standing: "واقف", // Standing
        },
        buttons: {
            editEntity: "تعديل الكائن", // Edit entity
            back: "عودة", // Back
            cancel: "إلغاء", // Cancel
            delete: "حذف", // Delete
            save: "حفظ", // Save
            upload: "تحميل", // Upload
        },
    },
    settings: {
        loading: "جارٍ التحميل...", // Loading...
        megaphone: {
            title: "الميغا فون", // Megaphone
            description: "الميغا فون هو أداة تمكنك من بث صوتك إلى العالم بأسره أو إلى غرفة محددة.", // The megaphone is a tool that allows you to broadcast your voice to the entire world or to a specific room.
            inputs: {
                spaceName: "اسم الغرفة", // Room name
                spaceNameHelper:
                    "اسم الغرفة التي يمكن استخدام الميغا فون فيها. إذا تركته فارغًا، يمكن استخدامه في العالم بأسره. // The name of the room where the megaphone can be used. If left empty, it can be used worldwide.",
                scope: "النطاق", // Scope
                world: "العالم", // World
                room: "الغرفة", // Room
                rights: "الصلاحيات", // Rights
                rightsHelper:
                    "الصلاحيات التي يجب أن يمتلكها المستخدم لاستخدام الميغا فون. إذا تركته فارغًا، يمكن لأي شخص استخدام الميغا فون. // The rights a user must have to use the megaphone. If left empty, anyone can use the megaphone.",
                error: {
                    title: "خطأ", // Error
                    save: {
                        success: "تم حفظ إعدادات الميغا فون بنجاح", // Megaphone settings saved successfully
                        fail: "فشل في حفظ إعدادات الميغا فون", // Failed to save megaphone settings
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
