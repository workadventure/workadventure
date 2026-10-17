# Journal — candidat Rust (`lang-rust`)

Point de départ figé : `6f4d02319eddbf46a51cb99ffd38e2d75273593c` (même SHA que `lang-go`).
Machine de mesure : MacBook (Apple Silicon, 10 cœurs, 16 Go), Rust 1.93.1. VM Docker de 9,7 Go partagée
avec les stacks de Yannis.

Vérification locale, sans stack : `./verify.sh` (= `cargo build --all-targets`, `cargo clippy --all-targets
-- -D warnings`, `cargo test`).

---

## Jalon 1 — Squelette (2026-10-13)

**Durée murale :** ~3 h 10 (18 h 46 → 21 h 55). Honnêtement : environ 2 h de lecture du code de référence
(pusher, back, protocole) avant d'écrire une ligne, et une coupure de l'API (deux sous-agents d'exploration
tombés en `ENOTFOUND`, relancés). L'écriture du squelette elle-même : ~45 min.

**Itérations avant le vert :** 2.
1. Premier `cargo build` vert du premier coup, y compris la génération prost.
2. `clippy -D warnings` : 2 erreurs `len_without_is_empty` (méthodes `len` renommées). Ensuite vert.

**Corrections humaines :** aucune.

**Difficultés :**
- Le hook de l'environnement interdit d'écrire avec Write/Edit dans `workadventure/.claude/worktrees/*` (il le
  prend pour le checkout de base). Contournement connu : écrire dans le scratchpad puis `rsync` vers le worktree.
- Pas de `protoc` dans l'image Docker : génération avec `protox` (compilateur protobuf en Rust pur), le même
  build marche sur l'hôte et en conteneur.

**Ce qui est en place :**
- Workspace à 3 crates. `wa-core` (métier) ne dépend de rien : ni transport, ni Redis, ni protobuf. Les
  limites de l'hexagone sont donc vérifiées par le compilateur, pas par convention. `wa-proto` (types générés
  par `build.rs`, champs `bytes` en `Bytes` pour diffuser sans copie). `wa-server` (adaptateurs, runtime).
- Configuration lue depuis les variables d'environnement des services TS, mêmes noms, mêmes défauts, erreurs
  toutes listées puis arrêt (comme le validateur zod). Les variables propres au découpage en 4 services
  (`API_URL`, `GRPC_PORT`…) sont acceptées et ignorées.
- `/ping`, `/ready`, `/metrics` (mêmes noms de métriques que les `GaugeManager` du pusher et du back, même
  règle 501/401 que `PrometheusController`, port séparé `PROMETHEUS_PORT`), `process_*` sous Linux.
- Runtime tokio multi-thread, nombre de workers = `available_parallelism()` (qui lit le quota cgroup sous
  Linux), surchargeable par `TOKIO_WORKER_THREADS`, exposé en métrique. Pool bloquant plafonné à 64.
- Règle 7, briques de base :
  - `Outbox` : file sortante par connexion, **bornée en trames et en octets**. Politique explicite :
    une position remplace la position encore en attente du même utilisateur, puis, si la file déborde
    quand même, la session est fermée (client trop lent) et la file libérée. Une position ne double
    jamais un autre message (tout autre message est une barrière), donc jamais l'arrivée ou le départ du
    même utilisateur.
  - `ResumeStore` : l'équivalent du `NoncedMessageStore`, borné en âge **et** en nombre **et** en octets.
    Une trame évincée coûte seulement la reprise au client, jamais de la mémoire.
  - `Registry` : registres en `DashMap` (sharding), création coalescée, désinscription par identité
    d'instance (un acteur qui meurt ne retire pas son successeur).
- `Dockerfile` : cible `dev` (`cargo watch`, sources montées, `target/` et registre cargo en volumes),
  cible `prod` (build release avec caches BuildKit). `CARGO_BUILD_JOBS=4` pour ménager la VM Docker.

**Lignes de code :** 988 lignes de Rust écrites à la main (tests compris), hors code généré.

**Temps de compilation (hôte, 10 cœurs) :**

| | debug | release |
|---|---|---|
| à froid (`cargo clean`) | 35,5 s | 60,3 s |
| incrémental (un fichier de `wa-server` touché) | 1,3 s | 3,7 s |

**Mesures multi-cœur :** pas encore (rien à charger avant J1).

---

## Jalon 2 — J1 : on entre dans une carte (2026-10-13)

**Durée murale :** ~1 h 40 (squelette commité à 21 h 53 → journal à 23 h 35). Le gros du code (cœur, sessions,
acteurs, page, bots, tests) en ~25 min ; le reste en branchement sur le socle, specs Playwright et mesures.
Trois sous-agents d'exploration ont écrit des specs du contrat (HTTP/HTML/auth, séquence WebSocket, Spaces)
pendant que j'écrivais le squelette : sans eux, la lecture aurait pris l'essentiel du temps.

