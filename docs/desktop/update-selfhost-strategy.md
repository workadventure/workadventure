# Mises à jour desktop et instances self-hosted

Proposition de travail — 26 octobre 2026. Les choix de politique restent à valider ; ce document ne modifie pas l'updater.

## Constat dans le code actuel

L'application Electron ne contient pas le frontend WA : chaque onglet charge le serveur choisi. Les composants Svelte du compagnon et des annotations proviennent donc de ce serveur. Une mise à jour du desktop ne met pas à jour un serveur self-hosted.

`desktop/electron/src/auto-updater.ts` consulte les releases GitHub par défaut. Une organisation peut déjà configurer un autre flux avec `WA_DESKTOP_UPDATE_URL` (`desktop-url-policy.js`). Le flux est celui de l'installation desktop, pas celui d'un onglet.

Hors Linux non-AppImage, `autoDownload` et `autoInstallOnAppQuit` conservent les valeurs par défaut `true` d'electron-updater. « Installer plus tard » reporte le redémarrage immédiat, mais ne désactive pas l'installation en quittant. Il faut expliciter ce comportement ou fournir un véritable mode géré.

Le handshake `hello({ contract: 2 })` est mémorisé par page et remis à zéro à la navigation. Une ancienne page sans handshake garde les fonctions historiques ; le shell ne lui demande pas de rendre un compagnon ou une barre de réunion qu'elle ne possède pas. Les méthodes ajoutées au bridge sont optionnelles côté WA.

## Direction proposée

Maintenir un desktop commun compatible avec plusieurs générations de serveurs. Séparer :

- Version du binaire : Electron, intégration système et correctifs de sécurité.
- Contrat desktop↔WA : interfaces stables, indépendantes de la cadence des releases.
- Version du serveur : fonctionnalités métier et composants disponibles pour cette instance.

Ne pas créer une version desktop par version serveur. Cela multiplierait les binaires à maintenir et pourrait empêcher les correctifs Electron d'atteindre les utilisateurs des anciens serveurs.

Les capacités sont déterminées par page : ancien serveur = fonctions disponibles pour cet ancien serveur ; serveur récent = fonctionnalités supplémentaires s'il trouve les méthodes natives nécessaires. La présence de Svelte dans un ancien serveur ne doit pas être supposée. L'absence d'une fonction optionnelle ne doit pas empêcher l'entrée dans le monde ou le chat principal.

## Deux politiques pour une même application

| Mode proposé | Politique |
| --- | --- |
| Standard | Flux stable commun. Téléchargement et installation clairement annoncés. Les mises à jour desktop restent compatibles avec les contrats serveur pris en charge. |
| Géré par l'organisation | Flux approuvé ou distribution via les outils de l'organisation. Aucun téléchargement/installation automatique sans la politique correspondante. Le bouton « plus tard » ne doit pas contourner cette politique. |

Une page WA ne peut pas choisir un flux de téléchargement arbitraire ni forcer l'installation ou le downgrade du desktop. La configuration du flux doit rester sous le contrôle de l'installation et de son administrateur. La vérification des signatures des releases reste indispensable.

Le cas SaaS + ancien self-hosted dans deux onglets doit fonctionner dans un seul processus. On ne peut pas faire dépendre le binaire de la version du dernier onglet visité.

## Contrat minimal

Conserver les membres publiés et leurs formes ; ajouter une méthode optionnelle lorsqu'un besoin natif apparaît. Ne pas augmenter le numéro de contrat à chaque release du produit.

Le handshake existant suffit au socle actuel. Si une capacité réciproque doit être négociée à l'avenir, ajouter une liste bornée de capacités au même échange plutôt qu'une API métier ou des tests de numéros de release SaaS. Une page n'utilise une fonction que si les deux côtés la comprennent.

L'acceptation actuelle de tout `contract >= 2` suppose la compatibilité additive des contrats futurs. Une rupture devra être traitée explicitement ; ce test ne prouve pas qu'un contrat inconnu est compris.

## Validation et support

La CI doit couvrir :

1. Desktop récent + ancienne page sans handshake : fonctions historiques utilisables.
2. Desktop récent + page contrat 2 : compagnon et barre lorsque présents.
3. Page récente + ancien desktop : méthodes optionnelles absentes, dégradation fonctionnelle sans crash.
4. SaaS et serveur ancien ouverts simultanément ; navigation entre origines.
5. Mode géré : pas d'installation à la fermeture, pas de substitution du flux par une page.
6. Arrêt du support d'un contrat : message clair, accès alternatif à l'instance et politique documentée, sans mise à jour implicite de son serveur.

Les tests actuels figent la surface historique du preload et vérifient le handshake par page. Ils ne remplacent pas les tests d'intégration avec une vraie ancienne release WA.

Décisions restantes : durée de support des contrats, gouvernance du mode géré et éventuel canal LTS. Un canal LTS crée une obligation de maintenance ; il ne devrait pas être promis avant de définir les correctifs et plateformes couverts.

## Configuration de la recommandation dans WA

Implémentation sur `feat/desktop-companion-chat-annotations` : rubrique **Paramètres → Application desktop**, visible également dans le navigateur. Elle montre la version installée (desktop uniquement), la recommandation de l'instance, son minimum éventuel et son lien de téléchargement approuvé.

L'administrateur du déploiement configure les variables suivantes, transmises au service `play` par les fichiers Compose de développement et de production :

```dotenv
DESKTOP_APP_RECOMMENDED_VERSION=1.3.0
DESKTOP_APP_MINIMUM_VERSION=1.2.0
DESKTOP_APP_DOWNLOAD_URL=https://downloads.example.org/desktop
```

Ces valeurs sont un exemple. Elles doivent correspondre à une release effectivement validée par l'organisation. Les versions sont des numéros stables exacts `X.Y.Z`, sans plage ni mot-clé `latest`. Le minimum est facultatif. La recommandation ne peut pas être inférieure au minimum. Le lien HTTPS est obligatoire dès qu'une version est configurée ; il peut pointer vers une page présentant les téléchargements par système d'exploitation. Une URL avec identifiants intégrés est refusée.

Les valeurs se règlent ici dans la configuration du déploiement ; aucun formulaire d'édition dans la console d'administration SaaS n'a été ajouté. Un redémarrage de `play` puis un rechargement de la page rendent la nouvelle configuration visible. Les onglets d'autres instances gardent leur propre configuration.

Un desktop sous le minimum reçoit un avertissement non bloquant au démarrage et dans les paramètres. Une version différente de la recommandation est signalée sans être automatiquement déclarée incompatible : elle peut être plus récente. Les versions de développement ou illisibles ne sont pas classées arbitrairement comme obsolètes. Le panneau reste utilisable si la lecture de version échoue.

Aucune méthode native n'est ajoutée : la page réutilise `WAD.getVersion()`. Le handshake reste séparé de la comparaison des versions produit. Le lien du message historique pour un ancien desktop respecte désormais la configuration de l'instance.

Sans configuration, le panneau n'invente pas de recommandation et propose la page officielle de téléchargement. Avec une version configurée, il ne substitue jamais la dernière release publique au lien approuvé. Cette configuration n'affecte ni le flux d'auto-update Electron ni l'installation à la fermeture ; le mode géré décrit plus haut reste un travail distinct.

Validation de cette étape : 49 tests ciblés réussis (comparaison, validation du déploiement, projection existante de configuration et panneau Svelte), contrôle i18n complet et `svelte-check` sans erreur ni avertissement. Les tests du panneau utilisent un DOM simulé ; ils ne constituent pas une validation de l'auto-updater ou d'anciennes releases WA réelles.
