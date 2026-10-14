import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  APPS_SCRIPT_URL: string;
  APPS_SCRIPT_SECRET: string;
  SITE_URL?: string;
}

// Tarifs par mois (index 0 = janvier) — doit rester identique à MONTH_PRICE dans js/main.js.
const MONTH_PRICE = [39, 39, 43, 49, 69, 99, 224, 224, 69, 49, 39, 39];
const MIN_NIGHTS = 4;
const DEPOSIT_RATE = 0.3; // acompte = 30% du prix total du séjour

const DEFAULT_ALLOWED_ORIGINS = [
  "https://kemetedassociation.github.io",
  "http://localhost:8791",
  "http://127.0.0.1:8791",
];

const SYSTEM_PROMPT = `Tu es l'assistant de conciergerie du site LUZDOSOL, une résidence hôtelière à Albufeira (Algarve, Portugal) proposant un appartement de vacances en réservation directe (sans commission de plateforme).

Réponds toujours dans la langue du visiteur (français par défaut). Sois chaleureux, concis (3-5 phrases maximum), précis, et rassurant. N'utilise jamais de tiret long (—) ni d'emoji dans tes réponses : écris avec une ponctuation simple et naturelle. Les prix affichés sont des prix finaux TTC, ménage inclus, sans frais cachés : n'écris jamais "HT". N'annonce pas ce que tu vas faire ("je vais vérifier..."), réponds directement. Pour tout prix de séjour, utilise l'outil calculer_prix et reprends exactement son résultat. Ta réponse texte doit toujours contenir l'information concrète demandée (prix calculé nuit par nuit avec le total, durée et options de trajet, etc.) : la page ouverte n'est qu'un complément. Si la question porte sur plusieurs sujets, réponds à chacun et choisis la page la plus utile.

INFORMATIONS SUR LE LOGEMENT
- Appartement lumineux, entièrement meublé, dans la résidence LUZDOSOL à Albufeira.
- Équipements : parking privé, piscine, cuisine équipée, terrasse, excellent emplacement (à quelques minutes des plages).
- Salle de bain moderne et soignée.
- Idéal pour couples, familles et petits groupes d'amis.

TARIFS (par nuit, réservation directe, sans commission)
- Janvier : 39€, Février : 39€, Mars : 43€, Avril : 49€, Mai : 69€, Juin : 99€
- Juillet : 224€, Août : 224€, Septembre : 69€, Octobre : 49€, Novembre : 39€, Décembre : 39€
- Séjour minimum de 4 nuits (le visiteur choisit librement le nombre de nuits, à partir de 4).
- Paiement : acompte par virement PayPal (à l'adresse exacte emouenguebienvenu@yahoo.fr, à recopier lettre par lettre sans aucune modification, option "à un ami/famille" recommandée), solde selon modalités convenues avec l'hôte. Le paiement par carte en ligne n'est pas encore disponible.
- Ménage de fin de séjour inclus.
- Animaux : à voir directement avec l'hôte sur WhatsApp.

RÉSERVATION (processus en 3 étapes)
1. Choisir une date d'arrivée et le nombre de nuits (4 minimum) dans le calendrier des disponibilités (page Tarifs, onglet "Disponibilités").
2. Remplir le formulaire de réservation (page Tarifs, onglet "Réserver").
3. Confirmer directement avec l'hôte sur WhatsApp, ou régler un acompte PayPal.

ANNULATION
- Gratuite jusqu'à 30 jours avant l'arrivée (remboursement intégral de l'acompte).
- Entre 30 et 7 jours avant : 50% de l'acompte remboursé.
- Moins de 7 jours avant : acompte non remboursable (sauf situation particulière, à voir avec l'hôte).

ARRIVÉE — DEUX SCÉNARIOS POSSIBLES
- Accueil par l'hôtesse : notre conciergerie sur place, Paola, vous accueille à votre arrivée et vous remet toutes les consignes (fonctionnement de l'appartement, équipements, recommandations locales). Elle reste joignable sur WhatsApp pendant tout le séjour en cas de besoin.
- Entrée autonome : un code d'accès et des instructions détaillées vous sont envoyés avant votre arrivée pour une entrée en toute autonomie, à l'heure qui vous convient.
- Le scénario appliqué dépend de la réservation ; les détails précis (dont le contact de Paola) sont communiqués par l'hôte après confirmation.

RÈGLEMENT INTÉRIEUR (communiqué le jour de l'arrivée)
- Interdiction de fumer à l'intérieur de l'appartement.
- Merci de prendre soin du mobilier et des équipements ; ne pas les endommager.
- Nous recommandons de prendre des photos de l'appartement à l'arrivée et au départ (état des lieux).
- Une caution peut être retenue en cas de dommage constaté.
- En cas de besoin pendant le séjour, contacter directement l'hôte (WhatsApp).
- L'hôte prend des nouvelles le lendemain de l'arrivée et à mi-séjour pour s'assurer que tout se passe bien.
- Après le séjour, une invitation à laisser un avis Google et des suggestions est envoyée aux voyageurs.

ALBUFEIRA & ACTIVITÉS
- Praia da Oura à 5 minutes à pied ; Praia da Falésia, Olhos de Água et les autres grandes plages à quelques minutes en voiture.
- Excursions en bateau et dauphins, marina à 10 minutes.
- Grottes de Benagil à 20 minutes, l'une des merveilles naturelles les plus photographiées au monde.
- Sports nautiques (jet-ski, surf, paddle), vieille ville blanchie à la chaux, vie nocturne réputée.
- 300 jours de soleil par an, température moyenne 24°C, 25+ plages à proximité.

PAGES DU SITE (utilise l'outil "navigate" pour y envoyer le visiteur quand c'est pertinent)
- index.html : accueil
- appartement.html : détails de l'appartement, photos, équipements
- albufeira.html : que faire à Albufeira — plages & activités (#plages), activités familiales (#familial). Chaque carte d'activité mène aussi à une page détaillée (plages, sorties en mer, nature, grottes de Benagil, sports nautiques, vieille ville).
- tarifs.html : tarifs (ancre #tarifs), disponibilités (#calendrier), réservation (#reservation) — ce sont des onglets sur la même page
- galerie.html : galerie photos/vidéos
- guide.html : guide du séjour (restaurants, sorties, villes à visiter)
- contact.html : FAQ (#faq) et contact direct
- venir.html : comment venir (le visiteur indique sa ville ou sa position, la page prépare le trajet : transports jusqu'à son aéroport, comparateurs de vols vers Faro (Google Flights, Skyscanner, Kayak) avec ses dates, compagnies qui desservent Faro, puis trajet Faro → appartement). Aéroport le plus proche : Faro (FAO), à 38 km, 35-40 min de route. Taxi environ 45-60 €, Uber/Bolt environ 25-40 €, bus moins cher mais plus long, voiture de location conseillée. Autre option : vol vers Lisbonne puis train CP jusqu'à Albufeira-Ferreiras (environ 3 h).

Quand la réponse concerne un sujet précis (tarifs, dispos, réserver, activités, appartement, galerie, guide, contact/FAQ, comment venir/vols/aéroport), appelle l'outil "navigate" en plus de ta réponse texte pour emmener le visiteur directement à la bonne page. N'invente jamais d'informations qui ne sont pas ci-dessus — si tu ne sais pas, invite le visiteur à contacter l'hôte via la page Contact.`;

