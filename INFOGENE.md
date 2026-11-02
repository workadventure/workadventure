# Contribuer au fork Infogène de WorkAdventure

Ce dépôt est un fork de [workadventure/workadventure](https://github.com/workadventure/workadventure) (base `v1.32.6`)
qui alimente notre WorkAdventure interne. Seul le service **`play`** (front + pusher) est notre image ; le reste est officiel.
Les conventions de code de WorkAdventure sont dans `AGENTS.md` / `play/AGENTS.md`.

Le développement du front se fait dans ce fork. Les cartes, bundles et configurations
de déploiement sont dans le dépôt privé
[workadventure-selfhost](https://github.com/goyan/workadventure-selfhost) : son accès
est également nécessaire pour travailler sur ces éléments.

## Le circuit

```
branche feat/xxx ──PR──▶ infogene ──(auto)──▶ BETA  wa-beta.goyan.fr     (staging, compte Authentik requis)
                                   │
                                   └─ release (par un « releaser ») ──▶ PROD  wa.goyan.fr
```

1. **Créer une branche** depuis `infogene` : `git switch -c feat/ma-modif origin/infogene`.
2. **Commits petits et ciblés**, message en français : `feat(front): …`, `fix(front): …`, `test(front): …`, `ci: …`.
   Un patch qui touche peu de fichiers se rebase facilement sur les prochaines versions de WorkAdventure.
3. **Ouvrir une pull request vers `infogene`**. Elle doit avoir : les vérifications vertes (voir ci-dessous) et **une relecture**.
4. **Après fusion**, la CI construit l'image et la **beta se met à jour seule** (~10 min). Tester sur https://wa-beta.goyan.fr
   (Ctrl+F5). *Le code n'est pas déployé en beta avant la fusion.*
5. **Mise en prod** : une release est un tag `v1.32.6-infogene.N` (le numéro final augmente à chaque fois, un tag ne se
   réécrit jamais). Un tag **ne déploie rien seul** : seules les personnes autorisées (« releasers ») décident de la prod.
   Demandez-leur, après validation en beta.

### Depuis un Mac ou un autre poste contributeur : aucun SSH requis

Le clone de ce fork sur le Mac est `~/perso/wa/workadventure` ; le repo d'infra est
`~/perso/wa/workadventure-selfhost`. Le VPS tire les images tout seul : publier sur GitHub suffit.
Suivre `build-play` avec `gh run list --repo goyan/workadventure`, attendre le timer (toutes les 2 minutes),
puis vérifier que https://wa-beta.goyan.fr/ répond 200 ou 302 et tester le jeu dans le navigateur.

La révision exacte du conteneur et ses logs se vérifient sur le VPS, selon la section 3.2 du guide d'infra.
Ils ne constituent pas une étape de publication depuis un poste contributeur. Communiquer la branche et
le SHA du commit publié à la personne qui fait cette vérification. `ubuntu@51.254.136.221` décrit le contexte
d'exploitation sur le VPS, sans impliquer qu'une clé est autorisée depuis le Mac ; ne pas demander ou ajouter
un accès SSH pour publier. Distinguer les preuves : CI réussie, URL beta accessible, révision du conteneur
confirmée côté VPS et comportement visuel confirmé par l'utilisateur.

## Vérifications automatiques d'une PR (`pr-checks`)

Même chaîne que la CI d'origine de WorkAdventure, sur `play/` : typecheck, svelte-check, lint, formatage Prettier,
complétude des traductions, tests unitaires. Pour les lancer en local (Node 24, `protoc` installé) :

```bash
npm ci --workspace=workadventure-play
(cd messages && npm ci && npm run ts-proto)
cd play
npm run typesafe-i18n && npm run typecheck && npm run svelte-check && npm run lint && npm run pretty-check && npm test
npm run pretty        # corrige le formatage
```

## Règles

- **Ne jamais committer de secret** : ce dépôt est **public**.
- Écrire du code (et ses commentaires) en anglais, comme le reste de WorkAdventure ; messages de commit en français.
- Les écouteurs d'événements doivent être nommés et retirés (règle de lint `listeners/*`).
- Ne pas modifier les fichiers de `.github/workflows/` sans en parler : le workflow `build-play` publie l'image de la prod.
- Un comportement visuel (zoom, interaction, interface) n'est « terminé » que quand quelqu'un l'a **vu fonctionner en beta**.
- Pousser sur `infogene` déploie ce code **sur notre serveur** : les droits d'écriture sont réservés aux personnes de confiance.

## Patchs actuellement portés par le fork

Zoom de page désactivé hors canvas (`Utils/PreventBrowserPageZoom.ts`), caméra centrée sur l'avatar à tout zoom et pan
souris/trackpad (`Phaser/Game/CameraManager.ts`, `Phaser/UserInput/GameSceneUserInputHandler.ts`), zoom par défaut par
paliers de 0,25 (`Phaser/Services/HdpiManager.ts`), CI de build et de contrôle (`.github/workflows/`).
Notification de nouvelle version (`Components/BuildUpdateNotification.svelte`, `Network/BuildUpdate.ts`,
`pusher/controllers/FrontController.ts`) : le serveur identifie le front compilé par le SHA-256 de son HTML
(qui référence les assets Vite avec leur hash), le transmet dans la page et expose `/build-version` sans cache.
Le client compare la version de sa page au serveur toutes les minutes et au retour dans l'onglet.
Le bandeau reprend `ToastContainer` et propose « Rafraîchir » ou « Plus tard », sans rechargement automatique.
« Plus tard » masque la notification pour cette session. Les pages déjà ouvertes avant l'installation de ce
patch doivent être rafraîchies une première fois pour pouvoir recevoir les prochaines notifications.
Les nouveaux messages sont traduits ; le haut et le bas sorabe utilisent provisoirement l'anglais.
Le bandeau décrit aussi les fonctionnalités et correctifs ajoutés depuis le front chargé.
« Outils → Nouveautés » ouvre l'historique complet, accessible sans droit d'édition, avec
type, date, heure et auteur. Les textes sont les sujets français des commits publics `feat(front):`
et `fix(front):` depuis `v1.32.6`, du plus récent au plus ancien ; les dates sont celles des
commits appliqués, affichées avec l'heure dans le fuseau et la langue du lecteur
(`formatReleaseNoteDate`), et les auteurs sont leurs noms Git (sans email ni corps de commit).
`build-play` régénère `play/src/common/release-notes.json` avant chaque image, beta ou release :
la liste ne dépend donc pas d'un service GitHub pendant le jeu. Le snapshot versionné sert
au développement local ; le régénérer depuis le clone complet avec
`node play/scripts/generate-release-notes.mjs`. Une mise à jour sans commit fonctionnel affiche
un message indiquant que le détail n'est pas disponible, et la proposition de rafraîchir reste active.
Décor extérieur (`Phaser/Game/GameScene.ts`) : la propriété Tiled facultative `exteriorTexture`
(type fichier, chemin relatif au TMJ) active une texture répétée derrière la carte. Son origine,
son échelle et son déplacement suivent les tiles de la carte ; elle couvre les bornes étendues
de la caméra. Les limites physiques de la carte restent celles du TMJ.
Utiliser une image dont la largeur et la hauteur sont des puissances de deux (par exemple 128 × 128)
pour que Phaser conserve l'échelle du motif en WebGL. Le jardin et le fond doivent utiliser
cette même image avec le même alignement. Les cartes sans cette propriété gardent leur fond habituel.
Tenir cette liste à jour à chaque patch.

### Sélection et édition en masse

L'outil « Sélection » permet de tracer un rectangle bleu translucide dans l'éditeur.
Les objets qui croisent ce rectangle sont sélectionnés, y compris les sols, murs, meubles,
objets personnalisés et exemplaires superposés ; les zones sont incluses pour les éditeurs
ayant le droit global. Le rectangle et les contours restent visibles après le tracé.

Le panneau propose Copier, Coller, Déplacer, Supprimer et Remplir. Copier conserve un instantané
dans le presse-papiers interne à la salle ; **il ne contient que des objets** : les zones sélectionnées ne sont pas copiées
(une sélection de zones seules se comporte comme une sélection vide pour Copier), alors que Déplacer et Supprimer agissent
toujours sur les zones sélectionnées. Coller et Déplacer affichent un aperçu :
un clic confirme la destination, Échap l'annule. Déplacer se termine après un clic ; Coller est un **tampon** : le mode reste armé
avec le même contenu après chaque pose (une nouvelle copie, de nouveaux identifiants et une entrée d'annulation par clic)
et ne se termine que par Échap, le bouton Annuler, un changement d'outil ou la fermeture de l'éditeur. Une pose refusée garde le mode
et affiche l'erreur ; un clic pendant une pose en cours est ignoré. Le motif armé est surligné dans la liste « Motifs » ;
cliquer un autre motif change de motif sans quitter le mode. Les éléments gardent leurs positions relatives.
Remplir répète la tuile choisie dans la palette dans le rectangle sans déborder ni recréer
une instance identique au même emplacement. Les actions indisponibles sont désactivées.

Chaque opération utilise les commandes natives par élément et forme une seule entrée locale
d'annulation/rétablissement. Les droits et limites sont contrôlés avant l'action groupée.
Les superpositions sont autorisées, comme la pose native avec Maj ; la destination reste
soumise aux droits, limites et contrôles des joueurs. Le protocole réseau conserve les commandes
individuelles : une concurrence entre éditeurs peut entraîner une réconciliation du groupe.
Les calques TMJ statiques restent hors sélection ; le rectangle ne crée pas de zone métier.

#### Motifs partagés

« Enregistrer comme motif » (actif si la sélection contient au moins un objet) demande un nom (1 à 60 caractères) dans un
champ du panneau, puis enregistre la sélection côté Admin API. Le bloc « Motifs », sous « Tuile à poser »,
liste les motifs de tous les éditeurs du monde (nom, nombre d'objets) : **un clic sur un motif le
colle** (même mode Coller que le bouton, il remplace le contenu du presse-papiers interne) ; la poubelle à droite
d'un motif le supprime. Le motif est partagé entre toutes les salles : il ne dépend pas de la carte d'origine.

Le motif contient des positions relatives au coin de **case** qui contient le coin haut-gauche de la sélection (et non ce coin
lui-même : un mur fin est centré sur une ligne de grille, donc 6 px avant elle, et le motif doit garder ce décalage pour que
le collage, qui avance par cases entières, retombe sur la grille de la source), sans les identifiants d'origine
(de nouveaux sont créés au collage). Un motif enregistré avant cette règle reste ancré sur son coin exact : à réenregistrer. Un objet dont le prefab n'est chargé dans aucune collection de la carte
courante est ignoré, et un message indique combien d'objets l'ont été.
**Les motifs ne contiennent que des objets** : le front n'envoie jamais de zone et le pusher refuse (400 `invalid`) un
motif qui en contient. Le schéma commun continue de lire des éléments `area` : les anciens motifs enregistrés avec des
zones se collent sans elles, et ces zones ignorées ne sont pas comptées comme des éléments ignorés (choix, pas erreur).

Chemin d'appel : panneau `SelectionEditor.svelte` → `SelectionEditorTool` (`saveSelectionAsPattern`,
`pasteFromPattern`) et store `MapEditorPatternStore` → pusher `/map-patterns` (`MapPatternController`,
`MapPatternService`) → Admin API `/api/map-patterns`. Le navigateur n'a jamais le jeton de l'Admin API. Le
pusher recalcule le droit à chaque appel (`fetchMemberDataByUuid` pour la salle courante, `canEdit` requis,
sinon 403), valide le motif avec le schéma commun `play/src/common/MapPattern.ts` avant l'envoi et prend l'auteur
dans le jeton authentifié. Limites : 2000 éléments et 256 Kio par motif, 200 motifs au total (409 « quota »),
60 requêtes par minute et par utilisateur (429). Sans `ADMIN_API_URL`/`ADMIN_API_TOKEN` la fonction est
désactivée (« indisponible » dans le panneau). Seul l'**auteur** d'un motif ou un **administrateur** (tag `admin` de l'Admin API, le même que pour les messages globaux)
peut le supprimer : le pusher envoie `requestedBy` (utilisateur authentifié) et `admin` à l'Admin API, qui répond 403 sinon,
et la poubelle n'apparaît que si `canDelete` est vrai. Le navigateur ne reçoit jamais `createdBy`, seulement `canDelete`.
`MapPatternService` utilise sa propre instance axios : la Room API (`AdminAuthenticator`, code amont) pose un cache GET de
5 minutes sur l'instance axios par défaut de tout le processus, qui masquait un motif tout juste créé.

À valider en beta (visuel) : enregistrer, voir le motif dans la liste d'une autre salle, le coller, le supprimer.

### Fumée de course

Quand le joueur local court (Maj maintenu en se déplaçant, hors mode suivi), des bouffées de fumée grises restent au sol derrière
lui (`Phaser/Components/RunSmokeTrail.ts`, appelé par `Player`). Elles grossissent en s'estompant (environ 0,3 s), sont dessinées
sous l'avatar et ne sont pas envoyées aux autres joueurs. Le déplacement au double-clic n'en produit pas.

À valider en beta (visuel) : courir dans les quatre directions, vérifier la taille et la durée de la fumée.

### Animation de course

Quand le joueur court (Maj maintenu en se déplaçant, hors mode suivi), l'animation de marche de l'avatar est jouée deux fois plus vite
(`RUN_ANIMATION_SPEED` dans `Phaser/Player/Animation.ts`, `timeScale` de l'animation dans `Character.playAnimation`). L'état est envoyé aux
autres joueurs par le champ `running` de `PositionMessage` (le pusher et le back le relaient tel quel) : ils voient donc aussi l'avatar courir.
Un changement d'état (début ou fin de course) est envoyé immédiatement, sans attendre le délai d'envoi des positions.

À valider en beta (visuel) : courir avec deux navigateurs et comparer la vitesse d'animation vue de l'autre côté.

### Déplacement au double-clic

Un double-clic gauche sur la carte lance le déplacement vers le point visé à la vitesse
de course habituelle (celle de Maj), via le pathfinding (`Utils/PathfindingManager.ts`, A* sur les cases, sans
dépendance). Les cases bloquées de la grille de collision et les **murs de la couche carte** sont pris en compte : ces
murs sont des **barrières fines entre deux cases** (`Utils/TileBarriers.ts`, déduites du modèle de la couche carte par
`MapLayerBarriers`), pas des volumes, et les cases de part et d'autre restent libres. Un mur horizontal sépare sa case de
celle au sud ; un mur vertical sépare les cases ouest et est sur la rangée **sous** celle où il est dessiné, car sa collision
arrête les pieds de l'avatar (le corps monte de 16 px au-dessus). La case se juge sur les **pieds** de l'avatar, pas sur son
centre. Les diagonales ne coupent pas les coins ; un coin touché par une barrière interdit la diagonale. Le trajet est
ensuite lissé en lignes droites, en gardant la largeur du corps et celle du mur de chaque côté.
La case visée est atteinte exactement (au centre de la case si elle touche un mur). Une pièce fermée est **refusée**, jamais
reportée de l'autre côté du mur. Seule une case qui ne peut pas être occupée (un objet volumineux, via `collisionGrid`) est
remplacée par la case libre voisine la plus proche de l'avatar, sans traverser de mur.
Pendant un trajet calculé, les colliders des murs de la couche carte ne repoussent plus l'avatar (le trajet les évite déjà ;
sinon le recouvrement d'1 px des rectangles de 18 px faisait saccader). Le clavier garde toutes ses collisions.
L'anneau de destination est dessiné au-dessus des sols de la couche carte.
Un double-clic au-delà des limites de la carte, sur le décor extérieur, est ignoré.
Une touche de déplacement reprend le contrôle de l'avatar. Un clic simple garde
l'activation des objets, le glisser garde le pan de caméra et le clic droit garde
son déplacement habituel. Le double-clic ne lance pas de déplacement dans l'éditeur
ou quand les contrôles / le déplacement au clic sont désactivés.

Pour valider en beta : double-cliquer de l'autre côté d'un mur, puis dans le jardin ;
vérifier le contournement et la course, reprendre la main avec une flèche, puis tester
un clic simple sur un objet et un glisser de caméra.

### Rectangles de collision des entités

Un prefab de catalogue peut déclarer `collisionRectangles` : des rectangles en pixels, relatifs au coin
haut-gauche de l'entité (`{x, y, width, height}`). Ils bloquent l'avatar en plus (ou à la place) de la grille
`collisionGrid` de 32 px, et suivent l'entité quand l'éditeur la déplace, la copie ou la supprime. Cela permet
des murs et des portes éditables dans le jeu avec des collisions fines, par exemple un mur de 6 px ou une bande
de 3 px au pied d'une façade. Mettre `collisionGrid: [[0]]` pour garder l'aimantation à la grille de l'éditeur.
Le catalogue est lu par le front seul (`EntitiesCollectionsManager`) : les images officielles de `back` et
`map-storage` n'ont pas à changer. L'import d'image de l'éditeur (« Ajouter votre image ») ne porte pas ces
rectangles ; ils se déclarent dans le JSON du catalogue statique. Ne pas les écrire à la main dans le catalogue des
entités personnalisées : `map-storage` l'ouvre et le réécrit avec son schéma, qui supprime le champ.
Une liste de rectangles invalide est ignorée (l'entité reste, sans collision fine) sans faire rejeter le catalogue.
Le pathfinding du double-clic ne **route** que les murs de la couche carte (barrières entre cases, voir « Déplacement au
double-clic ») ; pour tout autre objet à rectangles, il **refuse** le trajet qui les traverse, sans contournement (la grille
de navigation voit la case libre quand `collisionGrid` vaut `[[0]]`). Router ces objets est à faire plus tard. Ajouter un mur annule un trajet en cours du joueur
local ; en retirer un ne l'annule pas. Le gestionnaire Phaser n'a pas de test automatisé (le dépôt n'a pas de banc
Phaser sans navigateur) : comportement validé en jeu uniquement.

### Création de carte depuis l'éditeur

Dans l'éditeur, la propriété de zone « Quitter la carte » (`exit`) propose un bloc **« Créer une nouvelle carte »** : nom, bouton, et la sortie pointe
aussitôt sur la carte créée. Le pusher (image `play`) **demande la carte à l'Admin API** (`POST /api/room/create`, jeton `ADMIN_API_TOKEN` habituel), qui copie un
dossier modèle de `map-storage` ; ni `back` ni `map-storage` ne changent. Le pusher n'a **aucun identifiant d'écriture** de `map-storage` : le compte Basic reste dans
l'Admin API, jamais exposée sur Internet (contrat dans `admin-api/README.md` du repo selfhost).
Endpoint du pusher : `GET /map-creation?roomUrl=…` (le bouton n'apparaît que si `allowed`) et `POST /map-creation` ; les deux exigent le jeton de l'utilisateur
(`authenticated`) et **recalculent le droit côté serveur** par l'Admin API : l'utilisateur doit pouvoir éditer la salle ET porter le tag `MAP_CREATION_TAG`.
L'URL de salle envoyée par le navigateur sert de contexte à ce calcul : elle doit avoir l'origine de `PUSHER_URL` (absolue partout, contrairement à `FRONT_URL`
qui vaut `/` en beta), être de la forme `/~/<chemin>.wam` et exister dans `map-storage` ; elle est reconstruite à partir de son chemin avant l'appel.

Active dès que `ADMIN_API_URL`, `ADMIN_API_TOKEN` et `INTERNAL_MAP_STORAGE_URL` (lecture de `GET /maps`) sont posées ; aucune variable propre à ajouter.
Côté Admin API : `MAP_CREATION_TEMPLATE` (modèle, vide = désactivée → 503), `MAP_CREATION_MAX` (30). Réglages du pusher : `MAP_CREATION_TAG` (défaut `admin`,
`*` = tout éditeur, développement seulement), `MAP_CREATION_MAX_PER_USER_PER_HOUR` (5).

- L'Admin API revérifie le tag `admin` dans sa base, réduit le nom à `carte-<nom simplifié>-<suffixe aléatoire>`, applique le plafond total (dossiers `carte-*` dans
  `map-storage`) et ne crée qu'une carte à la fois. Le pusher vérifie seulement la longueur du nom (1 à 60) ; un nom sans lettre ni chiffre (`???`) est refusé (400).
- Réponses traduites par le pusher : 201 → `{ folder, roomUrl }`, 400 → 400, 403 → 403, 409 (plafond) → 429, autre (503, 401…) → 502. La réponse 201 n'est acceptée que
  pour un dossier `carte-…` et `roomUrl = /~/<dossier>/office.wam` : une sortie ne peut pas pointer ailleurs.
- Les erreurs réseau vers l'Admin API et `map-storage` sont remplacées par une erreur assainie avant de sortir du service (une erreur Axios brute porte l'en-tête
  `Authorization`, donc `ADMIN_API_TOKEN`) ; rien de brut n'est journalisé.
- Sémantique du droit : les tags viennent de l'Admin API pour la salle d'origine citée (salle existante du monde), pas pour la carte à créer. Le seul garde est donc le tag
  (l'Admin API de la selfhost renvoie `canEdit: true` à tous, et tous les comptes portent `admin`). `*` est refusé quand `NODE_ENV=production` (la fonction se désactive).
- Limites du pusher **en mémoire** (par utilisateur et par heure, interrogations 30 par minute) : remises à zéro au redémarrage et non partagées entre instances
  (acceptable en beta mono-instance). Le plafond total, lui, est persistant (compté dans `map-storage` par l'Admin API).
- La liste déroulante des sorties vient de `/api/room/sameWorld` de l'Admin API ; les dossiers `carte-test-*` (essais) en sont exclus.
- Un seul monde : le plafond et le préfixe `carte-` sont globaux. À scoper par monde si un second monde est ajouté.
- Le nom saisi n'est pas écrit dans le WAM (aucune retouche après la copie). Le nom du modèle s'affiche donc dans les listes.
- Les textes sont traduits en français ; les autres langues utilisent provisoirement l'anglais.
- Vérifié : route de l'Admin API de bout en bout en beta (401, 400, 403, 201, WAM servi) ; tests unitaires du pusher (Admin API simulée). **Non vérifié** : le bloc dans
  l'interface de l'éditeur (cliqué à la main), l'appel réel pusher → Admin API, la beta avec ce code.

### Valider la notification en beta

Ouvrir une session après le déploiement du patch, puis garder l'onglet ouvert pendant le déploiement beta suivant.
Le bandeau doit apparaître sans interrompre le jeu ; « Plus tard » le masque et « Rafraîchir » recharge la page.
Un onglet resté en arrière-plan doit détecter la mise à jour à son retour. Une panne réseau ou une réponse
invalide de `/build-version` ne doit pas annoncer de nouvelle version.

### Collisions partielles Tiled — prototype local

La branche `feat/tiled-partial-collisions` ajoute un support facultatif des rectangles
du Collision Editor de Tiled. Activer la propriété booléenne `partialTileCollisions=true`
sur la carte et conserver `collides=true` sur chaque tuile concernée. Les rectangles
doivent rester dans leur case ; les polygones, ellipses et rectangles tournés conservent
la collision pleine existante. Les flips et quarts de tour des tuiles sont pris en compte.
Utiliser des calques non redimensionnés, sans parallaxe.

Le clavier utilise les rectangles précis. Le double-clic et l'éditeur conservent la
grille 32 × 32 : une case portant un mur reste entièrement bloquée pour calculer un
trajet. Les portes doivent donc laisser des cases libres. Le départ et la fin du trajet
sont vérifiés contre les rectangles et la taille de l'avatar ; un trajet risquant de
traverser un mur est refusé. Un changement de mur par script arrête le trajet en cours.
Les calques cachés de collision des meubles gardent leur comportement.

La propriété numérique facultative `tileLayerDepth` sur un calque de tuiles définit sa
profondeur d'affichage en pixels du monde. Pour une façade horizontale de 32 px, séparer
chaque rangée en un calque et régler sa profondeur sur le pied du mur : `(rangée + 1) * 32`.
L'avatar est ainsi masqué derrière la façade et visible devant. La collision reste
indépendante du dessin et peut occuper uniquement les derniers pixels de la tuile.
Sans cette propriété, ou avec une valeur non numérique/non finie, l'ordre existant
par rapport à `floorLayer` est conservé.

Les murs de l'outil Carte portent un `depthOffset` positif pour masquer ce qui est derrière eux.
Un objet trié sur sa rangée du haut (`depthOffset` négatif, comme les tables du pack de base)
passait donc derrière un mur qu'il chevauche, même posé sur la tuile devant ce mur. Un tel objet
reste désormais devant les murs qu'il chevauche dont le pied est sur une rangée au nord du sien ;
posé sur la tuile du mur ou derrière, il passe toujours derrière (`ObjectDepthFloor.ts`).
Un objet dont le pied est sur une case pleine de la grille de collision d'un autre (une plante sur une grande table)
est dessiné devant lui ; les places assises sont exclues, une chaise glissée sous une table reste derrière.
Il en va de même d'un objet dont le pied est dans l'image d'un autre devant lequel il est naturellement placé
(des livres dans une étagère) : sans cela, l'étagère remontée par le mur derrière elle passait devant eux.

Dans l'éditeur, un objet sélectionné affiche deux boutons ▲ et ▼ (à côté de ⟳ quand l'objet a des rotations).
Chaque clic le fait passer devant (ou derrière) l'image suivante parmi celles qu'il chevauche, du premier plan
au dernier (`depthStep` dans le WAM, `applyDepthStep` dans `ObjectDepthFloor.ts`). Le champ est transporté par
`CreateEntityMessage` / `ModifyEntityMessage` (`optional sint32 depthStep`) : `back` et `map-storage` doivent être
déployés avec ce champ, sinon l'ordre choisi n'est pas enregistré.

Sans la nouvelle propriété, les cartes gardent leurs collisions actuelles. Ce prototype
reste local, sans push ni déploiement. La recette dans le jeu WorkAdventure reste à faire
sur une salle séparée, avant toute modification de la carte beta habituelle.

## Bibliothèques d'objets communes

Le champ `entityCollectionsUrls` de la réponse `/api/map` de l'Admin API s'ajoute aux collections d'objets du WAM
(`GameScene.loadEntityCollections`, `mergeEntityCollectionUrls`). Les collections du WAM passent en premier ; aucun doublon
d'URL ni d'identifiant d'objet n'est conservé (le WAM prime). Sans Admin API (ou sans ce champ) l'effet est nul. Un objet
posé depuis une bibliothèque commune dépend de cette liste : si elle change, l'objet n'est plus résolu.

## Peindre les sols dans l'éditeur

Les dalles de la collection `Infogène Sols` (tag `Sols`, grille `[[0]]`, profondeur `-32`, une case de carte)
se posent au clic gauche maintenu : le mouvement remplit les cases intermédiaires sur la grille.
Le pinceau ignore les exemplaires du même prefab déjà présents à la même position et les créations encore
en attente. Relâcher le bouton, sortir du canvas, perdre le focus, changer d'objet ou d'outil, ou appuyer sur
Échap termine le tracé. Un clic droit abandonne l'aperçu.

Les dalles restent des entités WAM : les commandes natives assurent leur sauvegarde, leur diffusion aux autres
joueurs et l'annulation, une dalle à la fois. Les meubles et murs gardent leur placement au clic.
Deux éditeurs qui peignent simultanément la même case peuvent encore créer un doublon avant de recevoir les
commandes de l'autre ; cette version ne comporte pas de verrou côté serveur.

## Gommes et suppression dans l'éditeur

L'outil « Corbeille » (raccourci `5`) est supprimé : chaque outil a sa propre suppression.
- **Carte** : sa gomme n'efface que les sols et murs de la couche carte (un geste = une entrée d'annulation).
- **Objets** : un bouton « Gomme » (à bascule) supprime l'objet cliqué ou survolé le bouton enfoncé ; un bouton « Supprimer »
  dans le panneau de l'objet sélectionné le supprime (la touche Suppr reste). Les sols et murs de la couche carte
  n'en font jamais partie : ils se gomment avec l'outil Carte, qui garde leurs raccords cohérents.
- **Zones** : un bouton « Gomme » supprime la zone cliquée (la plus petite sous le pointeur) ; un bouton « Supprimer la zone »
  dans son panneau la supprime.
Choisir un objet à poser quitte la gomme ; changer d'outil la désactive. Les commandes WAM natives assurent la sauvegarde,
la diffusion et l'annulation. Les calques de fond TMJ restent gérés dans Tiled.

## Outils de l'éditeur indépendants

Chaque outil ne montre que ce qui le concerne ; le reste est atténué (opacité 0,4, `EntitiesManager.setEntitiesDimming`,
appliqué aussi aux entités qui arrivent d'un autre éditeur) ou masqué :
- **Zones** : les zones sont visibles ; objets, sols et murs sont atténués.
- **Carte** : sols et murs à pleine opacité, objets atténués, zones masquées.
- **Objets** : sols et murs restent à pleine opacité, zones masquées (un clic ne bascule plus vers l'outil Zones).
- Exploration, réglages de la salle et Sélection : rendu normal.
Les zones ne sont jamais incluses dans les motifs partagés.

Les sols et murs atténués sont assombris par une teinte grise (`DIMMED_MAP_LAYER_TINT`) et non par l'opacité : leurs
sprites se chevauchent et une opacité de 0,4 par sprite dessinait un damier le long des murs. Les objets gardent l'opacité.

### Zones calées sur le sol

Le premier clic et la fin du glisser se calent sur le coin de tuile le plus proche (un point blanc, comme l'outil mur, montre
ce coin avant le clic ; il disparaît au-dessus d'une zone existante, où le curseur devient une main : un clic l'ouvre).
Le rectangle est ensuite réduit à la boîte englobante des sols qu'il touche (`MapLayerAreaSnap.ts`) : une zone tracée sur une
pièce prend la taille de la pièce. Sans aucun sol sur la carte (carte TMJ classique), elle reste sur la grille de 32 px ; avec
des sols mais aucun sous le rectangle, aucune zone n'est créée. Le déplacement et le redimensionnement d'une zone restent
toujours sur la grille (plus besoin de Maj) ; ils ne sont pas contraints au sol. Le panneau de l'outil Zones explique
créer, ouvrir/modifier et supprimer (bouton ou gomme).

## Caméra en mode éditeur

À l'ouverture de l'éditeur, quel que soit l'outil, la caméra se détache de l'avatar sans saut et les contrôles de
l'avatar sont désactivés (raison `mapEditor`). Les flèches et ZQSD / WASD font défiler la carte (même vitesse que
l'Explorateur, `EditorCameraKeys.ts`) ; elles sont ignorées dans un champ de saisie et avec Ctrl / Cmd / Alt (pour
garder Ctrl+Z). Le trackpad à deux doigts déplace aussi la vue ; le glisser clic gauche reste réservé aux outils.
Le verrou `mapEditor` de l'avatar ne bloque pas les événements de scroll ou de pincement : ils atteignent le
gestionnaire de caméra natif. Les autres raisons de blocage (champ, fenêtre, script, écran d'erreur) restent
respectées ; l'Explorateur conserve son gestionnaire de molette pour éviter un double zoom.
Pendant l'édition, aucun clic droit, double-clic gauche ou toucher ne lance de déplacement vers le pointeur.
Les déplacements par clic reprennent leur comportement habituel après fermeture de l'éditeur.
Changer d'outil ne recentre pas la vue. À la fermeture, les contrôles sont rétablis et la caméra revient sur l'avatar
(~300 ms), le zoom de l'Explorateur étant restauré comme avant.

## Recentrage sur la case à l'arrêt

Quand l'avatar du joueur local s'arrête après un déplacement au clavier ou au joystick, il glisse en ~0,1 s (vitesse de
marche) jusqu'au centre de la case sous ses pieds (`Phaser/Player/TileSnap.ts`, `Player.snapToTileCenter`). Pas de
glissé en mode suivi, si un chemin est déjà suivi, si la case est en collision ou si le trajet n'est pas libre
(collisions partielles). Toute nouvelle touche de déplacement l'annule. Le double-clic « courir vers » vise lui aussi le
centre de la case cliquée. Ces deux comportements sont pilotés par la variable `ENABLE_TILE_SNAP` (booléenne,
**désactivée par défaut**) ; sans elle, rien ne change. `GameScene.moveTo` et le pathfinding ne changent pas : `WA.player.moveTo` garde sa position exacte.

## Magnétisme des objets dans l'éditeur

Tous les objets (avec ou sans collision) sont calés sur la grille de case à la pose et au glisser. Maintenir Maj place
au pixel (collisions ignorées, aperçu orange). L'interrupteur « Magnétisme » / « Snap to grid », à droite de l'en-tête du
panneau de choix d'objets, inverse la règle : désactivé, le placement est libre par défaut et Maj cale sur la grille.
L'état (`mapEditorSnapEnabledStore`) ne dure que la session d'édition et revient à activé à la fermeture de l'éditeur.
La décision est dans `Phaser/Game/MapEditor/EntityPlacementSnapping.ts`. Le pinceau de sols (clic droit maintenu) reste
toujours calé (index de case) ; seul Maj y ignore les collisions. `SelectionEditorTool` déplace déjà ses sélections par
cases entières : il n'est pas concerné.

## Redimensionner une image posée

Dans l'éditeur d'objets, cliquer sur une image importée déjà posée : quatre poignées blanches apparaissent
aux coins. Glisser une poignée montre un aperçu, puis relâcher enregistre la taille ; le coin opposé reste fixe.
Les proportions sont conservées par défaut ; décocher « Conserver les proportions » dans le panneau pour
étirer librement. Échap, perte de focus ou relâchement hors du canvas annulent le geste.
Le panneau « Taille de l'image » conserve aussi largeur et hauteur en pixels et le bouton « Appliquer la taille »
(coin supérieur gauche fixe). Les dimensions acceptées sont des entiers de 1 à 4096 pixels.
L'image doit rester dans la carte et respecter les droits d'édition et les nouvelles collisions.

Le moteur officiel ne sauvegarde pas une échelle par instance. Le front importe donc une nouvelle version PNG
de l'image, avec sa grille de collision et sa profondeur adaptées, puis remplace cet exemplaire par les commandes
natives. Son identifiant, son nom et ses propriétés sont conservés ; les autres exemplaires restent
à leur taille précédente. La version redimensionnée est aussi disponible dans le catalogue des images importées.
À l'ouverture de la carte, les catalogues sont revalidés auprès du serveur pour charger les nouveaux imports,
même si le navigateur possède encore une ancienne copie en cache.
Ctrl/Cmd+Z annule le remplacement en une étape ; le rétablissement le réapplique. L'image importée reste dans
le catalogue pour que le rétablissement et les copies restent possibles.

La sauvegarde de l'image est confirmée par le serveur avant le remplacement. Une erreur ou la fermeture du panneau
pendant la préparation laisse l'exemplaire d'origine en place. Le poids maximal des messages du serveur reste applicable.
Un agrandissement ne peut pas recréer les détails absents de l'image ; redimensionner plusieurs fois la même version
peut réduire sa qualité.

## Disponibilité de l'enregistrement

Le bouton d'enregistrement indique « Les enregistrements sont désactivés pour ce monde »
si la salle ne permet pas de démarrer un enregistrement et qu'aucun enregistrement n'est actif.
Ce message remplace aussi le titre « Démarrer l'enregistrement » ; la vidéo de démonstration
ne s'affiche que lorsqu'un démarrage est autorisé. Le message d'indisponibilité n'est pas répété
dans la description de l'infobulle.
Une raison fournie par l'Admin API reste affichée. Le message « Un enregistrement est en cours »
est réservé à un enregistrement confirmé ; les demandes en attente affichent
« Démarrer l'enregistrement… » ou « Arrêter l'enregistrement… ».
L'enregistrement natif nécessite LiveKit Egress et un stockage S3 ; le correctif de l'infobulle
n'active pas ces services.

## Outil « Carte » : sols et murs

Outil distinct des objets (barre latérale, raccourci `8`, `MapLayerEditorTool`). Il dessine la **couche carte** : sols et murs de la salle.
Gestes : mur (glisser une ligne droite), pièce (glisser un rectangle : murs + sol), sol (pinceau, rectangle, seau dans une zone fermée) et gomme
unifiée qui n'efface que sols et murs. Un geste = une entrée d'annulation ; l'aperçu montre en vert ce qui sera créé et en rouge ce qui sera supprimé.

Architecture (`Phaser/Game/MapEditor/MapLayer/`, sans Phaser, testée) :
- `MapLayerModel` : la **source de vérité sémantique** (cellules de sol avec leur famille, segments de mur sur les lignes de la grille avec leur teinte).
  Un futur générateur (tracé → pièces) n'a qu'à remplir ce modèle.
- `MapLayerAutotile` : dérive les prefabs à poser (sol uni, ou « ombre » sur la tuile qui suit un mur horizontal : l'image `ombre` du catalogue est assombrie sur ses premières lignes, la plus foncée contre le mur et estompée vers le bas ; façade fermée ou continue, raccord de chaque sommet) et
  calcule la différence minimale avec les entités déjà posées.
- `MapLayerOperations` : géométrie des gestes et lecture du modèle depuis les entités existantes.
- `MapLayerCatalog` : vocabulaire et identifiants de prefab (**contrat avec les catalogues privés**, jamais renommés).

Le stockage reste des entités WAM ordinaires : aucun champ ajouté au schéma, `map-storage`, `back` et `messages` inchangés. La signification passe par
l'identifiant de prefab (collections `Carte Sols` et `Carte Murs`, tag `Carte`). Les modèles sont relus depuis les entités à chaque geste, donc modifier
un mur recalcule ses raccords. Les anciennes entités `Sols` / `Murs` ne sont pas migrées et restent éditables avec l'outil Objets ; l'éditeur d'objets ne
propose plus les prefabs `Carte`. Les murs sont vus du sud : chaque mur a une surface supérieure (le « capuchon », 12 px) ; un mur horizontal occupe **entièrement la rangée de tuiles de sa ligne
de grille** (capuchon sur les 12 premiers px, face sud de 20 px dessous, pied à la limite de la tuile), pour que sols et murs s'alignent sur la grille ;
un mur vertical n'est qu'un trait. Les murs posés avec l'ancienne géométrie (capuchon centré sur la ligne) sont toujours lus et redessinés alignés à la
prochaine modification de la couche carte. Les capuchons forment un réseau unique : une pièce « raccord » de 12 × 12 px est posée sur chaque sommet
et dessine l'angle, le T, la croix ou le bout fermé selon les murs qui y arrivent. Les façades se suivent sans trait de séparation et se ferment (6 px de plus) quand le
mur s'arrête ; le sprite vertical est une pièce de 12 × 20 px entre deux raccords, par teinte ; un mur vertical qui finit seul (un seul bras au sommet du bas) reçoit sous son capuchon une face sud de 12 × 20 px (`bout-<teinte>`), comme un mur horizontal. Collisions : 6 px au pied de la façade, 6 px pour la bande verticale, décalée de la
hauteur du mur (20 px) car l'empreinte au sol est plus bas que le dessus. Profondeurs : un mur vertical passe devant les façades qu'il croise, les raccords devant les deux.
Les catalogues et leurs images (pack sous licence) sont dans le dépôt privé, voir `goyan-map-layer-prefabs/README.md`
de `workadventure-selfhost`. Disponible sur **toutes les salles**, anciennes comprises : la variable `MAP_LAYER_CATALOG_URLS` (URL séparées par des virgules, lue par le pusher et
transmise au front) ajoute les deux catalogues aux collections de chaque salle ; aucun WAM n'a à être modifié. L'outil ne lit et n'écrit que les entités de ces
collections : les sols et murs posés comme objets classiques ne sont jamais touchés. Sans la variable (ou si le catalogue est injoignable), l'outil l'indique et ne pose rien.
Limites connues : plafond de 4000 entités par geste, remplissage limité à 2500 cases, pas de contrôle de présence des joueurs, pas de fenêtres, pas de
raccords décoratifs au nord. **Comportement visuel non validé dans le jeu.**

Mises à jour de l'outil Carte :
- Aperçu des tracés : le point suit la **base** du mur, pas son sommet.
- Profondeur : les sols sont au niveau le plus bas visible, juste au-dessus des tuiles de fond (`MAP_LAYER_FLOOR_DEPTH`), sous les objets, les murs, les
  avatars et le compagnon, qui ne passent plus tantôt dessus tantôt dessous en traversant une rangée.
- Sélection : Déplacer, Coller, Supprimer et Remplir recalculent sprites et raccords des murs et sols touchés, dans la **même** entrée d'annulation
  (`MapLayerSync`).
- Chargement : chaque collection d'objets de la salle dispose de 10 secondes ; une collection qui ne répond pas ne bloque plus le chargement des
  entités, ni le message « Vérification des catalogues » de l'outil.
- Clics : avec l'outil Carte (comme avec l'outil Zones), un clic sur un objet ne le sélectionne plus ni ne bascule vers l'éditeur d'objets ; seuls sols et murs
  sont touchés (`EntitiesManager`).

Portes (mode « Porte » de l'outil Carte) :
- Une porte remplace **deux segments de mur consécutifs**, centrée sur le curseur, horizontale (vue du sud) ou verticale (vue de dessus). L'aperçu est vert si
  les deux segments sont des murs libres, rouge sinon (message « doorInvalid » au clic). Elle prend la teinte du mur.
- Stockage : deux entités WAM de la collection `Carte Portes` (`porte-h-<teinte>-g|d`, `porte-v-<teinte>-haut|bas`, image = porte fermée). Les murs sous la
  porte restent dans le modèle mais ne sont pas dessinés : gommer la porte rend le mur à l'identique (la gomme enlève la porte, le passage suivant le mur) ;
  gommer le mur retire la porte. Le catalogue est facultatif : sans lui, le bouton est grisé.
- Sol : le sol sous une porte horizontale est un sol ordinaire (pinceau, remplissage, gomme). À la pose, il reprend le sol de la pièce (sud d'abord) s'il n'y en a pas.
  Le remplissage traite la porte comme un mur : les deux côtés restent dissociés.
- Comportement : toujours fermée, elle s'ouvre quand un joueur (local ou distant) ou un compagnon est à moins de 24 px de la porte (`DoorAnimator`), se referme 0,5 s après. Calcul local,
  rien n'est envoyé. Elle ne bloque jamais (collisions du prefab vides) ; une porte verticale ferme pourtant le bas de son passage par une collision du prefab `bas` (l'avatar se tient plus bas que son sprite : sans elle il se placerait dans l'axe du mur, devant lui), et le pathfinder ne la traverse que par sa première rangée. Sons : un enregistrement CC0 de qubodup pour l'ouverture et un pour la fermeture (`play/public/resources/objects/doors/`, crédits dans `CREDITS.txt`), volume selon la distance (au plus 0,3 : les enregistrements sont forts).
- Animation : 8 frames par sens, `...-0` (ouverte) à `...-6` quand la porte s'ouvre vers le nord (horizontale) ou l'ouest (verticale), `...-b0` à `...-b6` vers le sud ou l'est ; la frame fermée est le prefab sans suffixe (40 ms par frame). La porte est **poussée** : le sens est choisi au début de l'ouverture selon le côté du personnage le plus proche (nord/sud pour une horizontale, ouest/est pour une verticale). Sans les frames, la porte reste fermée.
- Rendu : le bout d'un vantail de porte horizontale ouverte a la texture de la face du mur de la teinte (seul son dessus est blanc). Tous les dessus de portes (horizontales, verticales, fermées ou ouvertes) sont blancs avec un contour sombre, comme le dessus des murs. Une porte horizontale remplace tout le mur (chapeau compris) et dessine elle-même ses deux montants de 4 px (ouverture de 56 px) ; son vantail est un volume (22 de haut, 6 d'épaisseur) qui va de l'arête haute de la face du mur (le liseré sous le chapeau) au pied du mur : la porte fermée s'arrête sur cette arête et, au-dessus d'elle entre les montants, on voit le sol ; son dessus est un liseré blanc entre deux traits sombres, comme un petit chapeau posé sur cette arête, avec le sol visible derrière ; une fois la porte entrouverte, le dessus et le bout se voient en volume ; les panneaux sont en relief (arêtes éclairées en haut et à gauche, ombre en bas et à droite) ; les murs voisins vont jusqu'à elle, sans bout ni raccord. Ses frames ont 14 lignes de marge au-dessus et au-dessous (`DOOR_FRAME_MARGIN`) pour que le vantail oblique, en projection oblique comme le chapeau des murs, reste entier : l'animation aligne la ligne 14 sur le haut de la porte avec l'origine de l'entité. Une porte verticale fermée fait 10 px de large (le mur en fait 12, la porte est donc 2 px moins large, y compris son montant fixe), avec un contour sombre de 2 px, aussi épais que celui des murs ; elle a un montant de mur fixe sur son vantail du haut seulement (présent dans toutes les images, sous les vantaux : fermée, la porte le recouvre ; ouverte, il reste visible du côté opposé à son sens d'ouverture ; il garde la largeur du mur, 12 px, porte fermée comme ouverte ; il garde la largeur du mur, 12 px, porte fermée comme ouverte ; il est en brique sur toute sa hauteur, avec la texture du mur de la teinte, le blanc ne restant que sur le raccord du sommet) (ouverture de 48 px : un liseré de 2 px à chaque bout) a deux vantaux, un par tuile, dessinés entre les raccords des sommets (la charnière de chacun touche le liseré qui ferme le bout du mur, avec une petite plaque d'acier), et passe derrière les avatars (`depthOffset` −40). Les sprites reprennent les couleurs de la face du mur de leur teinte, et ont à chaque bout un montant identique à la fin du mur voisin.
- Ombre et coins : le sol devant une porte horizontale n'est jamais ombré (le passage est ouvert) ; le sol sous les murs voisins l'est toujours. Une porte verticale qui part sous un coin ou un T est dessinée par-dessus la face sud du mur horizontal du dessus (`DoorAnimator`, profondeur juste au-dessus de la façade) : on voit alors son montant de mur continuer le mur jusqu'à la porte, au lieu d'une porte qui flotte sous la face. **Non validé dans le jeu.**
- Sprites à ajouter au dépôt privé : voir la maquette « Sprites de porte WorkAdventure » (horizontal 32 × 32 par panneau, vertical 64 × 32 par pièce, vertical
  haut qui commence sous le raccord du premier sommet, 8 frames, 4 teintes, depthOffset de `bas` à régler sous le raccord du sommet suivant). **Gomme : au survol, la porte (ou le mur, ou le sol) que la gomme enlèverait est surlignée en rouge ; gommer une porte la retire sans toucher aux sols autour d'elle (murs et sols restent). Les portes déjà posées avec une ancienne version de l'outil (bouts de mur et raccords à côté d'une porte) se redessinent à la prochaine modification de la couche carte.** **Non validé dans le jeu.**
