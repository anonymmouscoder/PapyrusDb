# 🗒️ PapyrusDb – Vos Notes, Votre Serveur, Vos Règles

PapyrusDb est le backend open-source officiel de l'application de prise de notes Papyrus. Il vous permet d'auto-héberger votre propre serveur de synchronisation pour une souveraineté totale sur vos données.

---

## 🚨 Avertissement : Ne modifiez pas la logique centrale

Ce backend est conçu pour être un point de synchronisation stable et fiable pour le client propriétaire Papyrus. L'interaction entre le client et le serveur est stricte.

**Toute modification** des fichiers principaux (en particulier `server.js`) — y compris ses routes, ses structures de données ou sa logique d'authentification — **brisera la compatibilité** avec l'application cliente. Cela peut entraîner une perte de données irréversible ou une défaillance de la synchronisation.

Ce code est fourni à des fins d'auto-hébergement, et non pour être modifié ou pour faire de la rétro-ingénierie. Vous êtes prévenu.

---

## 🚀 Installation Rapide

```bash
git clone https://github.com/anonymmouscoder/PapyrusDb.git
cd PapyrusDb
npm install
npm run build
npm start
```

Une configuration guidée vous aidera à générer votre fichier `config.js` avec une `serverKey` unique.

---

## Notre Modèle : Un backend ouvert, Un client maîtrisé

Papyrus fonctionne sur un modèle hybride :

*   **Application Papyrus (Frontend) :** Une application propriétaire et fermée, qui garantit une expérience utilisateur soignée et un chiffrement côté client robuste.
*   **PapyrusDb (Backend) :** Ce dépôt. Un serveur entièrement open-source que vous pouvez héberger pour être votre point de synchronisation personnel.

**Pourquoi l'application est-elle propriétaire ?**

Nous pensons que rendre une interface utilisateur (UI) grand public open-source serait une erreur à ce stade. Cela pourrait introduire des risques de fragmentation (avec des versions modifiées et instables) et de sécurité qui compromettraient l'expérience et les données des utilisateurs. Notre priorité absolue est la stabilité et la sécurité de l'écosystème.

Souvenez-vous que notre application cliente a été conçue dans le respect total de votre vie privée : elle ne contient **aucun tracker, aucune publicité et ne collecte aucune donnée personnelle**.

Ce modèle hybride offre le meilleur des deux mondes : une application cliente de haute qualité et digne de confiance, et un contrôle total sur vos données grâce à ce backend ouvert.