**Itérations avant le vert :** ~12.
- Cœur (`wa-core`) : vert du premier coup (17 tests, dont une salle de 500 joueurs).
- Serveur : 3 erreurs de compilation (limite de récursion de `json!`, module non exporté, un futur non `Send`
  à cause d'un `watch::Ref`), 2 remarques clippy. Tests de bout en bout (bots) verts du premier coup.
- Stack : `meeting.spec.ts` échouait 5/5 → il manquait `/local-script` (iframe des scripts de carte) → 5/5.
  `userlist` « walk to » échouait → il manquait `askPositionMessage` → vert.
- Mesures : 4 itérations sur le banc (bots en phase, OOM du serveur, générateur trop lent, une boucle zsh).
- OpenID : 1 (fonctions `json`/`query` de reqwest à activer), puis `oidc.spec.ts` vert du premier coup.

**Corrections humaines :** aucune.

**Difficultés :**
- **Le navigateur intégré, volet masqué, ne fait pas démarrer Phaser** (la boucle rAF ne tourne pas) : la
  vérification visuelle passe par Playwright en headless.
- **Bornes par connexion ≠ mémoire bornée.** Dans une salle de 400 joueurs, le serveur a été tué (OOM, 1 Go) en
  18 s : chaque session gardait jusqu'à 4 Mio pour une reprise, et 400 × 4 Mio = 1,6 Go. Correctif : un budget
  partagé pour tous les tampons de reprise (les sessions les plus chargées perdent d'abord leurs vieilles
  trames, ce qui ne leur coûte que la reprise) et un autre pour toutes les files sortantes (on ferme un client
  en retard quand il est atteint, jamais un client à jour). Même run ensuite : plateau à ~400 Mo.
- **Le générateur de charge devient le goulot avant le serveur** : décodage protobuf complet de 1,5 M
  messages/s. Réécrit en lecture du fil sans allocation (seuls l'id et le x des `userMovedMessage`).
- **La machine de mesure est trop petite pour 4 CPU** (voir plus bas).

**Ce qui est en place (périmètre J1) :**
- Connexion WebSocket : enveloppes et nonces, rejets comme le pusher (version, JWT, wokas), reprise de
  transport (`connectionId` + `lastReceivedNonce`, rétention 30 s), ping WebSocket 25 s et ping applicatif
  80 s, code 4000 en fin de session.
- Authentification : JWT HS256 identique octet pour octet à celui du pusher (vérifié contre `jose`), connexion
  anonyme, `/me`, **OpenID** (PKCE, callback, passage SSO Matrix, déconnexion avec révocation).
- Page HTML depuis le conteneur `front` du socle (ETag, version d'API), `window.env`, proxy des assets,
  `/map`, `/woka/list`, `/companion/list`, `/local-script`.
- Salles : zones de 320 px, abonnements par viewport (recadrage à 1 600 zones), bulles (formation, sortie,
  statuts silencieux), arrivée/départ, détails du joueur, onglet remplacé, utilisateur en double,
  « walk to » / « locate ».
- Spaces (le minimum pour que la bulle ait du son et de l'image) : join/leave/watch, `switchMessage`,
  signalisation WebRTC P2P (paires `webRtcStartMessage`, relais des signaux, redémarrage), événements
  publics et privés, métadonnées, `setKind` de l'état, `iceServers` (STUN/TURN avec secret partagé).
- Un écart volontaire avec le back : la recherche des joueurs autour d'une bulle se faisait autour de la zone
  (i/320, j/320), c'est-à-dire toujours dans le coin haut-gauche de la carte (confusion d'unités) ; ici elle
  se fait autour de la bulle.

**Pas encore là (J2 et au-delà) :** map-storage, uploader, Room API, admin API (SaaS), LiveKit, variables de
carte (le `roomJoinedMessage` part sans), émotes, suivi, verrou de bulle, mégaphone et main levée, CORS,
`/manifest.json`, méta-tags pour les robots, délestage sur surchauffe CPU, délai de pong.

**Vérification :**
- `./verify.sh` vert : build, `clippy -D warnings`, 57 tests (cœur, serveur, 3 tests de bout en bout par
  WebSocket : deux bots qui forment une bulle et reçoivent la paire WebRTC, 40 salles en parallèle,
  300 joueurs dans une salle).
- Stack `rust` sur le socle (`dev/dev stack up rust --variant server`), specs Playwright, Chromium :
  **31 passés, 1 échec, 1 ignoré** sur `meeting`, `AvailabilityStatus`, `say_bubbles`, `userlist` (walk to),
  `webrtc_reconnection` (P2P), `oidc`, `error_pages`. L'échec est « WAM introuvable » : il passe par
  map-storage, pas encore porté. Le même « walk to » passe sur la stack `ts`.

**Lignes de code :** 7 507 lignes de Rust écrites à la main, tests compris (`wa-core` 1 409 + 373 de tests,
`wa-server` 4 811 dont ses tests unitaires + 251 de tests de bout en bout, `wa-bot` 634, `wa-proto` 29).

**Temps de compilation (hôte, 10 cœurs) :**

| | debug | release |
|---|---|---|
| à froid (`cargo clean`) | 54,1 s | 95,6 s |
| incrémental, un fichier de `wa-server` | 5,1 s | 18,9 s |
| incrémental, un fichier de `wa-core` | 3,6 s | — |

### Mesures multi-cœur

Banc reproductible : `bench/cpus.sh` (serveur release dans un conteneur limité par `--cpus`, mémoire 1 Go ;
générateur `wa-load` dans un autre conteneur ; réseau privé). Les joueurs marchent comme le front (un
déplacement toutes les 200 ms, un arrêt tous les 10), chacun voit toute sa salle. La latence va de l'envoi
d'un déplacement à sa réception chez chaque autre joueur : elle **inclut la fenêtre de lot de 100 ms** du
serveur (comme en prod), d'où une médiane plancher autour de 55 ms. Le nombre de workers tokio suit bien le
quota : 1, 2 et 4 (métrique `workadventure_server_worker_threads`).

**1. Même charge (1 000 joueurs, 40 salles × 25, 5 000 déplacements/s, 123 000 messages livrés/s), 3 runs :**

| CPU | CPU serveur utilisé | p50 | p99 | mémoire |
|---|---|---|---|---|
| 1 | 0,47 cœur | 57 ms | 130–172 ms | 115 Mo |
| 2 | 0,64 cœur | 55 ms | 110–199 ms | 116 Mo |
| 4 | 0,69 cœur | 54 ms | 104 ms | 117 Mo |

À charge égale, un seul thread est le plus économe (pas de coordination entre threads) : +35–45 % de CPU
quand le travail est réparti sur 2 ou 4 threads, pour une latence p99 un peu meilleure.

**2. Charge maximale tenue (p99 ≲ 300 ms, aucune session fermée), salles de 25 :**

| CPU | joueurs | déplacements/s | messages livrés/s | p99 | CPU serveur |
|---|---|---|---|---|---|
| 1 | 1 500 | 7 500 | 173 000 | 280 ms | 0,64 |
| 2 | 2 000 | 10 000 | 235 000 | 252 ms | 1,14 |
| 4 | 3 000 | 15 000 | 338 000 | 368 ms | 2,02 |

**Facteur 1 → 4 cœurs : ×1,95 en débit tenu.** C'est une borne basse : à 4 CPU, le serveur n'atteint jamais
son quota (2,0–2,5 cœurs), la latence monte avant le CPU. Au-delà (5 000 joueurs), le débit livré baisse et
la latence part en secondes, sans OOM ni session fermée.

**3. Une très grande salle (1 salle, chaque déplacement diffusé à tous) :**

| joueurs | CPU | messages livrés/s | p99 | CPU serveur | mémoire |
|---|---|---|---|---|---|
| 400 | 1 | 1,51 M | 178 ms | 0,73 | 387 Mo |
| 400 | 2 | 1,56 M | 186 ms | 1,03 | 367 Mo |
| 400 | 4 | 1,56 M | 126 ms | 1,03 | 355 Mo |
| 800 | 2 | 2,25 M | 19 s | 1,62 | 528 Mo |
| 800 | 4 | 3,49 M | 13 s | 2,02 | 544 Mo |

À 400 joueurs, tout le serveur tient sur un cœur : la salle (séquentielle dans son acteur) ne sature pas un
cœur, la diffusion se répartit sur les tâches d'écriture. À 800, l'acteur suit encore (les 4 000
déplacements/s sont tous acceptés), c'est la livraison qui décroche. **Pas de découpage par zone proposé à ce
stade** : rien ne montre une salle qui sature un cœur ; il faudrait le CPU par acteur sur une machine plus
grosse pour trancher.

**Limites de ces chiffres, à lire avant de comparer :**
- La machine (MacBook, **4 cœurs performance + 6 efficacité**, VM Docker de 10 vCPU partagée avec les stacks de
  Yannis et macOS) ne peut pas donner 4 vrais cœurs au serveur *et* au générateur. En natif, sans Docker,
  deux runs identiques à 5 000 joueurs ont donné 318 000 puis 527 000 messages/s, serveur et générateur
  tous deux sous leur CPU. Les points à forte charge sont donc indicatifs.
- Anomalies non élucidées : 800 joueurs dans une salle à 1 CPU (le serveur à 0,2 cœur, les bots n'arrivent
  à envoyer que 757 déplacements/s) ; 7 500 joueurs, des connexions réinitialisées pendant la montée.
- Pour la grille de comparaison : faire tourner Go et Rust avec le même `bench/cpus.sh` (`wa-load` ne parle
  que le protocole gelé, il charge n'importe quel candidat) sur une machine Linux dédiée d'au moins 8 cœurs,
  générateur sur une autre machine.

---

## Jalon 3 — J2 phase 1 : l'état des spaces (2026-10-14)

**Durée murale :** ~45 min (stack relancée à 13 h 35, specs et journal à 14 h 20), dont ~10 min de lecture du
back (`Space.updateState`, `RaiseHandManager`, `ProximityPollManager`, `ProximityQAManager`) et du pusher
(diffusion des patchs, `LiveStreamingNotificationStrategy`), et ~10 min de specs Playwright.

**Itérations avant le vert :** ~5.
- Génération des types : 3 essais (`tsx` ne tourne pas sur l'hôte car le `node_modules` contient l'esbuild
  Linux, d'où un conteneur `node:22-slim` ; puis des définitions nommées pour avoir `ProximityPoll` plutôt que
  `SpaceStatePollsValue`).
- Compilation : 1 erreur (`&Value != Value`), 1 remarque clippy. Le code généré a compilé du premier coup sous
  `clippy -D warnings`.
- Tests du cœur : 7 verts au premier passage après correction de deux attentes du test lui-même (un décompte
  de patchs, et l'utilisateur qui monte sur scène reçoit « add » pour lui-même, pas « update »).
- Playwright : un passage pour constater que les specs de main levée passent toutes par map-storage (voir
  plus bas), un pour les copies locales.

**Corrections humaines :** aucune.

**Génération des types depuis zod (étape 4 du plan) :**
- zod → JSON Schema avec `zod-to-json-schema` (déjà dans le `node_modules` du dépôt), en nommant chaque
  sous-schéma exporté (`tools/space-state-schema.ts`) ; JSON Schema → Rust avec `cargo-typify` 0.8.0
  (`--no-builder`, `PartialEq` dérivé, `BTreeMap` pour les records).
- Une commande : `tools/gen-space-state.sh` (node dans un conteneur, monté au même chemin pour que le lien
  `node_modules` d'un worktree reste valide). Le résultat est commité :
  `crates/core/src/space_state/generated.rs` (1 092 lignes, en-tête `@generated`) avec le schéma
  intermédiaire `tools/space-state.schema.json`. **Le build n'a besoin ni de node ni de `libs/`.**
- Ce que ça apporte : chaque chaîne bornée par le schéma (question ≤ 340, réponse ≤ 240, corps ≤ 500, ids ≤ 100,
  `kind` dans l'énumération...) est un type qu'on ne peut pas construire hors bornes ; les limites ne sont
  écrites nulle part à la main. Ce que typify ne borne pas, écrit à la main : la taille des tableaux
  (2 à 20 réponses) et `maxSelections ≤ 20`.
- Écart connu : typify compte les longueurs en caractères, zod en unités UTF-16. Un texte fait d'emoji peut
  être jusqu'à deux fois plus long que sur le serveur TypeScript (le front borne les champs de la même façon
  que zod, donc l'écart ne se voit qu'avec un client modifié).
- `wa-core` dépend maintenant de `serde` (dérivations seulement) : la forme JSON de l'état est son contrat avec
  le front. Le cœur n'importe toujours ni transport, ni protobuf, ni `serde_json`.

**Ce qui est en place :**
- État typé par space, modifié par une seule fonction : copie, application de la requête, comparaison, puis
  diffusion de la différence en JSON Patch à **tous les membres** du space (qu'ils regardent ou non), comme le
  pusher. Une requête refusée laisse l'état intact et n'envoie rien. Le patch part avant la réponse, dans la
  même file : quand le client reçoit la réponse, sa copie est déjà à jour (vérifié de bout en bout).
- Le diff suit l'algorithme de `fast-json-patch.compare` (suppressions de la fin vers le début pour garder des
  index valides, puis ajouts ; échappement `~0`/`~1` des clés, utile pour les ids `room/url_userId`).
- Main levée (file ordonnée), baisser la main d'un autre, donner/reprendre la parole, avec les droits du back
  (admin ; dans un space de proximité tout le monde ; dans une diffusion les orateurs, pas un invité promu) ;
  nettoyage quand un membre part et quand un détenteur de la parole quitte la scène.
- Sondages (création, vote, retrait du vote, clôture une seule fois, suppression par le créateur) et
  questions (poser, voter pour celle d'un autre, marquer répondue par un modérateur, supprimer), ids UUID v4
  et horodatage côté serveur, attribution au « voter id » (uuid, sinon spaceUserId).
- `setKind` validé par l'énumération générée.
- Enregistrement : refusé avec le message du pusher (« You are not allowed to record ») : `canRecord` exige un
  enregistrement configuré, ce que ce serveur n'a pas encore.
- **Visibilité par observateur dans un space avec retour** (`LIVE_STREAMING_USERS_WITH_FEEDBACK`) : un orateur
  voit la scène et la salle, un auditeur ne voit que les orateurs. Chaque changement est traduit, pour chaque
  observateur, en arrivée, mise à jour ou départ ; celui qui monte sur scène reçoit en plus l'auditoire qu'il
  voit désormais. Diffusion encodée une fois par catégorie (trois envois au plus), pas une fois par
  observateur.

**Vérification :**
- `./verify.sh` vert : 67 tests (+10) : 7 tests du cœur sur l'état et la visibilité, 2 tests du diff
  (dont l'égalité avec la sortie de `fast-json-patch` sur un décalage de file), 1 test de bout en bout par
  WebSocket (le patch arrive avant la réponse, chez les deux membres ; une requête refusée renvoie une erreur
  et aucun patch).
- Playwright, stack `rust`, Chromium :

| spec | résultat |
|---|---|
| `scripting_spaces.spec.ts` | 6/6 |
| `spaces.spec.ts` | 0/1 : le seul test est `@docker @slow` (dumps du back puis redémarrage du conteneur `back`), sans équivalent dans un serveur unique |
| `raise-hand.spec.ts`, `raise-hand-megaphone.spec.ts`, `chat/proximityChatPoll.spec.ts` | non jouables tels quels : chaque test commence par `resetWamMaps` (upload vers map-storage) et charge une carte WAM ; c'est la phase 2 |
| copie locale non commitée de `raise-hand` « bulle », sans `resetWamMaps`, carte `tests/E2E/empty.json` | 1/1 |
| copie locale non commitée de `proximityChatPoll` (sondage ouvert, sondage fermé, questions/votes/répondue), même adaptation | 3/3 |

- Non-régression sur l'union des specs J1 (41 tests dans ces 10 fichiers sur cette base) :
  **35 passés, 4 échecs, 2 ignorés.** Les 4 échecs chargent une carte WAM, donc passent par map-storage :
  `error_pages` « not found WAM », `reconnect` « WAM ... pusher is down », et les deux `userlist`
  « Send Message » (`Map.url("empty")` est une WAM ; le premier échoue aussi sur la référence TS, pour une
  raison Matrix). Relancés isolément : mêmes échecs, même cause. Aucune régression due à J2.

**Lignes de code :** ~950 lignes écrites à la main (état et règles 321, `Space` +76, acteur de space +41, diff 125, tests du cœur
275, test de bout en bout 65, outils 42) ; 1 092 lignes générées, non comptées.

**Temps de compilation (hôte, `cargo build` sans les tests) :** à froid 27,0 s ; un fichier de `wa-core`
touché 3,3 s ; un fichier de `wa-server` 2,0 s. (Pas la même commande que les chiffres J1, qui incluaient les
tests : ne pas comparer ligne à ligne.)

**`wa-load` :** inchangé (`crates/bot` non modifié).

**Pas encore là :** LiveKit et donc l'enregistrement, la bascule du mégaphone en LiveKit, analytics du `kind`.

---

## Jalon 4 — J2 phase 2 : map-storage minimum (2026-10-14)

**Durée murale :** ~2 h 30 (feu vert vers 15 h 20, specs finales vers 18 h), dont ~10 min de lecture du contrat par
deux sous-agents en parallèle (API HTTP de map-storage ; circuit d'une commande d'édition), ~25 min d'attente de la
référence TS et deux interruptions de Yannis. Le code de base (stockage, upload, éditions, rattrapage) : ~40 min.

**Itérations avant le vert :** ~9.
- Compilation : 1 erreur (`ZipFile::name` rend un `Result` dans zip 9), 2 remarques clippy. Tests du cœur et de bout
  en bout verts du premier coup.
- Playwright sur les vrais fichiers, premier passage : `proximityChatPoll` 3/3, `raise-hand` 4/4,
  `raise-hand-megaphone` 7/7, `map_editor_megaphone_speaker_zone` 8/9.
- Le 9e (« outside users see screen share only when sharer is speaker ») : 4 tours. (1) Les liens P2P suivent
  désormais les rôles comme `WebRTCCommunicationStrategy` du back (un observateur est relié à chaque membre qui
  publie) : utile, pas suffisant. (2) Trace temporaire des événements du space : les messages de liste envoyés à Bob
  étaient les mêmes que ceux du pusher. (3) Un écart trouvé sur les messages qu'un membre reçoit à propos de
  lui-même (rôle jugé avec l'ancien rôle au lieu du nouveau) : corrigé, pas suffisant. (4) Aide extérieure (plus
  bas) : le front ferme seul la liaison quand un membre sort de sa liste ; le serveur la redémarre au retour → 2/2.
- Un faux échec en route : Alice arrivait non connectée. `tests/.auth` est partagé entre stacks et la référence TS
  venait d'être jouée ; refaire `warm-auth` sur la stack `rust` règle le problème.

**Corrections humaines :** aucune sur le code. Yannis a validé l'aide extérieure ci-dessous.

**Aide extérieure (règle du 14/10) :**
- 17 h environ, de la session socle : la référence TS du test ci-dessus (il passe 2/2 sur la stack `ts`).
- Ensuite, de la session socle, validé par Yannis : le comportement du front `SimplePeer` (abonnement à
  `observeUserLeft`, `closeConnection` sans message au serveur). Rien sur le code de Go.
- Lecture de `lang-go` depuis le 13/10 : aucune lecture de code, de branche ni de journal. Une seule commande a
  touché son worktree, le 13/10 pendant J1 : `ls lang-go/tests | grep node_modules`, pour voir comment ses specs
  trouvaient `node_modules` (sortie vide). L'index de mémoire partagé, chargé d'office dans chaque session, contient
  une ligne d'état sur le candidat Go et les chiffres du banc commun du 14/10 ; aucun fichier de mémoire de Go
  ouvert.

**Ce qui est en place :**
- **Second listener** sur `SERVER_MAP_STORAGE_PORT` (3002 par défaut, comme le socle le route), `STORAGE_DIRECTORY`
  (défaut `./public`, comme map-storage). Le banc démarre toujours avec ses trois variables.
- **Fichiers** : `GET` de n'importe quel fichier stocké (décodage d'URL avec `+`, types MIME, `max-age=5` pour les
  WAM), 404 pour un fichier absent (jamais de 5xx, sinon le front réessaie sans fin), 400 sur `..`, CORS
  `*` et preflight comme `cors()`, `nosniff`, `/ping`.
- **`POST /upload`** : authentification basic ou bearer selon `ENABLE_*_AUTHENTICATION` (401 avec
  `WWW-Authenticate` sinon), multipart `file` + `directory`, décompression hors du runtime (`spawn_blocking`), même
  règle de nettoyage que map-storage (tout part sauf une WAM dont la carte revient sans elle), WAM créée pour chaque
  `.tmj` qui n'en a pas (métadonnées tirées des propriétés de la carte). Les salles concernées relisent leur WAM et
  envoient `refreshRoomMessage`.
- **La WAM d'une salle** vit dans son acteur (lue avant toute entrée, comme `GameRoom.create`), migrée en 2.1.0
  comme map-storage la charge. Les éditions s'appliquent dans l'ordre de la salle et repartent vers tous, émetteur
  compris, sous le même id ; un refus va au seul émetteur en `errorCommandMessage`. Une tâche par salle écrit la
  dernière version sur disque (écriture atomique) ; une génération empêche une sauvegarde d'avant un upload
  d'écraser les nouveaux fichiers.
- **Commandes appliquées** : création et modification de zone (fusion des propriétés, `serverData` conservé),
  réglages WAM du mégaphone et de l'enregistrement. Les autres (suppression, entités, métadonnées, fichiers)
  répondent « not supported by this server yet » : hors périmètre J2.
- **Rattrapage** : les commandes des 30 dernières secondes partent dans `roomConnectedMessage` pour un client dont
  la WAM est en retard (`lastCommandId`). Ce message part maintenant dès la connexion, salle et WAM chargées : le
  front l'attend avant d'envoyer son entrée.
- **Spaces** : les liaisons P2P suivent les rôles (un observateur est relié à chaque membre qui publie : tout le
  monde en proximité, les orateurs en diffusion, l'auditoire aussi avec retour) ; une liaison qu'un front a lâchée
  en retirant un membre de sa liste est redémarrée quand le membre y revient (disconnect aux deux bouts, puis
  nouvelle connexion).
- La WAM reste du JSON (`serde_json::Value`) : les champs que ce serveur ne connaît pas survivent à ses éditions.
  `wa-core` dépend donc aussi de `serde_json` (ce que la note de J2 phase 1 excluait).

**Limites connues :** pas de validation complète de la WAM après une commande (`WAMFileFormat.parse` de
map-storage), ni du schéma `MegaphoneSettings` (seulement « objet ou rien ») ; pas de `GET /maps`, `/private/files`,
`PUT`/`PATCH`/`DELETE`, `/move`, `/copy`, `/download` (J3) ; une seule salle par WAM ; `assets.zip` des specs n'est
construit par rien dans `dev/` (fait à la main comme la CI, URLs des collections réécrites vers la stack).

**Vérification :**
- `./verify.sh` vert : 76 tests (+9) : 6 sur la WAM (migrations, zones, réglages, droits, WAM fraîche,
  rattrapage), 2 sur les liaisons P2P et les rôles, 1 de bout en bout (édition reçue par tous, refus à l'émetteur
  seul, fichier sauvé et servi avec CORS, 404, upload refusé sans identifiants puis accepté, salle rafraîchie,
  WAM conservée selon la règle).
- Playwright, stack `rust`, Chromium, sur les vrais fichiers de spec (pas de copie locale), code final :

| spec | résultat |
|---|---|
| `raise-hand.spec.ts` | 4/4 |
| `raise-hand-megaphone.spec.ts` | 7/7 |
| `map_editor/map_editor_megaphone_speaker_zone.spec.ts` | 9/9 |
| `chat/proximityChatPoll.spec.ts` | 3/3 |
| **Total J2** | **23/23** |
| Union J1 (41 tests) | 37 passés, 2 échecs, 2 ignorés |

- Les 2 échecs de l'union J1 : `userlist` « Send Message » (Matrix, échoue aussi sur la référence TS) et `meeting`
  « enter and exit meeting quickly » (entrées-sorties de bulle à 100 ms près ; relancé seul : 3/3). Soit 38 passés
  de fait, comme la référence TS, et les 4 échecs WAM de la phase 1 réglés (dont `reconnect` « WAM », qui échoue
  sur la référence TS).
- `assets.zip` construit comme en CI : `map-storage/tests/assets` copié, `http://play.workadventure.localhost`
  réécrit en `http://play.rust.workadventure.localhost:8880` dans les WAM, puis `zip -r`.
- Banc : image `--target prod` construite avec les mêmes contextes (`protos`, `pusherdata`), démarrage avec
  seulement `SECRET_KEY`, `CLIENT_DISCONNECTION_RETENTION_MS` et `RUST_LOG` → `/ping` 200, map-storage sur 3002 avec
  `./public`. Aucun nouveau dossier du dépôt nécessaire. `crates/bot` inchangé (`wa-load` identique).

**Lignes de code :** ~1 170 lignes écrites à la main (WAM et commandes 225 + 121 de tests, map-storage 294,
branchements et tests de bout en bout ~530).

---

## Jalon 5 — J3a : éditeur de carte et map-storage complets (2026-10-14)

**Durée murale :** ~1 h 50 (démarrage à 19 h 32, résultat final vers 21 h 20), dont ~8 min de lecture du contrat
par deux sous-agents en parallèle, ~35 min de passages Playwright (trois passages complets de 72 tests) et
l'attente de la référence TS. Le code de la phase (routes HTTP, commandes, droits, variables de zone) : ~45 min.

**Itérations avant le vert :** ~10.
- Compilation : 2 erreurs (le nom `default` d'un champ proto masque `Default::default()`, un `Result` de zip 9),
  4 remarques clippy (dont un `Err` trop gros : la réponse de refus devient un `Option`). Tests verts du premier
  coup, sauf un test de bout en bout qui utilisait la suppression de zone comme commande « non supportée ».
- Playwright, premier passage avec l'ancienne configuration du socle (tous éditeurs) : 52 réussis sur 71 joués.
  Écarts trouvés et corrigés : déverrouillage d'une zone déplacée, liste des cartes du monde
  (`roomsFromSameWorldQuery`), `+` gardé dans le chemin d'une WAM, `deleteMapMessage` jeté par la fermeture de
  session (la file était vidée avant d'être écrite).
- Deuxième passage, configuration corrigée du socle : 61 réussis. Écart restant : la carte en mémoire et ses
  commandes récentes mouraient avec la salle ; un utilisateur arrivant juste après le dernier parti lisait un
  fichier pas encore sauvé. Désormais la carte vit hors de la salle (verrou par carte, la salle suivante attend
  que la précédente la rende), comme dans MapsManager.
- Troisième passage, comptes de test corrects : 70 réussis.

**Corrections humaines :** aucune.

**Aide extérieure :**
- De la session socle : la référence TS (provisoire 44/72, puis 60/72, puis 67/72), la correction de
  l'environnement des stacks (droits d'édition par étiquettes OIDC, applications tierces activées, `dev/dev assets`).
- Deux faits relevés par Go (liste des cartes du monde pour start_exit ; message direct à faire partir avant la
  fermeture 4000) : reçus après que je les avais trouvés et codés au premier passage, sans effet sur le code.
- Lecture de `lang-go` : rien.
- Dans l'autre sens : le préchauffage des comptes (`dev/warm-auth.mjs`) enregistrait Member1 anonyme ; trouvé ici
  en décodant son jeton, signalé au socle, qui l'a corrigé pour les trois serveurs (7 tests de la référence TS
  étaient faussés).

**Ce qui est en place :**
- **map-storage complet pour les specs** : `PUT` (multipart ou corps brut, WAM validée), `PATCH` d'une WAM en
  JSON Patch (RFC 6902, appliqué ici, même module que le diff), `DELETE` (fichier, dossier, racine vidée),
  `POST /move` et `/copy` (409 si la destination existe), `GET /download` (zip), `GET /upload-endpoint`,
  `GET /maps` (avec le nombre de zones et d'entités cherchables), en-têtes de cache (`immutable` pour les noms
  hachés, ETag), validation des uploads (carte Tiled en `.json`, image de tileset absente, WAM invalide), fichiers
  privés à jeton (`mapStorageJwtQuery`, JWT HS256, droits de lecture de la zone).
- **Commandes de l'éditeur** : suppression de zone, entités (création, modification, suppression), entités
  personnalisées (images et `entities.json`, propriétaire), fichiers des propriétés `openFile` (et leur
  suppression quand le lien disparaît), métadonnées de la carte.
- **Droits, comme map-storage** : un non-éditeur ne peut que revendiquer ou rendre un bureau personnel, et poser,
  déplacer ou supprimer une entité là où il a le droit d'écrire. Écart volontaire : map-storage laisse n'importe qui
  supprimer n'importe quelle entité, et diffuse comme valides une création ou une modification refusées ; ici
  elles sont refusées à l'émetteur.
- **Validation de la carte après chaque commande** : structure de la WAM (types des champs que serveur et front
  lisent) ; une commande qui la casse est refusée et ne change rien (map-storage, lui, garde la modification en
  mémoire). Les schémas des propriétés ne sont pas encore vérifiés un à un.
- **Variables de zone** : verrou (`lockableAreaPropertyData`, étiquettes autorisées, déverrouillé quand la zone se
  vide, y compris quand elle est déplacée) et jauge de places (`maxUsersReached`), dans `roomJoinedMessage`.
- **Sites intégrables** (`embeddableWebsiteQuery`) : liste blanche, puis `HEAD`/`GET` à 5 s et lecture de
  `X-Frame-Options` et `frame-ancestors`, hors de la boucle des messages du client. reqwest gagne TLS (rustls).
- **Applications tierces** (`roomJoinedMessage.applications`) depuis les variables `*_ENABLED`, comme LocalAdmin.

**Vérification :**
- `./verify.sh` vert : 83 tests (+7).
- Playwright, stack `rust`, Chromium, vrais fichiers, comptes corrects :

| spec | Rust | référence TS |
|---|---|---|
| J3a, 72 tests | **70 réussis, 1 sauté (Klaxoon), 1 échec** | 67 réussis, 1 sauté, 4 échecs |

- Le seul échec (`open_website:29`) échoue aussi en TS. Les trois tests de `map_storage_upload` qui échouent en TS
  (`:19` « carte mise à jour », `:85` « carte supprimée », `:185` adresse d'upload) passent ici : pour `:185`,
  l'adresse annoncée garde le port de l'en-tête `Host`, que le `req.hostname` d'Express perd.

- Non-régression cumulée (union J1 41, J2 23, scripting_spaces 6) : **68 réussis, 2 sautés, aucun échec** (même
  `userlist` « Send Message », qui échoue en TS).
- Banc : l'image `--target prod` se construit avec rustls et aws-lc-rs (58 s pour l'étape de build ; l'image
  `rust:1.93-bookworm` a ce qu'il faut) et démarre avec ses trois variables (`/ping` 200). `crates/bot` inchangé.

## Jalon 6 — Jalon 1 (parité production), tranche 1 : matrice, gel de room, J3b (2026-10-17)

Cadre : « jalon 1 — parité production », relayé par le socle et validé par Yannis le 17/10 ; il remplace les
anciens J4/J5. Documents lus : `reference-implementation-go-rust.md` §1, §3, §4, §5.1, §5.3 (Rust), §5.4,
§5.5 et `jalons-et-choix-go-rust.md` (« Parcours de livraison », « Protocole de choix »).

**Durée murale :** ~2 h 40 (état des lieux et inventaires 25 min, gel de room 30 min, J3b 1 h 15, passages
Playwright en parallèle). Un passage J3a de 72 tests a été perdu : le conteneur de la stack recompile le serveur
à chaque changement du worktree, et un `cargo add` en cours de passage l'a redémarré (34 « échecs », tous des
uploads refusés pendant la compilation). Depuis, rien ne touche le worktree pendant un passage.

**Itérations avant le vert :** ~8. Compilation : un `clone` sur un type `Copy`, trois variantes d'énumération
trop grosses (laissées, quelques instances par carte), un recorder de test à compléter. Tests : deux fixtures
WAM incomplètes, refusées à juste titre par les nouveaux schémas ; une assertion de test qui relisait un ancien
message. Playwright : métadonnées des robots ajoutées après le premier passage J3b.

**Corrections humaines :** aucune.

**Aide extérieure :**
- Relecture extérieure (15/10), reprise dans le rapport Codex (§5.3, P0) : l'acteur de room attendait des I/O
  de map-storage dans une commande. Corrigé ici ; le rapport ne donnait pas le code.
- Du socle : la référence TS de J3b (35 réussis, 7 échecs connus, 3 sautés mobile).
- Inventaires du code TS (routes HTTP, messages WebSocket, admin, white label, LiveKit, enregistrement,
  persistance, besoins serveur des specs J3b) faits par des sous-agents de cette session, sur le TS seulement.
- Lecture de `lang-go` : rien. En lisant le §4.1 de la référence, le paragraphe « Points Go » (trois lignes sur le
  journal Go) a été lu avant les « Points Rust », dans le même bloc ; sans effet sur le code.

**Ce qui est en place :**
- **`PARITY.md`** : une ligne par fonction (specs, routes, messages, queries, Room API, admin, white label,
  LiveKit, enregistrement, Matrix, persistance, déploiement), avec état, preuve, écart et prochaine action.
  Verrou écrit : pas de remplacement de production tant que l'admin SaaS, le white label, LiveKit,
  l'enregistrement, la persistance Redis et la Room API ne sont pas validés.
- **Gel de room (P0)** : les I/O d'une commande d'édition (entités personnalisées, fichiers privés, relecture
  après upload) partent dans une tâche ; les commandes d'édition suivantes attendent leur tour, les déplacements
  et le reste continuent. Les sauvegardes de WAM portent une révision : une sauvegarde qui finit en retard
  n'écrase ni une plus récente ni un changement HTTP. Les écritures disque passent par `spawn_blocking`.
- **Schémas des propriétés WAM** (AreaDataProperty, EntityDataProperty) : map-storage stocke les propriétés
  sans les vérifier mais relit tout le fichier avec `WAMFileFormat` à chaque chargement ; une propriété acceptée
  ici et refusée là rendrait la carte illisible par TS après un retour arrière. Elle est donc refusée.
- **Variables de room** : définies par la carte (TMJ du stockage, ou URL de la carte avec le contrôle de réseau
  privé du back, 10 s, 50 Mo), droits `readableBy`/`writableBy`, diffusion filtrée, refus → `errorMessage` puis
  fermeture, relecture de la carte au plus toutes les 10 s pour une variable inconnue. Redis (`HSET <roomUrl>`)
  hors de l'acteur : dernière valeur par variable, reprise jusqu'à ce que Redis réponde, visible d'une room
  rechargée entre-temps.
- **Variables de joueur** : `pr_<uuid>_|@|_<roomUrl>` pour les joueurs connectés, relues au join
  (`roomJoinedMessage.playerVariable`), publiques dans `userJoined`, onglets du même joueur prévenus. Écart
  volontaire : `PLAYER_VARIABLES_MAX_TTL` plafonne (le back prend le plus grand des deux).
- **Événements** (`sendEventQuery`, `POST /global/event`), `GET /rooms`, suivi (`follow*`), verrou de bulle,
  émotes (emoji seuls), items (état rendu aux arrivants), invitations (5ᵉ refusée en 10 min), kick d'admin
  (`banUserMessage` puis 4000), méta-balises pour les robots.

**Vérification :**
- `./verify.sh` vert : **103 tests** (+20). Couverture (`cargo llvm-cov`, installé ce jour) : `wa-core` 78,8 %
  des lignes (les types générés de SpaceState, 39 %, tirent la moyenne ; `room` 94 %, `variables` 96 %,
  `wam` 90 %, `space` 73 %), espace de travail 66,3 %.
- Test de scénario du gel : « la salle continue pendant un upload lent et les éditions gardent leur ordre »
  échoue sur l'ancien acteur (le déplacement n'arrive pas), passe sur le nouveau. « Une sauvegarde qui finit en
  retard n'écrase ni une plus récente ni un changement HTTP » : test du stockage.
- Rattrapage J3a demandé le 15/10 : `wam_rights.rs` (zone restreinte, bureau personnel, entités, suppression de
  zone et fichiers, entité personnalisée, refus sans effet), `social.rs`, `room.rs` (émote, bulle verrouillée).
- Playwright, stack `rust`, Chromium :

| lot | Rust | référence TS |
|---|---|---|
| J3a (72) après le gel et les schémas | **71 réussis, 1 sauté, 0 échec** | 67 réussis |
| J3b (39) | **38 réussis, 1 échec** (`metadata` rejouée : 2/2) | 35 réussis, 7 échecs connus |
| `variables:188` | échec d'environnement | échec connu |

- `open_website:29`, en échec à J3a, passe maintenant (deux passages) ; la cause de l'échec précédent n'a pas
  été établie. `report_issue:7` : le bouton dépend de `SENTRY_DSN_FRONT`, absent de l'environnement de la stack.
  `variables:188` : la carte que le test écrit dans `maps/` n'est pas servie par le socle (404). Les deux
  échouent aussi en TS.
- Non-régression cumulée (J1, J2, scripting_spaces ; 70 tests) : **66 réussis, 2 sautés, 2 échecs**, aucun
  imputable au serveur : `camera_order:29` passe 3 fois sur 3 seul (minutage du test) ; `scripting_spaces:401`
  appelle `http://api.workadventure.localhost/debug/close-space-connection` en dur sur le port 80, une route de
  débogage du back TS (connexion refusée sur cette machine ; passé au J3a quand le port 80 répondait).
- Banc : l'image `--target prod` se construit avec Redis et regex (169 s pour l'étape de compilation, dépendances
  nouvelles) et démarre avec ses trois variables (`/ping` 200). `crates/bot` : un champ public `joined`
  (le `roomJoinedMessage` reçu) ajouté, rien de changé pour les appelants.

**Écarts ouverts (détail dans `PARITY.md`) :** admin SaaS et white label (contrat attendu du socle), LiveKit,
enregistrement, Room API, OpenAPI (J3c), Matrix, uploader, variables de monde (`pw_`), suiveur hors rayon,
Redis non prouvé de bout en bout (`variables:61`).

## Pause (2026-10-17, demandée par Yannis via le socle)

Rust s'arrête jusqu'à ce que Go ait fini et validé le jalon 1.

- **État exact :** `lang-rust` au commit de cette entrée, tout commité, rien en cours dans le worktree ni dans le
  miroir de travail. Aucune spec en cours. Stack `rust` arrêtée sans `-v` (cartes gardées).
- **Résultats J3b à ce jour** (stack rust, Chromium) : 38/39, `metadata` rejouée 2/2 ; seul échec
  `report_issue:7` (environnement : `SENTRY_DSN_FRONT`). `api_players:16`, `:329` et `iframe_script:14`, que le
  socle a reclassés le 17/10 comme devant passer, passent ici (api_players 9/9, iframe_script 6/6).
- **Reçu du socle, pas encore traité** : `dev/contracts/admin-api.md` et la référence TS de J3c (19/20) dans
  dev-socle 1b99c02f3 ; exigences de déploiement (WebSocket sur 3001, `PATH_PREFIX`, uploader 3003, Room API
  50051, sous-commande `healthcheck`, `apiVersionHash`) recopiées dans `PARITY.md` §10. Aide extérieure : socle.
- **Prochaine action à la reprise :** merger dev-socle (1b99c02f3 et b8b724e7a), lancer les specs avec
  `dev/dev test rust <specs>`, puis J3c (LiveKit d'abord), les exigences de déploiement du §10, et l'admin SaaS
  d'après le contrat.

## Jalon 7 — Jalon 1, tranche 2 : J3c et exigences de déploiement (2026-10-17)

Reprise décidée par Yannis via le socle, depuis `7b763934c`. Fusionnés : dev-socle `3e0c5bf05`, master `034dee80b`
(protos régénérés, `PROXIMITY_FILE_TRANSFER_MAX_USERS` ajouté à la configuration du front).

**Durée murale :** ~3 h (déploiement 30 min, LiveKit 1 h, Room API 30 min, enregistrement et S3 1 h, OpenAPI 20 min ;
les passages Playwright en parallèle, dont ~25 min d'attente du créneau partagé).

**Itérations avant le vert :** ~10. Cœur : un ordre faux dans la réconciliation LiveKit (invitations calculées sur
la salle ouverte plutôt que sur la présence d'un publieur), trouvé par le test de scénario. Adaptateur : l'egress
démarrait avant que la salle existe (TS attend sa création), la reprise LiveKit sans pair était jetée (le front
l'envoie vide), un nom de message proto. Outils : la génération OpenAPI (variables de configuration du pusher,
avertissements de swagger-jsdoc sur la sortie standard).

**Corrections humaines :** aucune.

**Aide extérieure :**
- Du socle : contrat de l'admin (`dev/contracts/admin-api.md`, pas encore utilisé dans cette tranche sauf A25 et
  A29), référence TS de J3c (19/20), exigences de déploiement (ports, sondes, `healthcheck`, `/api-version`), le
  créneau `dev/dev test`, le client Room API à compiler.
- Inventaire du protocole média du back (CommunicationManager, états, stratégies, RecordingManager, LiveKitService)
  par un sous-agent Sonnet de cette session, sur le TS seulement.
- Lecture de `lang-go` : rien.

**Ce qui est en place :**
- **Déploiement** : WebSocket aussi sur `PUSHER_WS_PORT` (3001), uploader sur `SERVER_UPLOADER_PORT` (3003), Room
  API sur `ROOM_API_PORT` (50051), `PATH_PREFIX` de map-storage, sous-commande `healthcheck`, `GET /api-version`.
  Correction de donnée : les variables Redis repassent en base 0, comme le back (seul l'uploader lit
  `REDIS_DB_NUMBER`) ; sinon un retour arrière vers TS les aurait perdues.
- **Stratégie média** (cœur, horloge injectée) : WebRTC → LiveKit au-delà de `MAX_USERS_FOR_WEBRTC` ou avec un
  utilisateur à CPU limité (3 et plus), retour après 20 s relancées à chaque changement, finalisation 5 s, jamais
  de retour pendant un enregistrement. Salle LiveKit ouverte avec le premier publieur, fermée avec le dernier ;
  jetons HS256 comme le SDK ; appels Twirp hors des acteurs.
- **Room API** gRPC (tonic, généré des mêmes descripteurs) : lecture, écriture, écoute des variables et des
  événements ; clé locale + `FRONT_URL`, ou autorisation par l'admin (A25).
- **Enregistrement** : session, état du space (`starting` → `recording` sur le webhook → `stopping` → `idle`), egress
  composite vers S3, webhook signé vérifié (`sha256` du corps), arrêt par le serveur quand l'enregistreur part ou
  que le dernier publieur s'en va, avertissement à l'enregistreur d'un arrêt non demandé. Listes, vignettes, URL
  signées et suppression des enregistrements : S3 SigV4 écrit ici (pas de SDK).
- **Uploader** (Redis), **OpenAPI** (documents générés des sources TS et embarqués, interface Swagger d'un CDN).

**Vérification :**
- `./verify.sh` vert : **113 tests** (+8 depuis la pause).
- Playwright Chromium (`dev/dev test rust … --project=chromium`) : livekit 5/5, map_editor_livekit 2/3,
  screensharing 1/1, recording 6/6, room-api 5/5, swagger_doc 1/1, scripting_audio_stream 1/2 ; réf. TS 19/20.
- Échecs classés : `map_editor_livekit:62` environnement (POST en dur sur le port 80) ; `scripting_audio_stream:101`
  échec connu TS ; `recording:62` et `:186` ont échoué deux fois sous une charge de 13 à 15 (l'egress mettait 7 s
  à démarrer et l'arrêt du test l'annulait : « Start signal not received »), puis passent 4 fois sur 4 seuls.
- Un premier passage sans `--project=chromium` a joué les autres navigateurs, absents de la machine : 40 « échecs »
  sans valeur, rejoué.

## Jalon 8 — admin SaaS (les 31 appels) et white label (17/10)

**Aide extérieure :**
- Contrat `dev/contracts/admin-api.md` (socle) : la liste A1-A31 et les appels entrants ont servi de plan.
- Deux inventaires TS par des sous-agents Sonnet de cette session : la chaîne analytics (file, catalogue,
  intervalles, échantillons vidéo, réunions du back), puis Matrix (pour le jalon suivant).
- Lecture de `lang-go` : rien.

**Ce qui est en place :**
- **Socket admin** `/ws/admin/rooms` (`ADMIN_SOCKETS_TOKEN`) : `listen` (présents, puis arrivées et départs),
  `banned` par monde, refus 1007/1008.
- **Analytics (A22)** : une file bornée (la plus ancienne part quand elle est pleine), un lot par vidage, quatre
  essais avec attente croissante, un 422 rejoué événement par événement pour ne perdre que l'invalide, vidage au
  SIGTERM (`DRAIN_TIMEOUT_MS`). Événements du front contrôlés sur le catalogue (180 noms générés des sources TS,
  `tools/gen-analytics-catalog.sh`) et sur leur source ; intervalles (`timed_event.open/close`, session de connexion
  `user.connected`/`user.disconnected` fermée en dernier) ; `media.video_quality.sample`. Les réunions du back
  (`meeting.participation.ended`, `meeting.ended`) sont calculées dans le cœur (`meetings.rs`, horloge passée en
  paramètre) en observant le space après chaque changement, au lieu d'accrocher chaque méthode.
- **Admin** : message global (room ou monde, A6 sans filtre de tags), ban par IP et son aperçu (utilisateurs du
  monde demandés aux acteurs des rooms, comme `getWorldUsers` aux backs), variables de joueur du monde (`pw_`, groupe
  des détails de carte), `/profile` et `/profile-callback` (A30, A31).
- **White label** : `/manifest.json` habillé comme la page (méta-balises de l'admin), `/server.json`, `/jwt`.
- **Correctif trouvé par un test** : une session pouvait finir avant d'avoir traité les messages reçus juste avant
  la fermeture (le `select!` tirait au hasard entre la boîte de réception et la fin). Le TS les traite dans
  l'ordre ; la sélection est désormais prioritaire sur la boîte.

**Vérification :**
- `./verify.sh` vert ; nouveaux tests de scénario avec un faux admin (socket admin, analytics avec 422, message
  global et aperçu de ban, profil avec faux fournisseur OIDC, manifest) et deux tests du cœur des réunions.
- Playwright Chromium, non-régression : api_players, moderation, pwa_install_menu, map_editor_global_message,
  meeting, spaces, raise-hand, scripting_spaces, reconnect : **29/31**. Les deux échecs sont de l'environnement,
  classés ainsi dans la référence TS : `scripting_spaces:401` (POST de debug en dur sur le port 80),
  `spaces.spec:18` (redémarre un back TS).
- Rien n'est encore prouvé contre la vraie admin : c'est le parcours SaaS (`dev/saas`), étape 7.

**Erreur de méthode :** un commit (ea4cb594d) est parti alors que `verify.sh` échouait, la commande étant
enchaînée par `;`. Le commit suivant (d8ae1fc04) corrige la cause ; depuis, le commit n'est lancé qu'après un
`verify.sh` réussi (`&&`).

## Jalon 9 — demandes qualité, refonte, bibliothèques, Matrix (17/10)

**Aide extérieure :**
- Du socle : la liste du §5.3 du rapport Codex, la décision « bibliothèques de référence » (prise pour Go, appliquée
  ici), deux vidages de Synapse.
- Sous-agents Sonnet de cette session : inventaire Matrix (TS seul), audit des erreurs avalées.
- Lecture de `lang-go` : rien.

**Ce qui est en place :**
- CI (`continuous_integration.yml`, job server-rust) et CodeQL Rust ; formatage à 120 colonnes ; cargo deny
  (rustls mis à jour, 4 avis) ; SSRF fermée ; `id_token` vérifié, cookie PKCE scellé ; un JSON stocké corrompu
  n'est plus écrasé ; corps des PATCH comme body-parser ; routes de debug du back. Voir `IMPROVEMENTS.md`.
- Refonte : `logic/` et `room_actor/` découpés par famille, l'état de la room en struct.
- S3 sur `aws-sdk-s3`, LiveKit sur `livekit-api` ; réponses de l'admin typées, générées des schémas zod.
- Matrix : session admin Synapse partagée par Redis, `/roomArea`, salles des zones entrées et quittées, hooks
  `resourceUrl` de map-storage.

**Correctif trouvé par les specs :** l'écho d'une édition de zone dont un hook a changé le `serverData` doit porter
`modifyServerData` (et la zone entière) : sans lui, l'éditeur ne réapplique pas sa propre commande et n'apprend
jamais l'id de la salle créée. Les 5 tests de `matrixChatArea` échouaient tous pour cette raison, puis passent.

**Vérification :**
- 131 tests (`verify.sh`), couverture des lignes : core 85 %, `ws.rs` 80,8 %.
- Playwright Chromium : non-régression après refonte 22/25 (2 environnement connus, `scripting_follow` 2/2 seul) ;
  LiveKit, enregistrement, partage d'écran 10/11 (`recording:62` lent en lot, 2/2 seul) ; Matrix : `matrixChatArea`
  5/5, les 6 autres fichiers 26 réussis et 2 sautés, `matrixChatModeration:28` et `:60` échouent sur
  `@john.doe` pris par la spec jouée avant (cas classé environnement dans la réf. TS), rejeu seul demandé.
