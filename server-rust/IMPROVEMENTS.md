# Qualité : revue du code Rust (17/10)

Les questions posées par Yannis via le socle, appliquées à ce code. Ce qui était simple ou touchait la sécurité est
corrigé (avec le commit) ; le reste est noté ici, avec la raison et la prochaine action. Lien depuis `PARITY.md`.

## Corrigé

| Point | Ce qui a été fait | Preuve |
|---|---|---|
| SSRF, « embeddable website » | Le serveur ne demande jamais une adresse privée (loopback, RFC 1918, ULA, link-local dont 169.254.169.254, CGNAT, multicast, documentation) : un résolveur DNS qui ne rend que les adresses publiques (le contrôle se fait à la connexion, un nom re-pointé entre-temps est refusé), une politique de redirection qui ne suit pas une adresse privée littérale. Un site d'un réseau privé est répondu « intégrable » sans être demandé : c'est le navigateur de l'utilisateur, pas le serveur, qui le charge. | test `private_networks_are_never_asked` ; `scripting_open_cowebsite` vert |
| OpenID | `id_token` vérifié : signature (JWKS du fournisseur, ou secret client pour HMAC), `iss` (issuer découvert), `aud`, `exp` (60 s de marge), `nonce` envoyé par ce serveur. Le verifier PKCE et le nonce voyagent dans un cookie scellé AES-256-GCM (clé dérivée de `SECRET_KEY`). Le `state` est exigé (avant : vérifié seulement s'il était présent). Vérifié côté admin SaaS : le fournisseur (`ronvanderheijden/openid-connect`) recopie le `nonce` et signe en RS256. | test `an_openid_login_needs_a_signed_id_token…` (bon nonce, mauvais nonce, cookie modifié, sans state) ; `oidc.spec` 2/2 contre le fournisseur de la stack |
| Erreurs avalées | Audit de `crates/server/src` (sous-agent Sonnet, ~45 envois à un acteur parti jugés bénins). Corrigé : un fichier JSON stocké illisible ou corrompu n'est plus traité comme absent puis **écrasé** (perte de données) : la modification est refusée et journalisée ; lectures disque, suppression d'asset, répertoires et WAM illisibles, ban refusé par l'admin, tags de room, révocation OIDC, lecture Redis de l'uploader, carte injoignable : journalisés. | test `a_corrupt_json_file_is_never_written_over` |
| Corps des PATCH map-storage | Comme `bodyParser.json` : types `application/json` et `application/json-patch+json` seulement (un autre type = corps vide), limite `BODY_PARSER_JSON_SIZE_LIMIT` (100mb par défaut, unités b/kb/mb/gb), 413 au-delà, mode strict (objet ou tableau). | test `a_wam_patch_is_read_like_body_parser…` |
| Dépendances | `cargo deny check` vert : rustls 0.23.46 (4 avis RUSTSEC-2026-0346 à 0349), licence SPDX `AGPL-3.0-only`, plus de version `*`. `cargo machete` : aucune dépendance inutilisée (celles du code protobuf généré sont déclarées). | job CI |
| Routes de debug du back | `GET /dump?token=` (rooms et joueurs, `[{roomUrl, users}]`), `POST /debug/close-space-connection?spaceName=&token=` (400 sans nom, 500 pour un space inconnu, 200 sinon). Il n'y a pas de lien pusher↔back à couper ici : la route ne coupe rien, `scripting_spaces:401` et `map_editor_livekit:62` ne prouvent donc pas une reprise sur ce serveur. | test `the_debug_routes_of_the_back…` |
| Style | `rustfmt.toml` à 120 colonnes (comme Prettier côté TS), tout reformaté, `cargo fmt --check` en CI. | job CI |

## Vérifié, rien à changer

- **Assets relayés depuis le conteneur front** : la réponse amont n'est recopiée que pour une liste blanche
  d'en-têtes (`Content-Type`, `Cache-Control`, `ETag`, `Last-Modified`, `Expires`) ; ni `Access-Control-*` ni
  `Set-Cookie` ne ressortent.
- **TLS** : `reqwest` avec rustls et `rustls-platform-verifier` (magasin du système ; sous Linux
  `rustls-native-certs`, qui lit `SSL_CERT_FILE`). Aucune option « insecure » dans le code.
- **Le cœur** ne dépend que de `serde`, `serde_json` et `regex` : ni transport, ni protobuf, ni HTTP, ni Redis, ni
  adaptateur. Les ports sont déclarés dans le cœur (`room::Sink`, `space::SpaceSink`, `room::Clock`) ; l'horloge
  est injectée (retour WebRTC après 20 s et finalisation après 5 s testés sans attendre). Les réunions analytics
  sont calculées dans le cœur (`meetings.rs`, le temps en paramètre) ; l'envoi est dans l'adaptateur.

## À faire (noté, pas corrigé)

| Point | Constat | Proposition |
|---|---|---|
| Biais de migration : `logic.rs` | 738 lignes, un `match` de 32 messages qui grossit à chaque fonction, comme `IoSocketController`. Il ne fait que traduire, mais une session porte aussi les spaces rejoints, les variables de joueur et les intervalles analytics. | Découper par famille (`logic/space.rs`, `logic/admin.rs`, `logic/analytics.rs`) avec un trait par famille ; le `match` ne fait plus que router. À faire avant Matrix, qui ajoute encore des messages. |
| Biais de migration : `room_actor.rs` | 1 266 lignes, 24 commandes. | Même découpage par famille de commandes. |
| `serde_json::Value` pour les réponses de l'admin | `admin_api.rs` lit les réponses en `Value` (18 usages) alors que le contrat est connu (`dev/contracts/admin-api.md`). Une réponse mal formée passe pour des champs absents. | Des types `serde` par réponse (A2, A3, A6…), refus explicite et journalisé d'une réponse invalide. |
| `main.rs` | Câblage seulement (ports, admin, analytics, arrêt) ; l'arrêt propre (vidage analytics) y est écrit en ligne. | Rien d'urgent ; sortir l'arrêt dans une fonction si une autre file s'ajoute. |
| SSRF : carte d'une room | La carte d'une room est lue par le serveur, y compris sur un réseau privé : c'est voulu par le TS (cartes auto-hébergées, stack de test), la carte est alors traitée comme « locale » (pas de contrôle de variables ni de persistance, comme le back). Bloquer casserait les déploiements sur réseau privé. | Une liste d'hôtes autorisés (variable) si la production le demande ; décision produit. |
| Panic dans un acteur | Une panique termine la tâche de la room ou du space : l'état en mémoire est perdu (pas laissé à moitié modifié), les sessions voient leur canal fermé et le registre recrée l'acteur à la prochaine demande. Pas de `catch_unwind`. | Tester ce chemin (une panique provoquée dans un test) et décider : redémarrage silencieux ou fermeture des sessions avec un code de reconnexion. |
| Bibliothèques maison | S3 (SigV4 écrit ici, ~200 lignes), Twirp LiveKit et jetons, configuration lue à la main. Choix fait pour limiter les dépendances. | `object_store` pour S3 et `livekit-api` pour LiveKit sont les candidats ; à décider avec l'équipe (taille de l'image, temps de build). Redis (`redis`) et gRPC (`tonic`) sont déjà les crates de référence. |
| Couverture | Lignes, tous tests confondus : core **85,4 %**, server 56,2 %, bot 53,2 %. Fichiers : `ws.rs` 56 % (cible 70 %), `logic.rs` 43 %, `session.rs` 75 %, `resume.rs` 100 %, `room.rs` 96 %, `space.rs` 82 %. | Tests de scénario sur `ws.rs` (refus d'upgrade, reprise refusée, admin en erreur) et sur les commandes réservées aux admins (`mute`, `kickOffUser`) : prochaine tranche. |
| Code mort | Pas de toolchain nightly ici pour `cargo udeps` ; `cargo machete` ne trouve rien, `clippy -D warnings` ne signale aucun `dead_code` (les `pub` du crate ne sont pas couverts par ce lint). | `cargo +nightly udeps` en CI si l'équipe veut l'outil. |
| Optimisations du rapport Codex (§5.3) | Le P0 (I/O de carte hors de l'acteur de room) est fait et prouvé (Jalon 6). Je n'ai pas le reste du rapport. | Demander au socle la liste du §5.3 pour en noter l'état ligne à ligne. |
| Admission sous saturation (§5.4) | Files bornées et budgets en place ; pas de politique d'admission. | Inchangé, voir `PARITY.md`. |
