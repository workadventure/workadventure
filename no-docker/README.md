# تشغيل WorkAdventure بدون Docker 🚀

هذه الصفحة تشرح **تحليل بنية المشروع** وطريقة **تشغيله بالكامل بدون Docker**، لتجربته على أي جهاز
(ويندوز / ماك / لينكس) حتى لو لم يكن Docker مثبتًا أو لا يعمل عليه.

---

## 1) تحليل المشروع

WorkAdventure عبارة عن **monorepo** (npm workspaces) يحتوي على عدة خدمات مصغّرة (microservices)
تتواصل معًا خلف بروكسي عكسي (Traefik داخل Docker):

| المجلد | الخدمة | الوظيفة |
|---|---|---|
| `play/` | **الواجهة (Vite + Svelte + Phaser)** | اللعبة والمتصفح الرئيسي الذي يفتحه المستخدم |
| `play/` | **Pusher** (نفس المشروع) | خادم HTTP + WebSocket للاتصال اللحظي (غرف، حركة، محادثة) |
| `play/` | **Room API** | واجهة gRPC للتحكم بالغرف برمجيًا |
| `back/` | **Back** | منطق الغرف الخلفي (gRPC + HTTP): مجموعات، متغيرات، اجتماعات فيديو |
| `map-storage/` | **Map Storage** | تخزين وتحرير الخرائط (الخرائط بصيغة WAM) + واجهة إدارة صغيرة |
| `uploader/` | **Uploader** | رفع الملفات (دردشة/مرفقات) |
| `messages/` | **Protobuf** | توليد كود TypeScript من تعريفات `.proto` (خط بناء فقط) |
| `libs/` | مكتبات مشتركة | `@workadventure/messages`, `shared-utils`, `map-editor`... |
| `maps/` | الخرائط التجريبية | خريطة البداية `starter/map.json` (ملفات ثابتة) |
| خدمات اختيارية | Redis, Synapse (Matrix), OIDC mock, LiveKit, icon server, Traefik | تُشغَّل عبر Docker فقط للخصائص المتقدمة |

### ما الذي يفعله Docker عادةً؟

1. يشغّل حاويات Node لكل خدمة مع **Traefik** يوجّه الطلبات حسب الـ Host:
   `play.workadventure.localhost` ← الواجهة والـ pusher، `api.*` ← back، `map-storage.*` … إلخ.
2. يشغّل **Redis** (تخزين متغيرات اللاعبين) و**OIDC mock** (تسجيل دخول تجريبي) و**Synapse** (دردشة Matrix).
3. يولّد ملفات **protobuf** و**i18n** عند الإقلاع.

### الخلاصة: ما هو الضروري فعليًا لتجربة اللعبة؟

| المكوّن | ضروري؟ | البديل بدون Docker |
|---|---|---|
| الواجهة + Pusher + Back | **نعم** | تشغيل مباشر بـ Node |
| توليد protobuf + i18n | **نعم** (مرة واحدة) | `npm` + `scripts/gen-proto.mjs` |
| خادم خرائط ثابت + بروكسي عكسي | **نعم** | `no-docker/gateway.mjs` (يستبدل Traefik ويخدم `maps/`) |
| map-storage + uploader | للتجربة الكاملة | تشغيل مباشر بـ Node |
| Redis | لا | بدونه تعمل الذاكرة المؤقتة محليًا (Void repository) |
| OIDC mock | لا | وضع **دخول مجهول (Anonymous)** |
| Synapse/Matrix | لا | دردشة القرب (Proximity chat) تعمل بدونه، وMatrix يُعطَّل تلقائيًا |
| LiveKit / Coturn | لا | اجتماعات الفيديو عبر Jitsi الافتراضي (`meet.jit.si`) |

---

## 2) التشغيل بدون Docker

### المتطلبات

