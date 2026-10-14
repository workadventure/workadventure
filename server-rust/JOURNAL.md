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

**Pas encore là :** map-storage (phase 2, en attente du feu vert), LiveKit et donc l'enregistrement, la bascule
du mégaphone en LiveKit, analytics du `kind`.
