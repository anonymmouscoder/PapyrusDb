# 🗒️ PapyrusDb – Vos notes, vos choix, votre souveraineté

Bienvenue dans l’univers de **Papyrus**, une application de prise de notes pensée pour redonner à chacun le **contrôle total** de ses données.
Pas de création de compte, pas de synchronisation forcée, et surtout : **pas de Cloud opaque**.

---

## 🌐 Trois modes de stockage. Une seule philosophie : la liberté

Papyrus propose trois modes de fonctionnement selon vos préférences et votre niveau de confiance :

---

### 1. 📦 Mode local uniquement – sans Cloud, sans réseau

Dans ce mode, **tout est stocké localement sur votre appareil** (téléphone, tablette, etc.).
Aucune connexion Internet n’est utilisée, aucune synchronisation n’est active.

C’est le mode par défaut.
Idéal pour ceux qui veulent juste écrire, sans dépendre d’un réseau, sans laisser aucune trace ailleurs.

---

### 2. 🔄 Synchronisation sécurisée via Papyrus (optionnelle)

Vous pouvez choisir d’activer la synchronisation entre plusieurs de vos appareils.
Dans ce cas, **Papyrus héberge une instance privée pour vous**, de façon temporaire, sécurisée et isolée.

Dès que vous cliquez sur “Générer” dans l’application, un **identifiant unique est créé localement sur votre appareil**. Lors de la première connexion, cet identifiant permet de créer **votre propre espace privé** sur notre serveur.

**Ce que ça signifie concrètement :**

* Aucune donnée n’est stockée de façon permanente sur nos serveurs.
* Votre espace est protégé par une `serverKey` unique et aléatoire, connue uniquement de vous.
* Vous pouvez connecter un deuxième appareil avec cette même clé, et tout se synchronisera automatiquement.
* Il n’existe aucune base centralisée. Chaque utilisateur a sa propre bulle de données.

**Le serveur est maintenu gratuitement par l’équipe Papyrus**.
Si vous voulez soutenir ce service, un lien de don est disponible dans l’application.

---

### 3. 🧠 Auto-hébergement – 100% indépendant

Pour ceux qui veulent **tout contrôler**, il est possible d’héberger votre propre serveur PapyrusDb.
Ce dépôt contient **uniquement la partie serveur**, totalement open-source.

Avec votre propre `serverKey` et l’URL de votre serveur, vous pouvez :

* Synchroniser vos appareils sans passer par Papyrus
* Automatiser des ajouts de notes depuis des scripts ou des bots
* Gérer votre propre hébergement local ou cloud

L’application Papyrus vous permet de spécifier l’URL du serveur et la `serverKey` manuellement.

> Exemple : vous codez un bot Node.js qui ajoute des notes en temps réel à votre serveur, et hop, elles apparaissent dans l’app mobile.

---

## 🔐 À propos de la `serverKey`

La `serverKey` agit comme un mot de passe qui donne accès à votre espace de synchronisation.

* Elle est générée automatiquement dans l’app si vous activez la synchro.
* Elle peut être utilisée pour connecter plusieurs appareils entre eux.
* Elle n’est jamais stockée par Papyrus : vous seul(e) la possédez.
* Si vous changez d’appareil, il suffit d’entrer cette clé pour restaurer l’accès à vos notes.

---

## 🚨 À savoir : Papyrus est une application propriétaire

PapyrusDb (ce dépôt) représente uniquement le **backend de synchronisation**, conçu pour permettre l’auto-hébergement.

L’application Papyrus (frontend, interface mobile, etc.) est propriétaire et non incluse ici.
Ce backend respecte les mêmes principes que celui utilisé par l’application officielle : **chiffrement, isolation, et confidentialité**.

Merci de **ne pas modifier les parties sensibles** de ce serveur (par exemple `server.js` ou le middleware d’authentification) si vous n’êtes pas sûr(e) de ce que vous faites.
Cela pourrait rendre votre serveur incompatible avec les versions futures de l’app Papyrus.

---

## 🧰 Installation rapide

```bash
git clone https://github.com/anonymmouscoder/PapyrusDb.git
cd PapyrusDb
npm install
npm run build
npm start
```

Une configuration guidée vous aidera à générer votre `config.js` avec votre `serverKey`.

---

## ❤️ Papyrus, pour qui ?

