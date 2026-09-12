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
 * 5. Coller cette URL dans js/main.js à la constante RESA_TRACKER_URL, ET dans le secret
 *    Worker Cloudflare APPS_SCRIPT_URL (voir chatbot-worker/wrangler.toml).
 * 6. Pensez à personnaliser GOOGLE_REVIEW_URL ci-dessous avec le vrai lien d'avis Google
 *    dès que votre fiche Google Business Profile sera créée.
 * 7. Remplacez SHARED_SECRET ci-dessous par une longue chaîne aléatoire, et collez la
 *    MÊME valeur dans le secret Worker APPS_SCRIPT_SECRET (wrangler secret put).
 *    Cette clé empêche que n'importe qui sur Internet pose des "retenues" de dates
 *    bidon directement sur cet endpoint public, sans passer par Stripe.
 *
 * Paiement en ligne (Stripe) — actions supplémentaires de cet endpoint :
 * - GET  ?action=availability&from=YYYY-MM-DD&to=YYYY-MM-DD → { ok, available }
 * - POST action=hold    (+ secret, prenom, nom, email, tel, arrivee, depart,
 *                         arrivee_iso, depart_iso, nuits, voyageurs, type, montant_cents)
 *   → pose une retenue de 15 min sur les dates si elles sont libres, avant paiement Stripe.
 * - POST action=confirm (+ secret, hold_id, session_id, montant_cents)
 *   → appelé par le webhook Stripe (via le Worker) une fois le paiement confirmé.
 * Ces trois routes sont appelées par chatbot-worker/src/index.ts, jamais directement
 * par le navigateur du visiteur (le Worker protège la clé Stripe et cette clé secrète).
 */

const SHEET_NAME = 'Reservations';
const HOST_EMAIL = 'luzdosol351@gmail.com';
const HOST_NAME = 'Bienvenu Fortuné';
// Conciergerie sur place — accueille les voyageurs à leur arrivée (scénario "hôtesse").
const CONCIERGE_NAME = 'Paule';
const CONCIERGE_PHONE = '+33 6 78 97 89 80';
// TODO: remplacer par le vrai lien "laisser un avis" de la fiche Google Business LUZDOSOL
const GOOGLE_REVIEW_URL = 'https://g.page/r/REMPLACER_PAR_VOTRE_LIEN/review';
const MIN_NIGHTS = 4;
const HOLD_MINUTES = 15;
// Clé secrète partagée avec le Worker Cloudflare (jamais exposée au navigateur).
// Remplacez cette valeur, puis collez la MÊME valeur dans le secret Worker APPS_SCRIPT_SECRET.
const SHARED_SECRET = 'REMPLACER_PAR_UNE_CLE_SECRETE_LONGUE_ET_ALEATOIRE';

// Colonnes de la feuille (1-indexé)
const COL = {
  horodatage: 1, prenom: 2, nom: 3, email: 4, tel: 5,
  arrivee: 6, depart: 7, arriveeIso: 8, departIso: 9, nuits: 10, voyageurs: 11,
  dayjEnvoye: 12, j1Envoye: 13, j3Envoye: 14, avisEnvoye: 15,
  statut: 16, whatsapp: 17,
  holdId: 18, statutPaiement: 19, typeMontant: 20, montantCents: 21, stripeSessionId: 22, holdExpire: 23,
  ref: 24,
};
const NB_COLS = 24;
const HEADERS = ['Horodatage', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Arrivée', 'Départ', 'Arrivée (ISO)', 'Départ (ISO)', 'Nuits', 'Voyageurs', 'J envoyé', 'J+1 envoyé', 'J+3 envoyé', 'Avis envoyé', 'Statut', 'Contact', 'ID retenue', 'Statut paiement', 'Type paiement', 'Montant (centimes)', 'ID session Stripe', 'Expiration retenue', 'Référence'];

/**
 * Numéro de référence "ticket" envoyé au client par email — sert à retrouver
 * facilement sa ligne dans la feuille en cas de litige ou de question
 * (ex. LUZ-20260915-A3F9). Pas besoin d'unicité stricte garantie : la date
 * d'arrivée + 4 caractères aléatoires suffisent largement à ce volume.
 */
function generateRef(arriveeIso) {
  const datePart = (arriveeIso || '').replace(/-/g, '') ||
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Lisbon', 'yyyyMMdd');
  const rand = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  return 'LUZ-' + datePart + '-' + rand;
}
const STATUT_COLORS = { 'À venir': '#eaf6f8', 'En cours': '#fdf3d6', 'Terminé': '#e9f9ec' };

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'availability') {
    releaseExpiredHolds();
    const available = isRangeAvailable(e.parameter.from, e.parameter.to);
    return jsonOut({ ok: true, available });
  }
  return ContentService.createTextOutput('LUZDOSOL — endpoint réservations');
}

