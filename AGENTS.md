# Kamatelier — contexte durable du projet

Ce fichier est la référence de contexte pour les assistants qui travaillent dans ce dépôt. Le lire avant de proposer ou d'implémenter une modification. Vérifier malgré tout le code actuel : ce document décrit l'état connu du projet, mais le code demeure la source de vérité.

Après une modification importante du produit, mettre ce fichier à jour dans le même changement, particulièrement les sections « Fonctionnalités actuelles », « Règles métier confirmées » et « Améliorations envisagées ».

## Identité et objectif

- Nom public : **Kamatelier**, avec un **K** (kamas + atelier). Ne jamais écrire « Camatelier ».
- Domaine de production : `https://www.kamatelier.com`.
- Produit : application web francophone de suivi de rentabilité pour les joueurs de DOFUS.
- Proposition de valeur : enregistrer des crafts et des achats-reventes, suivre les objets en vente, puis calculer les revenus, coûts et profits réellement réalisés.
- Le produit ne donne pas automatiquement les prix du marché. L'utilisateur consigne ses propres opérations et prix afin d'obtenir un historique personnel fiable.
- L'enregistrement dans le temps est au cœur du produit; c'est pourquoi un compte est requis pour utiliser les fonctions privées.
- Public et ton : joueurs de DOFUS francophones, avec un français naturel et accessible. L'interface emploie actuellement le tutoiement.
- Le site est déjà en ligne et utilisé par son créateur. Il doit être considéré comme un produit réel contenant potentiellement des données utilisateur, pas comme une maquette jetable.

## Positionnement vis-à-vis d'Ankama

Kamatelier est un outil communautaire indépendant. Il ne se connecte pas au compte Ankama, ne joue pas à la place de l'utilisateur et n'automatise aucune action en jeu.

La mention suivante est **déjà affichée dans le pied de page** (`src/components/site-footer.tsx`) et ne doit pas être proposée comme fonctionnalité manquante :

> Kamatelier est un outil indépendant et non officiel. DOFUS est une marque d'Ankama. Certaines illustrations et appellations sont la propriété d'Ankama. Ce site n'est ni affilié à Ankama, ni approuvé par celle-ci.

Avant de recommander une nouvelle mention légale ou une fonctionnalité supposément absente, vérifier le dépôt.

## Pile technique et architecture

- Next.js 16 avec App Router, React 19 et TypeScript.
- Tailwind CSS 4 et styles globaux dans `src/app/globals.css`.
- Supabase pour l'authentification et PostgreSQL.
- `@supabase/ssr` pour les clients serveur/navigateur et la gestion de session.
- Row Level Security : chaque utilisateur ne peut accéder qu'à ses propres items, acquisitions et ventes.
- Dofusdude (`api.dofusdu.de`) fournit la recherche d'équipements, leur nom, type, niveau et image. La recherche est réservée aux utilisateurs authentifiés.
- Vercel Analytics est chargé dans le layout racine.
- Polices principales : Barlow Condensed et Inter.
- Esthétique actuelle : interface sombre, cartes arrondies, accents vert lime et orange.

Fichiers structurants :

- `src/app/page.tsx` : page d'accueil publique.
- `src/app/dashboard/page.tsx` : ventes en cours et résumé du capital actif.
- `src/features/items/components/acquisition-workspace.tsx` : interface principale d'acquisitions et de ventes.
- `src/app/statistics/page.tsx` : agrégation serveur des statistiques.
- `src/features/items/statistics/statistics-dashboard.tsx` : affichage des statistiques.
- `src/app/sales-history/page.tsx` et `src/features/items/sales/sale-history-table.tsx` : historique.
- `src/features/items/actions/` : mutations serveur.
- `src/features/items/acquisitions/calculations.ts` : calculs financiers partagés.
- `supabase/migrations/` : schéma et règles de données.
- `src/types/database.types.ts` : types générés de la base.

## Modèle de données

### `professions`

