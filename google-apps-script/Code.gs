/**
 * LUZDOSOL — suivi des réservations + email d'avis automatique J+1
 *
 * Mise en place (à faire une seule fois, depuis le compte luzdosol351@gmail.com) :
 * 1. Aller sur sheets.google.com → créer une feuille vide, la nommer "LUZDOSOL - Réservations".
 * 2. Extensions > Apps Script. Supprimer le contenu par défaut et coller ce fichier entier.
 * 3. En haut, exécuter la fonction "setup" (menu déroulant des fonctions) une seule fois.
 *    Autoriser les permissions demandées (accès à la feuille + envoi d'emails).
 * 4. Déployer > Nouveau déploiement > Type "Application Web".
 *    - Exécuter en tant que : Moi (luzdosol351@gmail.com)
 *    - Qui a accès : Tout le monde
 *    Copier l'URL du déploiement obtenue (se termine par /exec).
 * 5. Coller cette URL dans js/main.js à la constante RESA_TRACKER_URL.
 *
 * À partir de là, chaque réservation envoyée via le formulaire du site est
 * enregistrée dans la feuille, et un email d'avis est envoyé automatiquement
 * le lendemain de la date de départ.
 */

const SHEET_NAME = 'Reservations';
const HOST_EMAIL = 'luzdosol351@gmail.com';
const HOST_NAME = 'Bienvenu Fortuné';

function doPost(e) {
  const sheet = getSheet();
  const p = e.parameter;
  sheet.appendRow([
    new Date(),
    p.prenom || '', p.nom || '', p.email || '', p.tel || '',
    p.arrivee || '', p.depart || '', p.voyageurs || '',
    false
  ]);
  return ContentService.createTextOutput('OK');
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Horodatage', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Arrivée', 'Départ', 'Voyageurs', 'Avis envoyé']);
  }
  return sheet;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Exécutée automatiquement une fois par jour (voir setup()).
 * Cherche les séjours terminés hier et envoie l'email d'avis.
 */
function sendReviewEmails() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const prenom = row[1], email = row[3], departRaw = row[6], alreadySent = row[8] === true;
    if (alreadySent || !email || !departRaw) continue;
    const depart = new Date(departRaw);
    if (isNaN(depart.getTime()) || !sameDay(depart, yesterday)) continue;
    sendReviewEmail(prenom, email);
    sheet.getRange(i + 1, 9).setValue(true);
  }
}

function sendReviewEmail(prenom, email) {
  const subject = 'Merci pour votre séjour à LUZDOSOL !';
  const body =
    `Bonjour ${prenom || ''},\n\n` +
    `Nous espérons que vous avez passé un excellent séjour à l'appartement LUZDOSOL à Albufeira !\n\n` +
    `Votre avis compte énormément pour nous et pour les futurs voyageurs. ` +
    `Auriez-vous deux minutes pour nous laisser un avis ?\n\n` +
    `Vous pouvez simplement répondre à cet email, ou nous écrire sur WhatsApp / Instagram (@luzdosol351).\n\n` +
    `Merci encore de votre confiance, et à très bientôt en Algarve !\n\n` +
    `${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: email, replyTo: HOST_EMAIL, subject, body });
}

/**
 * À exécuter une seule fois manuellement après le premier collage du script.
 * Crée l'onglet et programme l'envoi quotidien à 10h.
 */
function setup() {
  getSheet();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendReviewEmails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReviewEmails').timeBased().everyDays(1).atHour(10).create();
}