// Coordonnées de paiement/contact : le modèle peut déformer une adresse en la
// recopiant (vu en test : "amoenguebienvenu@…"). Une erreur ici enverrait un
// acompte au mauvais destinataire, donc toute adresse ressemblante est remplacée
// par la bonne avant d'être envoyée au visiteur.
const PAYPAL_EMAIL = "emouenguebienvenu@yahoo.fr";
const CONTACT_EMAIL = "luzdosol351@gmail.com";
function enforceContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]*bienvenu[\w.+-]*@[\w-]+(?:\.[\w-]+)+/gi, PAYPAL_EMAIL)
    .replace(/[\w.+-]*luzdosol[\w.+-]*@[\w-]+(?:\.[\w-]+)+/gi, CONTACT_EMAIL);
}

const NAVIGATE_TOOL: Anthropic.Tool = {
  name: "navigate",
  description:
    "Envoie le visiteur vers la page (et éventuellement la section) du site LUZDOSOL la plus pertinente par rapport à sa question.",
  input_schema: {
    type: "object",
    properties: {
      page: {
        type: "string",
        enum: [
          "index.html",
          "appartement.html",
          "albufeira.html",
          "tarifs.html",
          "galerie.html",
          "guide.html",
          "contact.html",
          "venir.html",
        ],
        description: "Le fichier de la page à ouvrir.",
      },
      anchor: {
        type: "string",
        description:
          "Ancre optionnelle dans la page (ex: 'tarifs', 'calendrier', 'reservation', 'faq'), sans le '#'.",
      },
    },
    required: ["page"],
  },
};