Métiers actuellement initialisés : Bijoutier, Cordonnier, Tailleur, Forgeron, Sculpteur, Façonneur et Bricoleur.

### `items`

- Un item appartient à un utilisateur.
- Il peut provenir de Dofusdude ou être manuel selon le schéma, même si le parcours principal actuel utilise la recherche Dofusdude.
- Les items Dofusdude sont dédupliqués par identifiant externe et utilisateur.

### `acquisition_lots`

Un lot représente un ou plusieurs exemplaires d'un équipement acquis ensemble :

- type `craft` ou `purchase`;
- métier;
- indicateur de forgemagie;
- quantité acquise;
- coût d'acquisition unitaire;
- prix de mise en vente initial;
- prix affiché actuel;
- date de mise en vente;
- notes prévues par le schéma.

### `sales`

Une vente appartient à un lot et contient :

- quantité vendue;
- prix de vente unitaire réel;
- instantané du prix affiché au moment de la vente;
- date de vente.

Une vente ne peut pas dépasser la quantité restante. La suppression complète d'un lot supprime ses ventes en cascade.

## Règles métier confirmées

- La taxe HDV est estimée à **2 % du prix initial de mise en vente**, et non du prix de vente final.
- La taxe est calculée et non stockée comme valeur indépendante.
- `profit potentiel = prix affiché actuel - coût d'acquisition - taxe basée sur le prix initial`, multiplié par la quantité restante.
- `profit réalisé = prix de vente réel - coût d'acquisition - taxe basée sur le prix initial`, par unité vendue.
- Le pourcentage de profit utilise le coût d'acquisition comme dénominateur. Si ce coût est zéro, le taux est absent plutôt qu'infini.
- Après la première vente d'un lot, ses données d'acquisition originales sont verrouillées; seul le prix affiché actuel des unités restantes peut changer.
- Avant la première vente, une acquisition peut être corrigée.
- Un lot peut être vendu en une fois, partiellement, ou en groupes ayant des prix unitaires différents.
- Le prix affiché actuel peut être modifié sans changer le prix initial utilisé pour la taxe.
- Toutes les données privées sont filtrées par `user_id` et protégées par RLS.

## Fonctionnalités actuelles

### Page d'accueil publique

- Présentation visuelle de Kamatelier.
- Boutons de connexion et de création de compte.
- Aperçu graphique fictif du produit.
- Pied de page avec la mention indépendante/non officielle.
- Métadonnées, favicon, `robots.txt` et `sitemap.xml` présents.
- Les pages privées et d'authentification sont exclues de l'indexation.

### Authentification

- Création de compte par courriel et mot de passe.
- Confirmation par courriel selon la configuration Supabase.
- Connexion et déconnexion.
- Mot de passe d'au moins huit caractères.
- Demande de réinitialisation et choix d'un nouveau mot de passe.
- Les pages privées redirigent vers la connexion sans session valide.

### Tableau de bord

- Cartes : quantité d'objets en vente, kamas immobilisés et profit potentiel.
- Liste des lots possédant encore au moins une unité invendue.
- Recherche textuelle dans les ventes en cours.
- Tri par statut, date ou équipement.
- Ajout d'une acquisition à partir de la recherche Dofusdude.
- Choix craft/achat, métier, forgemagé ou non, quantité, coût unitaire, prix de vente et date.
- Modification d'une acquisition avant sa première vente.
- Modification du prix affiché d'un lot en cours.
- Enregistrement d'une vente totale ou partielle.
- Enregistrement simultané de groupes vendus à des prix différents.
- Suppression d'un lot avec confirmations adaptées à son historique.

### Historique des ventes

- Liste des ventes réalisées.
- Recherche par équipement.
- Tri par date, équipement et autres colonnes prises en charge par le composant.
- Affichage des coûts, prix et résultats par vente.
- Possibilité de supprimer le lot source et tout son historique.

### Statistiques