function doPost(e) {
  const p = e.parameter;

  if (p.action === 'hold' || p.action === 'confirm') {
    if (p.secret !== SHARED_SECRET) return jsonOut({ ok: false, error: 'unauthorized' });
    if (p.action === 'hold') return handleHold(p);
    return handleConfirm(p);
  }

  // Comportement par défaut (inchangé) : simple demande/lead, sans paiement.
  const sheet = getSheet();
  const ref = generateRef(p.arrivee_iso);
  sheet.appendRow([
    new Date(),
    p.prenom || '', p.nom || '', p.email || '', p.tel || '',
    p.arrivee || '', p.depart || '', p.arrivee_iso || '', p.depart_iso || '', p.nuits || '', p.voyageurs || '',
    false, false, false, false,
    '', '',
    '', '', '', '', '', '',
    ref,
  ]);
  updateRowComputedCells(sheet, sheet.getLastRow());
  if (p.email) sendConfirmationEmail(Object.assign({}, p, { ref }));
  return ContentService.createTextOutput('OK');
}

/**
 * Pose une "retenue" temporaire (HOLD_MINUTES) sur des dates après avoir
 * revérifié la disponibilité côté serveur (source de vérité). Appelée par
 * le Worker Cloudflare juste avant de créer la session de paiement Stripe.
 */
function handleHold(p) {
  releaseExpiredHolds();
  const nuits = parseInt(p.nuits, 10) || 0;
  if (nuits < MIN_NIGHTS) return jsonOut({ ok: false, error: 'nuits_min' });
  if (!isRangeAvailable(p.arrivee_iso, p.depart_iso)) return jsonOut({ ok: false, error: 'unavailable' });

  const holdId = Utilities.getUuid();
  const expire = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const ref = generateRef(p.arrivee_iso);
  const sheet = getSheet();
  sheet.appendRow([
    new Date(),
    p.prenom || '', p.nom || '', p.email || '', p.tel || '',
    p.arrivee || '', p.depart || '', p.arrivee_iso || '', p.depart_iso || '', nuits, p.voyageurs || '',
    false, false, false, false,
    '', '',
    holdId, 'En attente de paiement', p.type || '', p.montant_cents || '', '', expire.toISOString(),
    ref,
  ]);
  updateRowComputedCells(sheet, sheet.getLastRow());
  return jsonOut({ ok: true, holdId, ref });
}

/**
 * Confirme une retenue après paiement Stripe réussi (appelée par le webhook
 * Stripe, relayé par le Worker). Idempotent : un second appel avec le même
 * holdId ne renvoie pas un second email.
 */
function handleConfirm(p) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonOut({ ok: false, error: 'not_found' });
  const data = sheet.getRange(2, 1, lastRow - 1, NB_COLS).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][COL.holdId - 1] !== p.hold_id) continue;
    const row = i + 2;
    if (data[i][COL.statutPaiement - 1] === 'Payé') return jsonOut({ ok: true, already: true });

    sheet.getRange(row, COL.statutPaiement).setValue('Payé');
    if (p.montant_cents) sheet.getRange(row, COL.montantCents).setValue(p.montant_cents);
    sheet.getRange(row, COL.stripeSessionId).setValue(p.session_id || '');
    updateRowComputedCells(sheet, row);

    const email = data[i][COL.email - 1];
    if (email) {
      sendPaymentConfirmedEmail({
        prenom: data[i][COL.prenom - 1],
        email: email,
        arrivee: data[i][COL.arrivee - 1],
        nuits: data[i][COL.nuits - 1],
        montant_cents: p.montant_cents || data[i][COL.montantCents - 1],
        type: data[i][COL.typeMontant - 1],
        ref: data[i][COL.ref - 1],
      });
    }
    return jsonOut({ ok: true });
  }
  return jsonOut({ ok: false, error: 'not_found' });
}

/** true si [fromIso, toIso) ne chevauche aucune réservation payée ou en attente de paiement. */
function isRangeAvailable(fromIso, toIso) {
  const from = parseIsoLocal(fromIso), to = parseIsoLocal(toIso);
  if (!from || !to || to <= from) return false;
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return true;
  const data = sheet.getRange(2, 1, lastRow - 1, NB_COLS).getValues();
  for (const row of data) {
    const statutPaiement = row[COL.statutPaiement - 1];
    if (statutPaiement !== 'Payé' && statutPaiement !== 'En attente de paiement') continue;
    const rArr = parseIsoLocal(row[COL.arriveeIso - 1]);
    const rDep = parseIsoLocal(row[COL.departIso - 1]);
    if (!rArr || !rDep) continue;
    if (from < rDep && rArr < to) return false; // chevauchement
  }
  return true;
}

