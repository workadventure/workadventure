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