- **Node.js ≥ 20** (يُفضّل 22 LTS أو أحدث) و**npm** — [nodejs.org](https://nodejs.org)
- **git** (مكتبة `uWebSockets.js` تُثبَّت من GitHub)
- اتصال إنترنت أول مرة (لتنزيل الحزم وتوليد protobuf)
- أنظمة Unix أو Windows (أو WSL / Git Bash)

### خطوة واحدة!

```bash
node no-docker/start.mjs
```

هذا الأمر يقوم تلقائيًا بـ:

1. إنشاء `.env` من `.env.template` إن لم يكن موجودًا.
2. `npm install` للحزم الأساسية وحزمة `messages` (يتخطى تنزيل متصفحات Playwright).
3. توليد كود **protobuf** (`libs/messages/src/ts-proto-generated/`) إن كان مفقودًا.
4. توليد ترجمات **typesafe-i18n** وبناء **iframe API** إن كانت مفقودة.
5. تشغيل الخدمات: **back, pusher, الواجهة (Vite), map-storage, uploader**.
6. تشغيل **البوابة** (بديل Traefik) التي تجمع كل شيء خلف رابط واحد.

ثم افتح الرابط الذي يظهر لك (مثال: `http://play.workadventure.localhost:8080`) وجرّب!
لرؤية تعدد اللاعبين افتح **نافذتين** من نفس الرابط.

> 💡 على معظم الأنظمة تعمل أسماء `*.localhost` تلقائيًا وتشير إلى `127.0.0.1`.
> إن لم يفتح الرابط، أضف في ملف المضيفات (`/etc/hosts` أو `C:\Windows\System32\drivers\etc\hosts`):
> ```
> 127.0.0.1 play.workadventure.localhost front.workadventure.localhost
> ```

### خيارات إضافية

```bash
node no-docker/start.mjs --dev                 # + مراقبة التغييرات (svelte-check, i18n, iframe-api, proto)
node no-docker/start.mjs --port=3000           # منفذ البوابة بدل 80 (لا يحتاج صلاحيات مدير)
node no-docker/start.mjs --host=0.0.0.0        # السماح بالوصول من أجهزة أخرى على الشبكة
node no-docker/start.mjs --with-map-storage-ui # واجهة إدارة الخرائط على /map-storage/ui/
node no-docker/start.mjs --no-map-storage      # بدون خدمة حفظ الخرائط
node no-docker/start.mjs --no-uploader         # بدون خدمة الرفع
node no-docker/start.mjs --reinstall           # إعادة npm install وتوليد الملفات من جديد
node no-docker/start.mjs --map=school          # خريطة البداية: مجلد داخل ./maps (الافتراضي: starter)
node no-docker/start.mjs --world=/maps/school/map.json  # أو: مسار START_ROOM_URL كاملًا مباشرة
node no-docker/start.mjs --tunnel              # خلف نفق عام/معاينة (يعطّل HMR ويضبط https)
node no-docker/start.mjs --help                # المساعدة
```

**ملاحظة عن المنفذ 80:** إن لم يكن بالإمكان ربط المنفذ 80 (يحتاج صلاحيات مدير على بعض الأنظمة)
يختار المُشغِّل تلقائيًا 8080 ثم 8000، ويحسب كل الروابط تبعًا لذلك. يمكنك أيضًا تحديده يدويًا بـ `--port`.

### الاستخدام اليومي

| ماذا تريد | كيف |
|---|---|
| إيقاف كل شيء | `Ctrl+C` في نافذة الطرفية |
| إعادة التشغيل | `node no-docker/start.mjs` مرة أخرى |
| الدخول | بدون تسجيل (مجهول) — اختر اسمًا وشخصية |
| تجربة تعدد اللاعبين | افتح الرابط في نافذتين واقترب بين الشخصيات |
| رؤية لوحة Traefik القديمة | غير متاحة بدون Docker (البوابة البديلة تسجّل كل شيء في الطرفية) |

---

## 3) خريطة المنافذ والمسارات

البوابة تجمع كل الخدمات خلف **استضافة واحدة** (وضع single-domain) وبنفس الوقت تحترم أسماء
مضيفي Docker المتعددة (لو أضفت استضافات `*.workadventure.localhost`):

| المسار على الرابط العام | يُوجَّه إلى | المنفذ الداخلي |
|---|---|---|
| `/` (وكل شيء غير مذكور) | play pusher | 3000 |
| `/ws/…` | WebSocket الخاص بالـ pusher | 3001 |
| `/api/…` | back (HTTP) | 3020 |
| `/uploader/…` | uploader | 3040 |
| `/map-storage/…` | map-storage | 3030 |
| `/map-storage/ui/…` | واجهة map-storage (اختيارية) | 3031 |
| `/maps/…` | مجلد `maps/` (خريطة البداية) | ملفات ثابتة |
| `/src/…` `/node_modules/…` `/@vite/…` … | Vite dev server | 3010 |
| `/icon/…` | رد 204 (بديل مصغّر لخدمة الأيقونات) | — |

منافذ داخلية أخرى: back gRPC `50051` — Room API gRPC `50052` — map-storage gRPC `50053`
— منافذ تطوير (debug inspector): `9231-9234`.

كلها قابلة للتغيير بمتغيّرات البيئة (`PUSHER_HTTP_PORT`, `HTTP_PORT`, `MAP_STORAGE_HTTP_PORT`, …)
إن وجد تعارض مع برنامج آخر على جهازك.

---

## 4) ما الذي تخلّصنا منه (البدائل)

| Docker (أصلًا) | بدون Docker |
|---|---|
| Traefik | `no-docker/gateway.mjs` (Node خالص، بدون حزم إضافية) |
| خادم Apache لـ `maps/` | نفس البوابة تخدم الملفات الثابتة مع CORS |
| حاوية `messages` لتوليد protobuf | `messages/scripts/gen-proto.mjs` (يعمل على ويندوز/ماك/لينكس) |
| `sed -i` في توليد protobuf | نفس السكربت (Node) |
| OIDC mock | وضع anonymous |
| Redis | بدونه (متغيرات اللاعبين غير مخزَّنة — تكفي للتجربة) |
| Synapse (Matrix) | دردشة القرب تعمل، Matrix معطّل |
| icon server | `/icon` يرد 204 (أيقونات المواقع المضمّنة فقط تتأثر) |

---

## 5) استكشاف الأخطاء

**`npm install` يفشل في `uWebSockets.js`**
تثبَّت من GitHub — تأكد من وجود `git` واتصال الإنترنت. جرّب: `git --version`.

**توليد protobuf يفشل (grpc-tools)**
يعتمد على تنزيل أداة `protoc` مُصرَّفة أول مرة. أعد المحاولة: `cd messages && npm install && npm run ts-proto`.
على ويندوز إن استمر الفشل شغّل من **Git Bash** أو **WSL**.

**الرابط `play.workadventure.localhost` لا يفتح**
أضف السطر إلى ملف المضيفات (انظر أعلاه)، أو استخدم `--port` وافتح `http://127.0.0.1:المنفذ` مباشرة
(سيعمل، لكن الروابط المولَّدة ستستخدم اسم `play.workadventure.localhost`).

**منفذ مشغول (EADDRINUSE)**
البوابة تختار منفذًا بديلًا تلقائيًا. أما المنافذ الداخلية فغيّرها بمتغيّرات البيئة (انظر الجدول أعلاه).

**Vite يرفض Host header**
تأكد أن `WA_DEV_ALLOWED_HOSTS=true` موجود (مُضافة تلقائيًا عبر `start.mjs`).

**أريد وضع التطوير الكامل (تعديل الكود مع إعادة تحميل تلقائية)**
`node no-docker/start.mjs --dev` — يشغّل المراقبات: `typesafe-i18n-watch`, `svelte-check-watch`,
`watch-iframe-api`, `proto:watch`. والواجهة والـ pusher والـ back كلها تراقب التغييرات أيضًا.

**رسالة خطأ GLIBC عند تشغيل pusher (لينكس فقط)**
أحدث بنود `uWebSockets.js` المبنية مسبقًا تتطلب glibc ≥ 2.38 (Debian 13 / Ubuntu 24.04 فأحدث).
على الأنظمة الأقدم (Debian 12 / Ubuntu 22.04) يكتشف `start.mjs` المشكلة ويصلحها تلقائيًا،
أو أصلحها يدويًا:
```bash
npm install --no-save github:uNetworking/uWebSockets.js#v20.52.0
```

**الدردشة الصوتية/الفيديو**
عند الاقتراب بين شخصيتين تبدأ المكالمة عبر **Jitsi** الافتراضي (`meet.jit.si` من `.env`) — لا يحتاج خادمًا محليًا.
للسيناريوهات المتقدمة (LiveKit / Coturn) استخدم ملفات `docker-compose.livekit.yaml` الأصلية.

**هل يعمل تحرير الخرائط (Map Editor)؟**
نعم على جهازك: خريطة بصيغة WAM تُدار عبر map-storage (`/~/…`). رفع خريطة تجريبية:
```bash
cd map-storage && npm run upload-test-map
```
(يستخدم الحساب الافتراضي `john.doe` / `password`.)

---

## 6) للمساهمين: التعديلات الصغيرة التي دعمت التشغيل بدون Docker

كلها متوافقة مع إعداد Docker الأصلي (القيم الافتراضية لم تتغير):

- `uploader/server.ts`, `map-storage/src/index.ts`: المنافذ قابلة للضبط بمتغيّرات البيئة.
- `play/vite.config.ts`, `map-storage/vite.config.ts`: منفذ Vite وHMR و`allowedHosts` قابلة للضبط.
- `play/src/pusher/services/LocalAdmin.ts`: دعم `{host}` في `START_ROOM_URL` ليُستبدل بمضيف الطلب الحالي.
- `messages/scripts/gen-proto.mjs`: توليد protobuf بلا `sed` (متوافق مع ويندوز/ماك).