const PRICE_TOOL: Anthropic.Tool = {
  name: "calculer_prix",
  description:
    "Calcule le prix exact d'un séjour (nuit par nuit selon le tarif du mois, ménage inclus, acompte 30 %). Utilise TOUJOURS cet outil dès qu'un prix de séjour est demandé, ne fais jamais le calcul toi-même. La date de départ n'est pas une nuit facturée.",
  input_schema: {
    type: "object",
    properties: {
      arrivee: { type: "string", description: "Date d'arrivée au format AAAA-MM-JJ." },
      nuits: { type: "integer", description: "Nombre de nuits (minimum 4)." },
    },
    required: ["arrivee", "nuits"],
  },
};

/** Détail du prix calculé côté serveur, renvoyé au modèle comme résultat d'outil. */
function priceQuote(input: { arrivee?: unknown; nuits?: unknown }): string {
  const n = Number(input.nuits);
  if (!isValidIsoDate(input.arrivee) || !Number.isInteger(n) || n < 1 || n > 60) return "Dates invalides : demande au visiteur sa date d'arrivée et le nombre de nuits.";
  const groups: { mois: number; prix: number; nuits: number }[] = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const m = isoMonthIndex(isoAddDays(input.arrivee, i));
    const pr = MONTH_PRICE[m];
    total += pr;
    const last = groups[groups.length - 1];
    if (last && last.mois === m) last.nuits++; else groups.push({ mois: m, prix: pr, nuits: 1 });
  }
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const lignes = groups.map((g) => `${g.nuits} nuit(s) en ${MOIS[g.mois]} à ${g.prix} € = ${g.nuits * g.prix} €`).join(" ; ");
  const depart = isoAddDays(input.arrivee, n);
  const acompte = Math.round(total * DEPOSIT_RATE * 100) / 100;
  return `Arrivée ${input.arrivee}, départ ${depart}, ${n} nuits. ${lignes}. TOTAL ${total} € (ménage inclus, aucun frais). Acompte 30 % : ${acompte.toFixed(2).replace(".", ",")} €.` +
    (n < MIN_NIGHTS ? ` Attention : le séjour minimum est de ${MIN_NIGHTS} nuits.` : "");
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowed = env.ALLOWED_ORIGIN
    ? [env.ALLOWED_ORIGIN, ...DEFAULT_ALLOWED_ORIGINS]
    : DEFAULT_ALLOWED_ORIGINS;
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
}

