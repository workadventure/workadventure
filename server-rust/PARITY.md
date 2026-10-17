# PARITY — candidat Rust, jalon 1 (parité production)

Matrice de parité avec la production TypeScript (pusher + back + map-storage + uploader + Room API). Une ligne par
fonction : contrat, état réel, preuve, écart, prochaine action. Mise à jour à chaque tranche ; l'état est celui du
commit indiqué en tête du dernier passage.

**États :** `validé` (preuve rejouable : spec Playwright sur la stack `rust` ou test de scénario qui échoue sans
le code) · `implémenté non vérifié` (code présent, aucune preuve de bout en bout) · `partiel` (une partie du
contrat seulement, écart nommé) · `absent` · `hors périmètre explicite` (décision écrite, avec sa raison).

Revue qualité (sécurité, erreurs avalées, architecture, couverture, dette) : [`IMPROVEMENTS.md`](IMPROVEMENTS.md) ;
guide pour ajouter une fonction : [`docs/ADDING_A_FEATURE.md`](docs/ADDING_A_FEATURE.md).

Un paramètre lu ou un test sans assertion ne vaut pas `validé`. « Spec » = Playwright Chromium, stack
`dev/dev stack up rust --variant server`, comptes préchauffés (`dev/warm-auth.mjs`). « Réf. TS » = même spec sur la
stack `ts` du socle.

**Dernier passage :** branche `lang-rust`, `27df41e28` (2026-10-17), master `034dee80b`, socle `3e0c5bf05`. Inventaires TS du
17/10 (routes HTTP, messages WebSocket, intégrations), faits par des sous-agents sur le code TS du dépôt.

**Verrou :** remplacement de production interdit tant que les lignes Admin SaaS, white label, LiveKit,
enregistrement, persistance Redis et Room API ne sont pas `validé`.

---

## 1. Specs Playwright (`tests/tests`, 66 fichiers, ~290 tests)

