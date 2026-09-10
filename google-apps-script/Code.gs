/**
 * LUZDOSOL — suivi des réservations + emails automatiques + feuille formatée
 *
 * Séquence d'emails automatiques envoyés au voyageur :
 * 1. À la réservation (immédiat)      → merci + consignes / prochaines étapes
 * 2. Le jour de l'arrivée (J)         → règlement intérieur + rappel des consignes
 * 3. Le lendemain de l'arrivée (J+1)  → prise de nouvelles, disponibilité en cas de question
 * 4. 3 jours après l'arrivée (J+3)    → prise de nouvelles à mi-séjour
 * 5. Le lendemain du départ           → demande d'avis Google + suggestions
 *
 * La feuille "Reservations" est mise en forme automatiquement : lignes colorées
 * selon le statut du séjour (à venir / en cours / terminé), lien WhatsApp cliquable
 * par ligne, en-tête figé. Un onglet "Aperçu" résume les chiffres clés.
 * (Les statuts, couleurs et liens sont calculés directement en code, pas via des
 * formules de feuille de calcul — ceci évite les erreurs liées à la langue/locale
 * du compte Google, qui change le séparateur des formules selon les pays.)
 *
 * Mise en place (à faire une seule fois, depuis le compte luzdosol351@gmail.com) :
 * 1. Aller sur sheets.google.com → créer une feuille vide, la nommer "LUZDOSOL - Réservations".
 * 2. Extensions > Apps Script. Supprimer le contenu par défaut et coller ce fichier entier.
 * 3. En haut, exécuter la fonction "setup" (menu déroulant des fonctions) une seule fois.
 *    Autoriser les permissions demandées (accès à la feuille + envoi d'emails).
 *    (Si vous aviez déjà exécuté "setup" avant cette mise à jour, relancez-la une fois
 *    pour appliquer les couleurs, les liens et l'onglet "Aperçu".)
 * 4. Déployer > Nouveau déploiement > Type "Application Web".
 *    - Exécuter en tant que : Moi (luzdosol351@gmail.com)
 *    - Qui a accès : Tout le monde
 *    Copier l'URL du déploiement obtenue (se termine par /exec).
 * 5. Coller cette URL dans js/main.js à la constante RESA_TRACKER_URL.
 * 6. Pensez à personnaliser GOOGLE_REVIEW_URL ci-dessous avec le vrai lien d'avis Google
 *    dès que votre fiche Google Business Profile sera créée.
 */

const SHEET_NAME = 'Reservations';
const HOST_EMAIL = 'luzdosol351@gmail.com';
const HOST_NAME = 'Bienvenu Fortuné';
// TODO: remplacer par le vrai lien "laisser un avis" de la fiche Google Business LUZDOSOL
const GOOGLE_REVIEW_URL = 'https://g.page/r/REMPLACER_PAR_VOTRE_LIEN/review';

// Colonnes de la feuille (1-indexé)
const COL = {
  horodatage: 1, prenom: 2, nom: 3, email: 4, tel: 5,
  arrivee: 6, depart: 7, arriveeIso: 8, departIso: 9, nuits: 10, voyageurs: 11,
  dayjEnvoye: 12, j1Envoye: 13, j3Envoye: 14, avisEnvoye: 15,
  statut: 16, whatsapp: 17,
};
const NB_COLS = 17;
const HEADERS = ['Horodatage', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Arrivée', 'Départ', 'Arrivée (ISO)', 'Départ (ISO)', 'Nuits', 'Voyageurs', 'J envoyé', 'J+1 envoyé', 'J+3 envoyé', 'Avis envoyé', 'Statut', 'Contact'];
const STATUT_COLORS = { 'À venir': '#eaf6f8', 'En cours': '#fdf3d6', 'Terminé': '#e9f9ec' };

function doPost(e) {
  const sheet = getSheet();
  const p = e.parameter;
  sheet.appendRow([
    new Date(),
    p.prenom || '', p.nom || '', p.email || '', p.tel || '',
    p.arrivee || '', p.depart || '', p.arrivee_iso || '', p.depart_iso || '', p.nuits || '', p.voyageurs || '',
    false, false, false, false,
  ]);
  updateRowComputedCells(sheet, sheet.getLastRow());
  if (p.email) sendConfirmationEmail(p);
  return ContentService.createTextOutput('OK');
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysAgo(n) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n);
  return d;
}