async function handleChat(request: Request, env: Env, cors: HeadersInit): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Historique borné (10 derniers messages, 1500 caractères chacun), rôles
  // vérifiés et premier message toujours "user" : évite qu'un appel détourné
  // fasse exploser la consommation de l'API ou provoque une erreur.
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "messages requis" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // maxRetries : nouvel essai automatique si l'API est momentanément surchargée.
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 3 });

  try {
    // Boucle d'outils : le modèle peut demander un calcul de prix (exécuté ici,
    // résultat exact) et/ou l'ouverture d'une page. Chaque appel d'outil reçoit
    // une réponse, puis le modèle rédige sa réponse finale au visiteur.
    const convo: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
    let text = "";
    let navigate: { page: string; anchor?: string } | null = null;

    for (let round = 0; round < 4; round++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [NAVIGATE_TOOL, PRICE_TOOL],
        ...(round === 3 ? { tool_choice: { type: "none" as const } } : {}),
        messages: convo,
      });

      const results: Anthropic.ToolResultBlockParam[] = [];
      let roundText = "";
      for (const block of response.content) {
        if (block.type === "text") roundText += block.text;
        else if (block.type === "tool_use") {
          let out = "Page ouverte pour le visiteur.";
          if (block.name === "navigate") navigate = block.input as { page: string; anchor?: string };
          else if (block.name === "calculer_prix") out = priceQuote(block.input as { arrivee?: unknown; nuits?: unknown });
          results.push({ type: "tool_result", tool_use_id: block.id, content: out });
        }
      }
      if (response.stop_reason !== "tool_use" || !results.length) { text += roundText; break; }
      // Le texte écrit avant un calcul de prix est provisoire : seule la réponse finale compte.
      convo.push({ role: "assistant", content: response.content });
      convo.push({ role: "user", content: [...results, { type: "text", text: "Réponds maintenant au visiteur en texte, avec les informations concrètes." }] });
    }

    text = enforceContactDetails(text).replace(/\p{Extended_Pictographic}\uFE0F?\s?/gu, "").replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-");

    return new Response(JSON.stringify({ text, navigate }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Le concierge est momentanément indisponible." }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Appelle l'Apps Script (POST). Gère la redirection 302 systématique des Web Apps
 * Apps Script "à la main" : fetch() convertit automatiquement un POST suivi d'un
 * 302 en GET (perdant le corps de la requête), donc on lit l'en-tête Location
 * nous-mêmes et on va chercher le contenu déjà calculé avec un second GET.
 */
async function callAppsScript(env: Env, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const first = await fetch(env.APPS_SCRIPT_URL, { method: "POST", body, redirect: "manual" });
  let text: string;
  if (first.status === 302 || first.status === 301) {
    const loc = first.headers.get("Location");
    if (!loc) throw new Error("Apps Script : redirection sans Location");
    const second = await fetch(loc, { method: "GET" });
    text = await second.text();
  } else {
    text = await first.text();
  }
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, raw: text };
  }
}

function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function isoMonthIndex(iso: string): number {
  return Number(iso.split("-")[1]) - 1;
}

