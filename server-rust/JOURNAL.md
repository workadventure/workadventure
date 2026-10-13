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