/** Passe en "Expirée" les retenues non payées dont le délai est dépassé (libère les dates). */
function releaseExpiredHolds() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const now = Date.now();
  const data = sheet.getRange(2, 1, lastRow - 1, NB_COLS).getValues();
  data.forEach((row, idx) => {
    if (row[COL.statutPaiement - 1] !== 'En attente de paiement') return;
    const exp = row[COL.holdExpire - 1] ? new Date(row[COL.holdExpire - 1]) : null;
    if (exp && exp.getTime() < now) {
      const r = idx + 2;
      sheet.getRange(r, COL.statutPaiement).setValue('Expirée');
      updateRowComputedCells(sheet, r);
    }
  });
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
  const vals = rowValues || sheet.getRange(row, 1, 1, NB_COLS).getValues()[0];
  const tel = vals[COL.tel - 1];
  const arriveeIso = vals[COL.arriveeIso - 1];
  const avisEnvoye = vals[COL.avisEnvoye - 1] === true;
  const statutPaiement = vals[COL.statutPaiement - 1];

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

  let bg = STATUT_COLORS[statut] || '#ffffff';
  if (statutPaiement === 'En attente de paiement') bg = '#f3e8ff';
  else if (statutPaiement === 'Expirée' || statutPaiement === 'Annulée') bg = '#f4f4f4';
  sheet.getRange(row, 1, 1, NB_COLS).setBackground(bg);
}

/* ============ 1. EMAIL DE CONFIRMATION (immédiat) ============ */
function sendConfirmationEmail(p) {
  const subject = 'Votre demande de réservation LUZDOSOL — merci !';
  const body =
    `Bonjour ${p.prenom || ''},\n\n` +
    `Merci pour votre demande de réservation à l'appartement LUZDOSOL à Albufeira ` +
    `(arrivée le ${p.arrivee || '—'}, ${p.nuits || ''} nuits) !\n\n` +
    `Votre numéro de référence : ${p.ref || '—'}\n` +
    `(conservez-le, il permet de retrouver facilement votre dossier en cas de question)\n\n` +
    `Prochaines étapes :\n` +
    `1. Nous confirmons votre réservation par WhatsApp ou email dans les plus brefs délais.\n` +
    `2. Un acompte par virement PayPal vous sera demandé pour valider définitivement votre séjour.\n` +
    `3. Vous recevrez, avant votre arrivée, toutes les consignes pratiques (accueil par notre ` +
    `conciergerie ${CONCIERGE_NAME} sur place, ou entrée autonome avec code d'accès, selon les disponibilités).\n\n` +
    `Pour toute question, répondez simplement à cet email ou écrivez-nous sur WhatsApp.\n\n` +
    `À très vite en Algarve !\n\n${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: p.email, cc: HOST_EMAIL, replyTo: HOST_EMAIL, subject, body });
}

/* ============ 1b. EMAIL DE CONFIRMATION DE PAIEMENT (immédiat, après Stripe) ============ */
function sendPaymentConfirmedEmail(p) {
  const subject = 'Réservation confirmée — paiement reçu (LUZDOSOL)';
  const montant = p.montant_cents ? (Number(p.montant_cents) / 100).toFixed(2) + ' €' : '';
  const typeLabel = p.type === 'total' ? 'paiement total' : 'acompte';
  const body =
    `Bonjour ${p.prenom || ''},\n\n` +
    `Votre paiement de ${montant} (${typeLabel}) a bien été reçu — votre réservation à l'appartement LUZDOSOL ` +
    `à Albufeira (arrivée le ${p.arrivee || '—'}, ${p.nuits || ''} nuits) est confirmée !\n\n` +
    `Votre numéro de référence : ${p.ref || '—'}\n` +
    `(conservez-le, il permet de retrouver facilement votre dossier en cas de question)\n\n` +
    `Vous recevrez, avant votre arrivée, toutes les consignes pratiques (accueil par notre conciergerie ` +
    `${CONCIERGE_NAME} sur place, ou entrée autonome avec code d'accès, selon les disponibilités).\n\n` +
    `Pour toute question, répondez simplement à cet email ou écrivez-nous sur WhatsApp.\n\n` +
    `À très vite en Algarve !\n\n${HOST_NAME}\nLUZDOSOL`;
  MailApp.sendEmail({ to: p.email, cc: HOST_EMAIL, replyTo: HOST_EMAIL, subject, body });
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
    `Besoin de quoi que ce soit pendant votre séjour ? Notre conciergerie sur place, ${CONCIERGE_NAME}, ` +
    `est joignable directement sur WhatsApp au ${CONCIERGE_PHONE} — n'hésitez pas.\n\n` +
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
    const data = sheet.getRange(2, 1, lastRow - 1, NB_COLS).getValues();
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
    if (fn === 'sendReviewEmails' || fn === 'sendScheduledEmails' || fn === 'releaseExpiredHolds') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('sendScheduledEmails').timeBased().everyDays(1).atHour(10).create();
  // Libère automatiquement les dates d'une retenue non payée après HOLD_MINUTES.
  ScriptApp.newTrigger('releaseExpiredHolds').timeBased().everyMinutes(10).create();
}