- Résumé global : objets vendus, kamas investis, revenus et profit réel.
- Performance par métier avec quantité, investissement, revenus, profit et taux de profit.
- Graphique comparatif du profit par métier.
- Top 10 des équipements regroupés par item.
- Statistiques du Top 10 : quantité vendue, revenus, profit, taux de profit, profit unitaire moyen, délai moyen et profit quotidien moyen.

### Comportement exact du Top 10 actuel

Cette section est importante : ne pas décrire le comportement souhaité comme s'il existait déjà.

- Il ne considère actuellement que les **ventes réalisées**.
- Il est trié par **profit total réalisé**, décroissant, puis limité à dix items.
- `délai moyen = somme(durée de vente × quantité vendue) / quantité vendue`.
- `profit quotidien moyen = profit unitaire moyen / max(délai moyen, 1 jour)`.
- Les exemplaires toujours en vente ne réduisent pas actuellement le profit quotidien.
- Conséquence connue : un premier exemplaire vendu rapidement peut maintenir artificiellement un équipement dans le classement même si un autre exemplaire identique reste invendu longtemps.

## Référencement et acquisition d'utilisateurs

État connu :

- Google a indexé le site et affiche son favicon, selon l'observation du propriétaire.
- Le nom exact est « Kamatelier ».
- La description actuelle dans le layout est : « Suivez la rentabilité de vos crafts, achats et ventes. »
- Le texte visible de l'accueil dit notamment : « Un espace clair pour suivre vos crafts, vos achats-reventes et ce qu'ils vous rapportent réellement. »
- Les pages applicatives exigent un compte; un visiteur ne peut donc pas tester les fonctions avec ses propres données sans inscription.

Orientation convenue, pas encore nécessairement implémentée :

- Titre cible possible : « Kamatelier — Calculateur de rentabilité pour DOFUS ».
- Description cible possible : « Kamatelier est un calculateur de rentabilité pour DOFUS. Suivez vos crafts, achats-reventes, dépenses et bénéfices réels en kamas. »
- Le contenu visible de l'accueil doit aussi expliquer explicitement DOFUS, les crafts, l'achat-revente et les bénéfices; une balise SEO seule ne suffit pas.
- Conserver le compte pour l'utilisation réelle est cohérent avec le produit.
- Réduire la friction avant inscription avec des captures, une courte démonstration, une explication du fonctionnement ou éventuellement un compte fictif en lecture seule.
- Expliquer près de l'inscription que le compte sert à conserver l'historique et qu'aucune connexion au compte Ankama n'est requise.
- Ajouter un moyen de contact interne au site afin de ne pas dépendre uniquement des réponses sur Reddit ou le forum.
- Lancement communautaire envisagé : publication honnête sur le forum officiel DOFUS et sur Reddit, avec captures, explication claire et demande de retours. Éviter le spam et préciser que l'outil est gratuit et non officiel.

## Améliorations envisagées — ne pas considérer comme livrées

Cette liste conserve les décisions et idées discutées. Avant toute implémentation, vérifier si le code a évolué et préciser les détails encore ambigus avec le propriétaire lorsque l'enjeu est important.

### Priorité de préparation au lancement public

- Améliorer le titre, la description et le contenu SEO public.
- Montrer suffisamment le produit avant l'inscription (captures, démonstration ou aperçu lisible).
- Expliquer pourquoi un compte est nécessaire et rassurer sur l'absence de connexion Ankama.
- Ajouter une méthode de contact ou de rétroaction sur Kamatelier.
- Préparer les publications du forum DOFUS et de Reddit.

### Ergonomie mobile des tableaux

- Revoir les tableaux qui nécessitent actuellement un défilement horizontal sur mobile.
- Le nom et l'image de l'équipement peuvent se retrouver loin du menu d'actions situé à droite; après le défilement, l'utilisateur peut perdre le contexte de la ligne qu'il voulait modifier.
- Concevoir une présentation mobile qui garde l'identité de l'item et ses actions associées faciles à relier, notamment pour modifier un prix ou ouvrir le menu à trois points.
- Évaluer selon chaque écran une première colonne fixe, des actions fixes, une présentation en cartes ou une vue mobile dédiée, sans nuire à la lisibilité des données.
- Vérifier en particulier les ventes en cours, l'historique des ventes et les futurs tableaux analytiques sur des écrans étroits.