// Parse "YYYY-MM-DD" en heure locale (évite le décalage UTC de `new Date(isoString)`)
function parseIsoLocal(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function computeStatut(arriveeIso, avisEnvoye) {
  const arrivee = parseIsoLocal(arriveeIso);
  if (!arrivee) return '';
  const today = daysAgo(0);
  if (today < arrivee) return 'À venir';
  return avisEnvoye ? 'Terminé' : 'En cours';
}

/**
 * Calcule et écrit, pour une ligne donnée : le statut du séjour, le lien
 * WhatsApp cliquable, et la couleur de fond de toute la ligne — sans aucune
 * formule (pour éviter les erreurs de locale). `rowValues` est optionnel :
 * passez-le si vous l'avez déjà en mémoire pour éviter une lecture inutile.
 */
function updateRowComputedCells(sheet, row, rowValues) {
  const vals = rowValues || sheet.getRange(row, 1, 1, COL.avisEnvoye).getValues()[0];
  const tel = vals[COL.tel - 1];
  const arriveeIso = vals[COL.arriveeIso - 1];
  const avisEnvoye = vals[COL.avisEnvoye - 1] === true;

  const statut = computeStatut(arriveeIso, avisEnvoye);
  sheet.getRange(row, COL.statut).setValue(statut);

  const digits = String(tel || '').replace(/[^0-9]/g, '');
  const waCell = sheet.getRange(row, COL.whatsapp);
  if (digits) {
    const rich = SpreadsheetApp.newRichTextValue()
      .setText('💬 WhatsApp')
      .setLinkUrl('https://wa.me/' + digits)
      .build();
    waCell.setRichTextValue(rich);
  } else {
    waCell.setValue('');
  }

  sheet.getRange(row, 1, 1, NB_COLS).setBackground(STATUT_COLORS[statut] || '#ffffff');
}

/* ============ 1. EMAIL DE CONFIRMATION (immédiat) ============ */
function sendConfirmationEmail(p) {
  const subject = 'Votre demande de réservation LUZDOSOL — merci !';
  const body =
    `Bonjour ${p.prenom || ''},\n\n` +
    `Merci pour votre demande de réservation à l'appartement LUZDOSOL à Albufeira ` +
    `(arrivée le ${p.arrivee || '—'}, ${p.nuits || ''} nuits) !\n\n` +
    `Prochaines étapes :\n` +
    `1. Nous confirmons votre réservation par WhatsApp ou email dans les plus brefs délais.\n` +
    `2. Un acompte par virement PayPal vous sera demandé pour valider définitivement votre séjour.\n` +
    `3. Vous recevrez, avant votre arrivée, toutes les consignes pratiques (accueil par l'hôtesse ` +
    `ou entrée autonome avec code d'accès, selon les disponibilités).\n\n` +
    `Pour toute question, répondez simplement à cet email ou écrivez-nous sur WhatsApp.\n\n` +
    `À très vite en Algarve !\n\n${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: p.email, replyTo: HOST_EMAIL, subject, body });
}

/* ============ 2. EMAIL JOUR J — règlement intérieur ============ */
function sendDayJEmail(prenom, email) {
  const subject = 'Bienvenue à LUZDOSOL — consignes de votre séjour';
  const body =
    `Bonjour ${prenom || ''},\n\n` +
    `Bienvenue à l'appartement LUZDOSOL ! Nous vous souhaitons un excellent séjour à Albufeira.\n\n` +
    `Quelques consignes importantes :\n` +
    `• Merci de ne pas fumer à l'intérieur de l'appartement.\n` +
    `• Merci de prendre soin du mobilier et des équipements.\n` +
    `• Nous vous invitons à prendre quelques photos de l'appartement à votre arrivée et à votre départ.\n` +
    `• Une caution peut être retenue en cas de dommage constaté à l'état des lieux.\n\n` +
    `Besoin de quoi que ce soit pendant votre séjour ? Contactez-nous directement sur WhatsApp — ` +
    `nous restons disponibles.\n\n` +
    `Excellent séjour !\n\n${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: email, replyTo: HOST_EMAIL, subject, body });
}

/* ============ 3-4. EMAILS J+1 / J+3 — prise de nouvelles ============ */
function sendCheckInEmail(prenom, email, label) {
  const subject = 'Tout se passe bien à LUZDOSOL ?';
  const body =
    `Bonjour ${prenom || ''},\n\n` +
    `Nous espérons que votre séjour à LUZDOSOL se passe merveilleusement bien !\n\n` +
    `N'hésitez pas à nous contacter sur WhatsApp si vous avez la moindre question, ` +
    `un besoin particulier, ou si vous souhaitez des recommandations pour vos prochains jours à Albufeira.\n\n` +
    `Belle journée,\n\n${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: email, replyTo: HOST_EMAIL, subject, body });
}

/* ============ 5. EMAIL APRÈS SÉJOUR — avis + suggestions ============ */
function sendReviewEmail(prenom, email) {
  const subject = 'Merci pour votre séjour à LUZDOSOL !';
  const body =
    `Bonjour ${prenom || ''},\n\n` +
    `Nous espérons que vous avez passé un excellent séjour à l'appartement LUZDOSOL à Albufeira !\n\n` +
    `Votre avis compte énormément pour nous et pour les futurs voyageurs. ` +
    `Auriez-vous deux minutes pour nous laisser un avis Google ?\n${GOOGLE_REVIEW_URL}\n\n` +
    `Nous serions également ravis de connaître vos suggestions : qu'avez-vous préféré ? ` +
    `Y a-t-il quelque chose que nous pourrions améliorer pour les prochains voyageurs ?\n\n` +
    `Vous pouvez simplement répondre à cet email, ou nous écrire sur WhatsApp / Instagram (@luzdosol351).\n\n` +
    `Merci encore de votre confiance, et à très bientôt en Algarve !\n\n` +
    `${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: email, replyTo: HOST_EMAIL, subject, body });
}

/**
 * Exécutée automatiquement une fois par jour (voir setup()).
 * Parcourt les réservations, envoie l'email correspondant à chaque étape du
 * séjour, et rafraîchit le statut/couleur/lien de chaque ligne.
 */
function sendScheduledEmails() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const today = daysAgo(0);
  const oneDayAgo = daysAgo(1);
  const threeDaysAgo = daysAgo(3);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const prenom = row[COL.prenom - 1];
    const email = row[COL.email - 1];
    if (!prenom && !email) continue; // ligne vide

    const arriveeRaw = row[COL.arriveeIso - 1];
    const departRaw = row[COL.departIso - 1];
    const arrivee = parseIsoLocal(arriveeRaw);
    const depart = parseIsoLocal(departRaw);

    if (email && arrivee && !isNaN(arrivee.getTime())) {
      if (!row[COL.dayjEnvoye - 1] && sameDay(arrivee, today)) {
        sendDayJEmail(prenom, email);
        sheet.getRange(i + 1, COL.dayjEnvoye).setValue(true);
      }
      if (!row[COL.j1Envoye - 1] && sameDay(arrivee, oneDayAgo)) {
        sendCheckInEmail(prenom, email, 'J+1');
        sheet.getRange(i + 1, COL.j1Envoye).setValue(true);
      }
      if (!row[COL.j3Envoye - 1] && sameDay(arrivee, threeDaysAgo)) {
        sendCheckInEmail(prenom, email, 'J+3');
        sheet.getRange(i + 1, COL.j3Envoye).setValue(true);
      }
    }

    if (email && depart && !isNaN(depart.getTime())) {
      if (!row[COL.avisEnvoye - 1] && sameDay(depart, oneDayAgo)) {
        sendReviewEmail(prenom, email);
        sheet.getRange(i + 1, COL.avisEnvoye).setValue(true);
        row[COL.avisEnvoye - 1] = true; // pour que le statut recalculé ci-dessous soit à jour
      }
    }

    updateRowComputedCells(sheet, i + 1, row);
  }

  buildOverviewSheet();
}

/* ============ MISE EN FORME DE LA FEUILLE (en-tête, largeurs) ============ */
function formatSheet() {
  const sheet = getSheet();

  sheet.getRange(1, 1, 1, NB_COLS).setValues([HEADERS])
    .setBackground('#0d2438').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);

  sheet.setColumnWidths(1, NB_COLS, 118);
  sheet.setColumnWidth(COL.email, 200);
  sheet.setColumnWidth(COL.statut, 100);
  sheet.setColumnWidth(COL.whatsapp, 120);

  // Recalcule statut/couleur/lien pour toutes les lignes déjà présentes
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const data = sheet.getRange(2, 1, lastRow - 1, COL.avisEnvoye).getValues();
    data.forEach((row, idx) => updateRowComputedCells(sheet, idx + 2, row));
  }

  sheet.autoResizeColumns(2, 3); // prénom, nom, email restent lisibles
}

/* ============ ONGLET "Aperçu" — tableau de bord ============ */
function buildOverviewSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Aperçu');
  if (!sheet) sheet = ss.insertSheet('Aperçu', 0);

  const resa = getSheet();
  const lastRow = resa.getLastRow();
  const data = lastRow >= 2 ? resa.getRange(2, 1, lastRow - 1, COL.statut).getValues() : [];

  const today = daysAgo(0);
  const sevenFromNow = new Date(today); sevenFromNow.setDate(today.getDate() + 7);

  let total = 0, arriving7 = 0, enCours = 0, aVenir = 0, termine = 0;
  data.forEach(row => {
    if (!row[COL.prenom - 1] && !row[COL.email - 1]) return;
    total++;
    const arrivee = parseIsoLocal(row[COL.arriveeIso - 1]);
    if (arrivee && arrivee >= today && arrivee <= sevenFromNow) arriving7++;
    const statut = row[COL.statut - 1];
    if (statut === 'En cours') enCours++;
    else if (statut === 'À venir') aVenir++;
    else if (statut === 'Terminé') termine++;
  });

  sheet.clear();
  sheet.getRange('A1').setValue('LUZDOSOL — Aperçu des réservations')
    .setFontSize(16).setFontWeight('bold').setFontColor('#0d2438');
  sheet.getRange('A1:D1').merge();

  const rows = [
    ['Total réservations', total],
    ['Arrivées dans les 7 prochains jours', arriving7],
    ['Séjours en cours', enCours],
    ['Séjours à venir', aVenir],
    ['Séjours terminés', termine],
  ];
  sheet.getRange(3, 1, rows.length, 2).setValues(rows);
  sheet.getRange(3, 1, rows.length, 1).setFontWeight('bold');
  sheet.getRange(3, 2, rows.length, 1).setFontSize(20).setFontColor('#0a5c86').setFontWeight('bold');
  sheet.getRange(3, 1, rows.length, 2).setBorder(true, true, true, true, true, true, '#efe6d6', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 140);

  sheet.getRange('A10').setValue('→ Voir toutes les réservations dans l\'onglet "Reservations"')
    .setFontColor('#5a6b78').setFontStyle('italic');
  sheet.getRange('A11').setValue('Mis à jour automatiquement chaque jour à 10h.')
    .setFontColor('#9aa7ad').setFontStyle('italic').setFontSize(10);
}

/**
 * À exécuter une seule fois manuellement après le premier collage du script
 * (et à nouveau si vous modifiez ce fichier plus tard).
 * Crée l'onglet, la mise en forme, l'onglet "Aperçu", et programme l'envoi quotidien à 10h.
 */
function setup() {
  getSheet();
  formatSheet();
  buildOverviewSheet();
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'sendReviewEmails' || fn === 'sendScheduledEmails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendScheduledEmails').timeBased().everyDays(1).atHour(10).create();
}