| Spec(s) | Contrat | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| J1 + J2 : AvailabilityStatus, camera_order, error_pages, meeting, oidc, reconnect, say_bubbles, scripting_moveto, userlist, webrtc_reconnection, raise-hand, raise-hand-megaphone, map_editor_megaphone_speaker_zone, chat/proximityChatPoll, scripting_spaces | connexion, déplacements, bulles, P2P, spaces, état de space, megaphone | `validé` | non-régression J3a : 68 réussis, 2 sautés, 0 échec (`userlist` « Send Message » passe, échoue en TS) | — | rejouer à chaque tranche |
| Schémas des propriétés WAM (AreaDataProperty, EntityDataProperty) | une propriété acceptée doit passer `WAMFileFormat` au prochain chargement TS | `implémenté non vérifié` | test `properties_follow_the_map_editor_schemas` | — | rejouer J3a |
| J3a : areas, map_editor_* (12 fichiers hors livekit/megaphone), map_storage_upload, personal_area_claim, personal_desk_spawn_on_connect | éditeur de carte, map-storage | `validé` sauf une ligne | 70/72 (1 sauté Klaxoon), réf. TS 67/72 | `map_editor_open_website:29` échoue (échoue aussi en TS) : cause à établir | rejouer avec la réf. TS, classer (défaut de test / environnement / défaut TS / régression) |
| J3b : api_players, scripting_area, scripting_chat, scripting_enter_leave_layer, scripting_events, scripting_follow, scripting_open_cowebsite, scripting_playermessage, scripting_setStatus, scripting_startVideo, iframe_script, banner_script, buttonactionbar_script, modal_script, metadata, modules, moderation, report_issue, meeting_invitation | scripting, variables de joueur, événements, suivi, modération, invitations | `validé` sauf une ligne | 39 tests : 38 réussis (`metadata` rejouée après correction : 2/2) ; réf. TS 35 réussis, 7 échecs connus | `report_issue:7` : bouton conditionné à `SENTRY_DSN_FRONT`, absent de l'environnement de la stack (environnement, échoue aussi en TS) | — |
| variables.spec | variables de room persistantes, carte modifiée | `partiel` | `:188` échoue : la carte que le test écrit dans `maps/` n'est pas servie par le socle (404 sur `variables_tmp.json`), comme en TS ; `:61` est joué par le socle (redémarrages) | Redis non prouvé de bout en bout | demander au socle de jouer `:61` sur la stack rust ; signaler le 404 de `:188` |
| J3c : livekit, map_editor_livekit, recording, screensharing, room-api, swagger_doc, scripting_audio_stream | LiveKit, enregistrement, Room API, OpenAPI | `validé` sauf deux lignes | Chromium : livekit 5/5, map_editor_livekit 2/3, screensharing 1/1, recording 6/6 (`:62` et `:186` rejoués seuls 4/4), room-api 5/5, swagger_doc 1/1, scripting_audio_stream 1/2 ; réf. TS 19/20 | `map_editor_livekit:62` : POST en dur sur `api.workadventure.localhost:80` (environnement) ; `scripting_audio_stream:101` : échec connu TS (@scripting) ; sous forte charge (load 13-15), l'egress met 7 s à démarrer et un arrêt rapide l'annule (« Start signal not received ») | — |
| Médias côté front : adaptive_streaming, background_effects, media_devices, instant_unmute, noise_suppression, p2p_mute_keeps_sender, picture_in_picture, video_layout, webrtc_codecs, webrtc_cpu_limitation | P2P et réglages locaux | `implémenté non vérifié` | le relais P2P est validé par J1/J2 ; ces specs n'ont jamais été jouées sur Rust | `webrtc_cpu_limitation` dépend du passage LiveKit sur `cpuLimited` | jouer en lot après J3b |
| Front seul : browser_not_supported, translate, pwa_install_menu, responsive_actionbar, cowebsite_resize, chat/chatIme | pages et UI | `implémenté non vérifié` | non jouées | `pwa_install_menu` lit `/manifest.json` (absent, §2) | jouer en lot |
| Matrix : chat/matrixChat*, 7 fichiers | chat Matrix | `partiel` | jamais jouées sur Rust | login OIDC → Matrix présent ; salles des zones (`/roomArea`, `enterChatRoomAreaQuery`), `leaveChatRoomAreaMessage`, `chatMembersQuery` réel absents | après J3c |
| mobile/* (3 fichiers) | parcours mobiles | `implémenté non vérifié` | projet mobile non joué | — | jouer avec le projet mobile |

## 2. Routes HTTP

| Route | Contrat | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `GET /ping`, `GET /ready` | sondes | `validé` | image prod : `/ping` 200 ; `/ready` 503 jusqu'au gabarit | — | — |
| `GET /metrics` (+ `PROMETHEUS_PORT`, jeton Bearer) | métriques | `partiel` | test unitaire des noms ; jauges `nb_rooms`, `nb_sockets`, `nb_spaces`, `nb_clients_per_room`, `nb_groups_per_room`, `counter_groups_per_room` | `nb_publishers_per_space`, `nb_watchers_per_world` absentes | ajouter avec J3c |
| `GET /`, `/login`, `/_/*`, `/@/*`, `/~/*`, `/index.html` | page de jeu, méta-balises (pour un robot : `mapName`, `mapDescription` de la carte) | `validé` | specs J1, `metadata` 2/2 | `/@/*` sans admin distante répond en local ; carte d'un réseau privé lue si `STORE_VARIABLES_FOR_LOCAL_MAPS` (TS : liste d'URL de test codée en dur) | — |
| `GET /jwt`, `/manifest.json`, `/server.json` | page dépréciée, PWA (manifest habillé comme la page : méta-balises de l'admin), infos serveur | `implémenté non vérifié` | test `the_manifest_and_the_server_card…` ; `pwa_install_menu` en cours | `version` : celle du paquet du pusher (`1.0.0`), écrite en dur | — |
| `GET /.well-known/cf-custom-hostname-challenge/*` | défi Cloudflare via l'admin (A4) | `implémenté non vérifié` | — | — | parcours SaaS (`dev/saas`) |
| Statique local / proxy (`ASSETS_URL` + `ASSETS_INTERNAL_URL`) | assets du front | `validé` (mode proxy) | stacks du socle | mode fichiers locaux non testé | — |
| `GET /map` | détails de carte | `implémenté non vérifié` (admin) | specs J1 (LocalAdmin) | avec l'admin : A2, `thirdParty` retiré, jeton expiré accepté comme TS, `DISABLE_ANONYMOUS` | parcours SaaS |
| `POST /anonymLogin`, `GET /me` | jetons | `validé` (local) ; admin `implémenté non vérifié` | specs J1 | `/me` avec l'admin : A3 | parcours SaaS |
| `GET /login-screen`, `/openid-callback`, `/matrix-callback`, `/logout`, `/logout-callback` | OIDC | `validé` | `oidc.spec`, comptes OIDC des specs J3a | vérification du domaine A21 codée, non vérifiée | parcours SaaS |
| `GET /profile`, `/profile-callback` | page profil OIDC (A30, A31) | `implémenté non vérifié` | test `the_profile_pages_ask_the_provider…` (faux fournisseur) | page échappée (TS insère les valeurs telles quelles) ; sans admin, le rappel mène à `/profile` comme LocalAdmin | parcours SaaS |
| `GET /woka/list`, `/companion/list` | listes locales ou de l'admin (A19, A20) | `validé` (local) ; admin `implémenté non vérifié` | specs J1 | — | parcours SaaS |
| `POST /save-name`, `/save-textures`, `/save-companion-texture` | sauvegarde via l'admin (A9-A11, 204 exact) | `implémenté non vérifié` | — | sans admin : refus comme TS | parcours SaaS |
| `GET /local-script` | script localhost | `implémenté non vérifié` | — | — | — |
| `GET /rooms` | utilisateurs par room (`ADMIN_API_TOKEN`, en-tête `admin-token` ou `Authorization`) | `implémenté non vérifié` | — | une room qui ne répond pas en 1 s est omise, comme un back muet | `variables.spec:192` |
| `POST /global/event` | événement à toutes les rooms, sans émetteur | `validé` | `scripting_events` | — | — |
| `POST /room/refresh`, `POST /message`, `POST /external-module/event` | appels entrants de l'admin | `implémenté non vérifié` | — | — | parcours SaaS |
| `WS /ws/admin/rooms` (`ADMIN_SOCKETS_TOKEN`) | écoute admin : `listen` (présents puis arrivées et départs), `banned` par monde, refus 1008 | `implémenté non vérifié` | test `the_admin_socket_watches_rooms…` | — | parcours SaaS |
| `POST /roomArea`, `PATCH`, `DELETE` (`MAP_STORAGE_API_TOKEN`) | salles Matrix des zones | `absent` | — | Matrix | après J3c |
| `POST /livekit/egress/webhook` | webhook egress signé (JWT, `sha256` du corps) | `validé` | `recording` ; test `a_participant_token…` (signature, corps modifié, autre secret) | session d'un space disparu ignorée (TS la retrouve pour notifier l'admin) | avec l'admin (A23) |
| `GET /ping-backs`, `/dump`, `/debug/*` (back) | exploitation TS | `hors périmètre explicite` | — | un seul processus : pas de back à sonder ; outils de débogage propres au Node | — |
| `GET /openapi/pusher`, `/openapi/admin`, `/swagger-ui/` (`ENABLE_OPENAPI_ENDPOINT`) | documentation | `validé` | `swagger_doc` 1/1 | documents générés des sources TS (`tools/gen-openapi.sh`) et embarqués ; l'interface Swagger vient d'un CDN épinglé (swagger-ui-dist 5.32.6) au lieu de `node_modules` | regénérer quand les sources changent |
| map-storage : `GET *.wam`, `PUT`, `PATCH *.wam`, `DELETE`, `/move`, `/copy`, `/upload`, `/download`, `/upload-endpoint`, `/maps`, `/private/files/*`, fichiers servis | map-storage | `validé` | `map_storage_upload` 21/21 | `USE_DOMAIN_NAME_IN_PATH` (dossier par domaine), `AUTHENTICATION_VALIDATOR_URL` (A26), webhook sortant (A27), gabarit WAM (A28) codés, non vérifiés avec l'admin ; S3 absent ; `GET /validate`, `GET /` (UI), `/health/live`, auth Digest absents | parcours SaaS, puis S3 |
| uploader (port 3003) : `/upload-audio-message`, `/download-audio-message/:id`, `/upload-file`, `/upload-file/:id`, `/ping` | fichiers du chat, Redis `REDIS_DB_NUMBER` | `implémenté non vérifié` | test `uploaded_names_never_choose_a_dangerous_type` | stockage S3 (`AWS_BUCKET`) absent ; contrôle de taille par l'admin (A29) codé | `proximityChatFileTransfer.spec` ; S3 si la production l'utilise |

## 3. Messages WebSocket client → serveur

| Message | État | Preuve | Écart / prochaine action |
|---|---|---|---|
| `joinRoomFrontMessage`, `userMovesMessage`, `viewportMessage`, `pingMessage`, `askPositionMessage` | `validé` | specs J1, tests `room.rs` | — |
| `setPlayerDetailsMessage` | `partiel` | disponibilité, statut (J1) | `setVariable` (variables de joueur) : J3b |
| `addSpaceFilterMessage`, `removeSpaceFilterMessage`, `updateSpaceUserMessage`, `updateSpaceMetadataMessage`, `publicEvent`, `privateEvent`, `backEvent` | `validé` | specs J2, `space.rs` | contrôle admin de `muteAudioForEverybody` / `muteVideoForEverybody` / `kickOffUser` à vérifier (moderation.spec, J3b) |
| `editMapCommandMessage`, `setAreaPropertyVariableMessage` | `validé` | specs J3a ; test « la salle continue pendant un upload lent » | — |
| `queryMessage`, `abortQueryMessage` | `partiel` | voir §4 | — |
| `variableMessage` | `partiel` | test « room_variables_follow_the_map_rights… » ; `variables.spec:192` à jouer | variables de la carte (TMJ du stockage ou URL de la carte, contrôle réseau privé, 10 s, 50 Mo), droits `readableBy`/`writableBy`, diffusion filtrée, refus → `errorMessage` puis fermeture, relecture de la carte au plus toutes les 10 s ; Redis non vérifié de bout en bout (`variables.spec:61`, joué par le socle) ; Room API absente |
| `itemEventMessage`, `emotePromptMessage` (emoji seuls, 32 unités UTF-16), `lockGroupPromptMessage` | `validé` | tests `room.rs` (émote, bulle verrouillée), test de bots « players_reach_each_other… » | — |
| `followRequestMessage`, `followConfirmationMessage`, `followAbortMessage` | `partiel` | `scripting_follow`, `social.rs`, test de bots | un suiveur sorti du rayon ne reste pas dans la bulle (Group.ts le garde) | à traiter si un parcours le demande |
| `meetingInvitationRequestMessage`, `meetingInvitationResponseMessage` | `validé` | `meeting_invitation` 3/3, `social.rs` (5ᵉ invitation refusée) | — | — |
| `setPlayerDetailsMessage.setVariable` | `partiel` | `api_players` 9/9 (TS : 7/9) | portée monde `pw_<uuid>_\|@\|_<group>` (groupe des détails de carte, A2) codée, non vérifiée avec l'admin ; TTL plafonné par `PLAYER_VARIABLES_MAX_TTL` (le back prend le plus grand : écart volontaire) | parcours SaaS |
| `banPlayerMessage` | `partiel` | `moderation` 2/2 (kick local) | ban A7 puis `Kick{banned}`, ban par IP (adresse vue par le serveur si différente de celle du modérateur) : `implémenté non vérifié` ; l'IP vient de `X-Forwarded-For` seul | parcours SaaS |
| `playGlobalMessage`, `reportPlayerMessage` | `implémenté non vérifié` | test `an_admin_speaks_to_the_room…` (room) ; `map_editor_global_message` en cours | au monde : A6 avec `bypassTagFilter` ; report A5 ; `entityMessage` ignoré (le TS ne le traite pas non plus côté pusher) |
| `updateChatIdMessage`, `leaveChatRoomAreaMessage` | `partiel` | — | `updateChatId` A16 codé ; `leaveChatRoomAreaMessage` : Matrix |
| `videoQualityReportMessage`, `analyticsEventReportMessage` | `implémenté non vérifié` | test `analytics_reach_the_admin…` (faux admin, 422 découpé) | voir §6 Analytics |

## 4. Queries

| Query | État | Preuve | Écart / prochaine action |
|---|---|---|---|
| `joinSpaceQuery`, `leaveSpaceQuery`, `spaceStateQuery` (main levée, parole, sondages, Q&R, `setKind`) | `validé` | specs J2, `space.rs` | `startRecording`/`stopRecording` : J3c |
| `iceServersQuery` | `validé` (local) ; admin (A18) `implémenté non vérifié` | specs J1 (TURN statique) | — |
| `embeddableWebsiteQuery`, `roomsFromSameWorldQuery`, `mapStorageJwtQuery` | `validé` | specs J3a | admin (A6, A2) `implémenté non vérifié` |
| `roomTagsQuery`, `searchTagsQuery`, `chatMembersQuery` | `partiel` : vide sans admin, comme LocalAdmin ; admin (A8, A14, A12) `implémenté non vérifié` | — | parcours SaaS |
| `getMemberQuery`, `searchMemberQuery`, `oauthRefreshTokenQuery` | admin (A15, A13, A17) `implémenté non vérifié` ; erreur sans admin comme LocalAdmin | — | parcours SaaS |
| `deleteRecordingQuery`, `getSignedUrlQuery`, `getRecordingThumbnailsQuery`, `getRecordingsQuery` | `validé` | `recording` (liste après arrêt) ; tests `recordings_and_thumbnails…`, signature S3 (exemple AWS) | S3 SigV4 écrit ici ; dossier `<uuid>/` seul | — |
| `sendEventQuery` | `validé` | `scripting_events`, test de bots (salle entière émetteur compris, cibles seules) | — |
| `jitsiJwtQuery`, `joinBBBMeetingQuery` | `absent` (erreur explicite) | — | à inventorier en production avant décision |
| `banIpPreviewQuery` | `implémenté non vérifié` | test `an_admin_speaks_to_the_room_and_previews…` (IP inconnue) | les utilisateurs du monde viennent des acteurs des rooms (getWorldUsers) ; `enterChatRoomAreaQuery` : Matrix |

## 5. Room API (gRPC, `ROOM_API_PORT`, `ROOM_API_SECRET_KEY` ou admin)

| RPC | État | Écart / prochaine action |
|---|---|---|
| `readVariable`, `listenVariable`, `saveVariable`, `broadcastEvent`, `listenToEvent` | `validé` | `room-api` 5/5 ; tonic sur `ROOM_API_PORT` (50051), activé par `ROOM_API_SECRET_KEY` ou `ADMIN_API_URL` ; clé locale + `FRONT_URL`, ou A25 avec l'admin (codé, non prouvé) ; un refus de variable par la Room API n'entraîne pas la relecture de la carte (le back la fait) |

## 6. Intégrations SaaS

| Domaine | Contrat | État | Écart | Prochaine action |
|---|---|---|---|---|
| Admin distante (`ADMIN_API_URL`, `ADMIN_API_TOKEN`, `ADMIN_URL`) | les 31 appels de `dev/contracts/admin-api.md` (A1-A31) et les appels entrants | `implémenté non vérifié` | tests de scénario avec un faux admin : accès (A3), socket admin, analytics, message global, aperçu de ban, profil ; aucun parcours contre la vraie admin | parcours SaaS (`dev/saas`, branche à part) |
| White label | domaine → monde via l'admin ; vérification du `playUri` (A21, sinon hôte de `PUSHER_URL`) ; méta-balises, palettes et manifest par domaine ; map-storage par domaine (`USE_DOMAIN_NAME_IN_PATH`, `X-Map-Storage-Host` > `X-Forwarded-Host` > `Host`) ; IP cliente de `X-Forwarded-For` | `implémenté non vérifié` | test `each_tenant_has_its_own_maps…` (deux domaines, mêmes chemins) ; chaîne de confiance des proxies : en-têtes crus comme le TS | parcours SaaS sur deux domaines |
| LiveKit (`LIVEKIT_HOST`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MAX_USERS_FOR_WEBRTC`, `LIVEKIT_SWITCH_ON_CPU_LIMITATION`) | bascule WebRTC → LiveKit au-delà du seuil (immédiate), retour après 20 s (relancé à chaque changement), finalisation 5 s ; salle = nom du space (sha256 au-delà de 250) ; jeton (identité spaceUserId, métadonnées) ; invitations, `switchMessage`, `finalizeSwitchMessage`, `livekitDisconnectMessage` ; salle ouverte avec le premier publieur, fermée avec le dernier | `validé` | livekit 5/5, screensharing (reprise après coupure LiveKit), map_editor_livekit ; tests de scénario `a_fifth_user_moves…`, `a_recording_or_a_slow_computer…`, `a_livekit_room_opens…` | identifiants LiveKit de l'admin (A24) demandés au premier arrivant du space, non vérifiés ; écart : la salle de l'ancienne stratégie est supprimée à la finalisation (le back la laisse au délai de LiveKit) | parcours SaaS |
| Enregistrement (`LIVEKIT_RECORDING_S3_*`) | `startRecording`/`stopRecording` (`canRecord`), egress composite vers S3, webhook signé, état `recording` du space, `recordingUnexpectedlyStoppedMessage`, liste/vignettes/URL signées/suppression, événement `/api/recordings/events` | `partiel` | `recording` 6/6 ; tests `a_recording_moves_to_livekit…`, `a_recording_cannot_start…` | événement admin A23 codé, non vérifié ; sessions orphelines (space détruit avant la fin de l'egress) non suivies | parcours SaaS |
| Matrix (`MATRIX_*`) | jeton admin (Redis), salles des zones, invitations/modérateurs, SSO | `partiel` | redirection SSO présente ; le reste absent | après J3c |
| Jitsi / BBB | `jitsiJwtQuery`, `joinBBBMeetingQuery` | `absent` | usage production à établir | inventaire production (`inventaire-production-2026-10-16.json`) |
| Analytics admin (A22) | file bornée, lots, reprises, 422 découpé événement par événement, vidage à l'arrêt (`DRAIN_TIMEOUT_MS`) ; événements du front (catalogue de 180 noms, source vérifiée), intervalles (`timed_event.open/close`, `user.connected/disconnected`), `media.video_quality.sample`, réunions (`meeting.participation.ended`, `meeting.ended`) | `implémenté non vérifié` | tests `analytics_reach_the_admin…`, `a_bubble_opens_with_two…`, `a_megaphone_counts_speakers…` ; écarts : schémas des propriétés non vérifiés ici (l'admin les refuse en 422, même issue) ; une seule file, activée par la capacité pour les deux côtés (le back TS envoie sans capacité) | parcours SaaS |
| Télémétrie (`ENABLE_TELEMETRY`), Sentry | — | `absent` | Sentry : journaux `tracing` seulement | décider avec l'équipe |

## 7. Persistance

| Donnée | Contrat TS | État | Écart | Prochaine action |
|---|---|---|---|---|
| Fichiers de carte et WAM | disque (`STORAGE_DIRECTORY`) ou S3 | `partiel` | disque `validé` ; S3 absent ; écriture versionnée (une sauvegarde en retard n'écrase ni une plus récente ni un changement HTTP : test `a_save_that_finishes_late_never_overwrites…`) | S3 si la production l'utilise |
| Variables de room `persist` | Redis `HSET <roomUrl>` (`HGETALL` au chargement) | `implémenté non vérifié` | écritures hors de l'acteur, dernière valeur par variable, reprises jusqu'au retour de Redis, visibles d'une room rechargée entre-temps | `variables.spec:61` (socle) |
| Variables de joueur | Redis `pr_<uuid>_\|@\|_<roomUrl>`, `pw_<uuid>_\|@\|_<worldUrl>` | `partiel` | `pr_` écrit et relu (`api_players`) ; `pw_` sur le groupe de la carte (admin), non vérifié | parcours SaaS |
| Variables de zone | mémoire | `validé` | — | — |
| Bans | admin | `implémenté non vérifié` | A7, refus à l'entrée par A3 | parcours SaaS |
| Sessions, reprise | mémoire (`CLIENT_DISCONNECTION_RETENTION_MS`) | `validé` | `reconnect.spec`, `webrtc_reconnection.spec` | — |

## 8. Exploitation et déploiement

| Sujet | État | Preuve | Écart / prochaine action |
|---|---|---|---|
| Image `--target prod` (contextes `protos`, `pusherdata` écrits en tête du Dockerfile) | `validé` | construite et démarrée avec 3 variables (J3a) | — |
| Mêmes noms de variables que TS | `partiel` | `config.rs` | variables des fonctions absentes non lues |
| OSS, label `deploy` | `absent` | — | le workflow construit et déploie TS ; à adapter quand la parité OSS est atteinte |
| SaaS | `absent` | — | pipeline GitLab + charts à adapter avec l'admin |
| Saturation (files bornées, budgets) | `partiel` | budgets outbox/reprise (J1) | politique d'admission à écrire (§5.4) |
| I/O de carte hors de l'acteur de room (P0) | `validé` | test « la salle continue pendant un upload lent… » rouge sur l'ancien acteur, vert sur le nouveau | relecture extérieure (rapport Codex) |

## 9. Écarts volontaires (gardés)

- Droits des entités : un non-éditeur ne supprime une entité que là où il peut écrire (map-storage laisse tout
  supprimer). Une création ou modification refusée est refusée à l'émetteur, non diffusée.
- Une commande d'édition qui casse la structure de la WAM est refusée et ne change rien (map-storage la garde en
  mémoire).
- `/upload-endpoint` garde le port de l'en-tête `Host` (Express le perd : `map_storage_upload:185` échoue en TS).

## 10. Exigences de déploiement du socle (dev-socle 1b99c02f3, aide extérieure : socle)

| Exigence | État | Prochaine action |
|---|---|---|
| WebSocket aussi sur 3001 (`PUSHER_WS_PORT`) | `implémenté non vérifié` (le routeur entier sur le second port, désactivable par 0) | répétition minikube |
| map-storage sur 3002, actif par défaut | `implémenté non vérifié` (`SERVER_MAP_STORAGE_PORT`, défaut 3002) | vérifier dans le chart |
| `PATH_PREFIX` de map-storage (`/map-storage` en single-domain) | `validé` | test `map_storage_lives_under_path_prefix…` |
| uploader sur 3003 (`SERVER_UPLOADER_PORT`), Room API gRPC sur 50051 (`ROOM_API_PORT`) | `implémenté non vérifié` / `validé` (room-api 5/5) | `proximityChatFileTransfer.spec` pour l'uploader |
| `/ping` liveness, `/ready` readiness (503 avant le gabarit), `PROMETHEUS_PORT` | `validé` | — |
| sous-commande `healthcheck` du binaire (GET 127.0.0.1:<port>/ping, code 0/1) | `implémenté non vérifié` | essayer dans l'image prod |
| gabarit et fichiers du front depuis `ASSETS_INTERNAL_URL` | `validé` (stacks du socle) | — |
| `apiVersionHash` exposé pour le contrôle du pipeline SaaS | `validé` | `GET /api-version` (texte ; 503 tant que le gabarit du front n'est pas lu), test `…the_protocol_hash_is_exposed` |
| contextes `protos` et `pusherdata` passés par la CI | `validé` (en tête du Dockerfile) | — |