function isValidIsoDate(iso: unknown): iso is string {
  return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

async function handleAvailability(request: Request, env: Env, cors: HeadersInit): Promise<Response> {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const check = new URL(env.APPS_SCRIPT_URL);
  check.searchParams.set("action", "availability");
  check.searchParams.set("from", from);
  check.searchParams.set("to", to);
  try {
    const r = await fetch(check.toString()); // GET : fetch() suit le 302 sans changer la méthode
    const data = await r.json().catch(() => ({ ok: false }));
    return new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "indisponible" }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

interface CheckoutRequestBody {
  prenom?: string;
  nom?: string;
  email?: string;
  tel?: string;
  arrivee?: string;
  depart?: string;
  arrivee_iso?: string;
  nuits?: number | string;
  voyageurs?: number | string;
  amountType?: "acompte" | "total";
}

async function handleCheckout(request: Request, env: Env, cors: HeadersInit): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  let body: CheckoutRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "json_invalide" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { prenom, nom, email, tel, arrivee, depart, amountType } = body;
  const n = parseInt(String(body.nuits), 10);

  if (!prenom || !nom || !email || !isValidIsoDate(body.arrivee_iso) || !n || n < MIN_NIGHTS) {
    return new Response(JSON.stringify({ ok: false, error: "champs_invalides" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const arrivee_iso = body.arrivee_iso;
  const depart_iso = isoAddDays(arrivee_iso, n);
  // Même calcul que le panier du site : chaque nuit au tarif de son propre mois.
  let total = 0;
  for (let i = 0; i < n; i++) total += MONTH_PRICE[isoMonthIndex(isoAddDays(arrivee_iso, i))] ?? 0;
  const totalCents = Math.round(total * 100);
  const type: "acompte" | "total" = amountType === "total" ? "total" : "acompte";
  const amountCents = type === "total" ? totalCents : Math.round(totalCents * DEPOSIT_RATE);

  if (amountCents < 100) {
    return new Response(JSON.stringify({ ok: false, error: "montant_invalide" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    // 1) Pose une retenue de 15 min sur les dates — l'Apps Script revérifie la
    //    disponibilité côté serveur (source de vérité), pas seulement le client.
    const holdRes = await callAppsScript(env, {
      action: "hold",
      secret: env.APPS_SCRIPT_SECRET,
      prenom, nom, email, tel: tel || "",
      arrivee: arrivee || arrivee_iso, depart: depart || depart_iso,
      arrivee_iso, depart_iso, nuits: String(n), voyageurs: String(body.voyageurs || ""),
      type, montant_cents: String(amountCents),
    });
    if (!holdRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: holdRes.error || "indisponible" }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2) Crée la session Stripe Checkout (cartes, Google Pay, Apple Pay et Klarna
    //    apparaissent automatiquement selon les moyens de paiement activés côté
    //    tableau de bord Stripe — aucun code spécifique n'est nécessaire ici).
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
    const site = env.SITE_URL || "https://kemetedassociation.github.io/silchoro-albufeira";
    const label = type === "total" ? "Séjour LUZDOSOL — paiement total" : "Séjour LUZDOSOL — acompte de réservation";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: holdRes.holdId,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: label, description: `${arrivee_iso} → ${depart_iso} · ${n} nuits` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: `${site}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/tarifs.html?paiement=annule#reservation`,
      metadata: { holdId: holdRes.holdId, prenom, nom, arrivee_iso, depart_iso, nuits: String(n), type },
    });

    return new Response(JSON.stringify({ ok: true, url: session.url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "erreur_paiement" }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

/**
 * Webhook Stripe : aucun CORS ni parsing JSON classique — la signature se
 * vérifie sur le corps brut. Confirme la retenue côté Apps Script (et déclenche
 * l'email "réservation confirmée") seulement quand le paiement est réellement
 * encaissé (payment_status === "paid" — important pour Klarna, dont le paiement
 * peut être asynchrone).
 */
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const sig = request.headers.get("stripe-signature") || "";
  const payload = await request.text();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature Stripe invalide", err);
    return new Response("Signature invalide", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid" && session.client_reference_id) {
      try {
        await callAppsScript(env, {
          action: "confirm",
          secret: env.APPS_SCRIPT_SECRET,
          hold_id: session.client_reference_id,
          session_id: session.id,
          montant_cents: String(session.amount_total ?? ""),
        });
      } catch (err) {
        console.error("Échec confirmation Apps Script", err);
        return new Response("Erreur de confirmation", { status: 500 });
      }
    }
  }
  // checkout.session.async_payment_failed / expired : on laisse la retenue
  // expirer naturellement (releaseExpiredHolds, toutes les 10 min côté Apps Script).

  return new Response("ok", { status: 200 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Le webhook Stripe n'a pas besoin de CORS et vérifie sa propre signature.
    if (url.pathname === "/webhook") {
      return handleWebhook(request, env);
    }

    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // Seul le site LUZDOSOL peut utiliser le chatbot et le paiement (l'API
    // Anthropic est payante : on refuse les appels venant d'ailleurs).
    const allowed = env.ALLOWED_ORIGIN ? [env.ALLOWED_ORIGIN, ...DEFAULT_ALLOWED_ORIGINS] : DEFAULT_ALLOWED_ORIGINS;
    if (request.method === "POST" && (!origin || !allowed.includes(origin))) {
      return new Response(JSON.stringify({ error: "origine_non_autorisee" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/availability") return handleAvailability(request, env, cors);
    if (url.pathname === "/checkout") return handleCheckout(request, env, cors);

    // Route par défaut (racine) : comportement historique du chatbot, inchangé.
    return handleChat(request, env, cors);
  },
};