* Pour ceux qui veulent des notes **privées par défaut**
* Pour les développeurs qui veulent connecter leur propre logique métier
* Pour les passionnés d’auto-hébergement et de souveraineté numérique
* Pour ceux qui refusent le modèle cloud imposé

---

## ❓ FAQ – Questions fréquentes

### 🤔 Pourquoi l’application Papyrus est-elle propriétaire ?

Par préférence, **elle ne le serait pas**.
Mais pour le moment, nous avons fait le choix de garder l’app fermée afin de :

* **Préserver l’intégrité et la sécurité du chiffrement côté client** ;
* **Éviter les versions modifiées instables** qui pourraient compromettre les données ou la compatibilité avec notre backend.

Cela dit, nous **n’excluons pas** de proposer à l’avenir une version open-source ou au moins **partiellement ouverte**, si cela peut se faire **sans mettre en danger la sécurité des utilisateurs**.

En attendant, **vous êtes libre d’héberger vous-même votre serveur**, ce qui vous permet de garder le contrôle sur vos données.

---

### 🔐 Que puis-je faire avec ce backend auto-hébergé ?

Beaucoup de choses.
Ce backend est 100 % open-source, et il respecte **les mêmes règles que notre serveur officiel** :

* Stockage par `userId` et `serverKey`, donc compatible avec l’app.
* Synchronisation automatique entre appareils utilisant la même clé.
* Aucune dépendance à un service tiers ou à notre infrastructure.

Ce que ça veut dire pour vous :

* Vous pouvez **héberger votre propre serveur privé**, et y connecter l’application Papyrus (via les réglages serveurs).
* Vous pouvez créer **vos propres clients** (scripts, bots, raccourcis mobiles…) pour **écrire, lire, supprimer** des notes via l’API.
* Vous pouvez connecter ce backend à **d’autres systèmes ou outils** : par exemple, un assistant vocal, un dashboard personnel, une interface web maison, ou un microservice de notification.

Vous êtes **libre de bâtir autour**, sans contrainte.

---

### 🛑 Pourquoi une note supprimée dans l’application reste visible dans la base ?

Parce que Papyrus fonctionne avec un **système de sessions synchronisées entre appareils**.
Quand vous supprimez une note, l’app :

* Marque la note comme `isDeleted: true`
* Ajoute un champ `deleteSession` pour indiquer **quel appareil a demandé la suppression**

Mais **la note reste stockée sur le serveur**, en attente que **tous les autres appareils** synchronisent cette suppression.

Ce n’est que **lorsque tous vos appareils ont reconnu cette suppression** que le serveur **efface définitivement** la note.
Cela évite que des suppressions soient perdues si un appareil est hors-ligne ou pas encore synchronisé.

---

### 🕵️ Pourquoi je vois mes notes en clair sur mon serveur auto-hébergé ?

Parce que vous êtes **le propriétaire du serveur**.

Le backend reçoit exactement ce que l’application lui envoie.
Si vous utilisez l’application officielle : **les données sont chiffrées** localement, donc même vous, vous verrez du texte illisible.

Mais si vous :

* Envoyez des requêtes manuelles via Postman ou cURL
* Créez votre propre client ou interface

…alors vous pouvez transmettre des notes **en clair**, donc logiquement vous les voyez telles quelles dans la base.

---

### 🌐 Puis-je connecter Papyrus à d'autres services ou applications ?

Oui.
C’est l’un des **grands intérêts** de l’auto-hébergement.

Vous pouvez :

* Automatiser des envois de notes depuis un **bot Telegram**, un **assistant vocal**, ou même un script bash.
* Créer un **client web minimaliste** pour gérer vos notes sans passer par l’app.
* Intégrer vos notes Papyrus dans un **workflow plus large** (comme une to-do app perso ou une base de données Notion).

Tant que votre client respecte la structure d’une note (voir ligne 137 - server.js), **tout est compatible**.

---

## 📜 Licence

PapyrusDb est distribué sous licence **MIT**.
Vous pouvez forker, modifier, héberger, adapter selon vos besoins.

---

## 🙏 Merci

Papyrus existe pour une seule raison : **la vie privée ne devrait pas être un luxe**.
Utilisez-le librement, hébergez-le, et si vous le souhaitez, soutenez notre initiative.

**Notez, partagez, construisez. Vous êtes chez vous.**
