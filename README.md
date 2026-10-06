# WhatsApp Heure Locale

Extension Chrome pour **WhatsApp Web** qui affiche l'heure réelle de vos contacts vivant dans un autre fuseau horaire,
y compris pour chaque membre d'un groupe.

*Chrome extension for WhatsApp Web showing the real local time of contacts (and group members) in other time zones.*

## Ce qu'elle affiche

- **Dans l'en-tête de la discussion** : une horloge dans le style des icônes WhatsApp, avec l'heure actuelle de la
  personne, par exemple `🕒 Alex 15:22`, ou pour un contact `🕒 15:22 · Makassar (+6 h)`.
- **Sur chaque message**, entre parenthèses après l'heure WhatsApp, dans la même typo : l'heure qu'il était pour la
  personne au moment du message, par exemple `17:48 (23:48)` ou `23:30 (05:30 +1 j)`.
  Fonctionne sur les messages texte, les photos et les vidéos. Le survol donne le détail (fuseau, décalage).
- Les personnes dans le même fuseau que vous ne sont pas annotées.

## Installation

1. Télécharger **`whatsapp-heure-locale.zip`** depuis la [dernière release](../../releases/latest) et le dézipper.
2. Ouvrir `chrome://extensions` et activer le **Mode développeur** (en haut à droite).
3. Cliquer sur **Charger l'extension non empaquetée** et choisir le dossier dézippé.
4. Ouvrir ou recharger [web.whatsapp.com](https://web.whatsapp.com).

Compatible avec Chrome, Edge, Brave, Arc et les autres navigateurs Chromium.

## Choisir le fuseau de quelqu'un

Exemple : Alex vit à Bali et écrit dans votre groupe « Famille ».

1. Ouvrir la discussion, cliquer sur l'horloge 🕒 dans l'en-tête.
2. Sous « Alex », taper `Bali` et choisir **Bali (Asia/Makassar)**.

Le réglage est mémorisé par nom et synchronisé avec votre compte Chrome : il vaut dans tous les groupes et dans la
discussion privée avec cette personne. Dans un groupe, la liste contient les membres qui ont un message chargé à
l'écran : remontez dans la discussion pour en faire apparaître d'autres.

Sans réglage, le fuseau est deviné depuis l'indicatif du numéro quand il est visible (`≈` quand le pays a plusieurs
fuseaux). Un numéro français utilisé depuis l'étranger reste vu comme « Paris » : choisissez alors le fuseau à la main.

Le popup de l'extension liste les fuseaux enregistrés et permet de masquer l'heure sur les messages.

## Confidentialité

Tout se passe dans votre navigateur. L'extension lit la page WhatsApp Web pour trouver les heures et les noms, et ne
stocke que les fuseaux que vous choisissez (`chrome.storage.sync`). Aucune donnée n'est envoyée ailleurs.

## Limites

- L'extension s'appuie sur la structure de la page WhatsApp Web, qui peut changer avec les mises à jour de WhatsApp.
- Les vocaux et autocollants ne sont pas annotés.

## Licence

MIT