### Refonte des statistiques d'équipement

Objectif du Top 10 : répondre à « Quels équipements semblent actuellement les plus pertinents à refaire? », et non seulement « Quels équipements ont produit le plus de profit historique? ».

- Clarifier explicitement le critère de classement dans le titre ou le sous-titre.
- Le propriétaire considère le **profit quotidien** plus pertinent que le profit total comme base du classement.
- Le nouveau calcul doit tenir compte des exemplaires encore invendus et du capital immobilisé. Tant qu'un exemplaire ne se vend pas, son ancienneté doit progressivement dégrader la pertinence de l'item.
- La formule définitive du « profit quotidien ajusté » reste à valider avant implémentation. Une direction discutée est : profits réalisés divisés par le temps total d'immobilisation des exemplaires vendus et invendus.
- Faire attention aux lots multiples, ventes partielles, annonces simultanées et quantités : la durée d'exposition doit être pondérée par unité pour éviter des résultats trompeurs.
- Le Top 10 doit rester un classement prescriptif et lisible, distinct d'un explorateur de données.

### Tableau analytique de tous les équipements

Ajouter un tableau distinct regroupant tous les items présents dans l'historique, sans limite de dix :

- une ligne agrégée par item, même s'il existe plusieurs lots et plusieurs ventes;
- filtre par métier;
- recherche par nom;
- colonnes triables;
- filtres possibles : tous, en vente, vendus;
- pagination si nécessaire.

Colonnes candidates :

- équipement et métier;
- quantité acquise/fabriquée;
- quantité vendue;
- quantité encore en vente;
- profit total;
- profit moyen par unité vendue;
- prix de vente moyen;
- délai moyen de vente;
- ancienneté de l'annonce active la plus vieille;
- profit quotidien ajusté;
- taux de rendement.

Le propriétaire veut pouvoir trier librement par profit quotidien, profit total, profit moyen, vente moyenne, quantité vendue et autres mesures utiles. Ce tableau ne doit pas être présenté comme un « Top 10 ».

## Principes de travail dans ce dépôt

- Commencer par inspecter le code et les migrations concernés; ne pas supposer qu'une idée discutée auparavant est absente ou présente.
- Préserver les données existantes et prévoir les migrations Supabase de façon compatible avec la production.
- Ne jamais exposer `.env.local`, les clés Supabase ou d'autres secrets.
- Ne pas contourner RLS et toujours filtrer les données privées par utilisateur.
- Centraliser les formules financières réutilisables dans `src/features/items/acquisitions/calculations.ts` ou un module métier dédié, puis les tester conceptuellement contre les règles ci-dessus.
- Quand une statistique influence une décision financière, afficher clairement sa définition et ses limites.
- Conserver la distinction entre profit potentiel (annonces actives) et profit réalisé (ventes terminées).
- Ne pas appeler une valeur « réelle » si elle inclut encore un prix potentiel ou estimé.
- Respecter le design actuel et vérifier les états mobile, vide, chargement, erreur et données volumineuses.
- Après modification : exécuter au minimum `npm run lint` et `npm run build` lorsque l'environnement le permet.
- Si une modification change le schéma, mettre à jour les migrations et régénérer `src/types/database.types.ts`.
- Mettre ce fichier à jour si une fonctionnalité planifiée est livrée, abandonnée ou redéfinie.

## Limites de connaissance

Un assistant dans une nouvelle conversation n'a pas automatiquement accès au texte complet des autres conversations du projet. Ce fichier sert précisément de mémoire partagée. Il ne contient volontairement aucun secret, aucune donnée personnelle d'utilisateur et aucun détail de compte de production.
