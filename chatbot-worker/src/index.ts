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
const MONTH_PRICE = [43, 43, 43, 59, 74, 99, 224, 224, 74, 59, 43, 43];
const MIN_NIGHTS = 4;
const DEPOSIT_RATE = 0.3; // acompte = 30% du prix total du séjour

const DEFAULT_ALLOWED_ORIGINS = [
  "https://kemetedassociation.github.io",
  "http://localhost:8791",
  "http://127.0.0.1:8791",
];

const SYSTEM_PROMPT = `Tu es l'assistant de conciergerie du site LUZDOSOL, une résidence hôtelière à Albufeira (Algarve, Portugal) proposant un appartement de vacances en réservation directe (sans commission de plateforme).

Réponds toujours dans la langue du visiteur (français par défaut). Sois chaleureux, concis (3-5 phrases maximum), précis, et rassurant.

INFORMATIONS SUR LE LOGEMENT
- Appartement lumineux, entièrement meublé, dans la résidence LUZDOSOL à Albufeira.
- Équipements : parking privé, piscine, cuisine équipée, terrasse, excellent emplacement (à quelques minutes des plages).
- Salle de bain moderne et soignée.
- Idéal pour couples, familles et petits groupes d'amis.

TARIFS (par nuit, réservation directe, sans commission)
- Janvier : 43€ · Février : 43€ · Mars : 43€ · Avril : 59€ · Mai : 74€ · Juin : 99€
- Juillet : 224€ · Août : 224€ · Septembre : 74€ · Octobre : 59€ · Novembre : 43€ · Décembre : 43€
- Séjour minimum de 4 nuits (le visiteur choisit librement le nombre de nuits, à partir de 4).
- Paiement : acompte par virement PayPal (à luzdosol351@gmail.com, option "à un ami/famille" recommandée), solde selon modalités convenues avec l'hôte.

RÉSERVATION (processus en 3 étapes)
1. Choisir une date d'arrivée et le nombre de nuits (4 minimum) dans le calendrier des disponibilités (page Tarifs, onglet "Disponibilités").
2. Remplir le formulaire de réservation (page Tarifs, onglet "Réserver").
3. Confirmer directement avec l'hôte sur WhatsApp, ou régler un acompte PayPal.

ANNULATION
- Gratuite jusqu'à 30 jours avant l'arrivée (remboursement intégral).
- Entre 30 et 7 jours avant : 50% remboursé.
- Moins de 7 jours avant : non remboursable (sauf situation particulière, à voir avec l'hôte).

ARRIVÉE — DEUX SCÉNARIOS POSSIBLES
- Accueil par l'hôtesse : notre conciergerie sur place, Paule, vous accueille à votre arrivée et vous remet toutes les consignes (fonctionnement de l'appartement, équipements, recommandations locales). Elle reste joignable sur WhatsApp pendant tout le séjour en cas de besoin.
- Entrée autonome : un code d'accès et des instructions détaillées vous sont envoyés avant votre arrivée pour une entrée en toute autonomie, à l'heure qui vous convient.
- Le scénario appliqué dépend de la réservation ; les détails précis (dont le contact de Paule) sont communiqués par l'hôte après confirmation.

RÈGLEMENT INTÉRIEUR (communiqué le jour de l'arrivée)
- Interdiction de fumer à l'intérieur de l'appartement.
- Merci de prendre soin du mobilier et des équipements ; ne pas les endommager.
- Nous recommandons de prendre des photos de l'appartement à l'arrivée et au départ (état des lieux).
- Une caution peut être retenue en cas de dommage constaté.
- En cas de besoin pendant le séjour, contacter directement l'hôte (WhatsApp).
- L'hôte prend des nouvelles le lendemain de l'arrivée et à mi-séjour pour s'assurer que tout se passe bien.
- Après le séjour, une invitation à laisser un avis Google et des suggestions est envoyée aux voyageurs.

ALBUFEIRA & ACTIVITÉS
- Plages dorées à 5 minutes à pied (Praia da Oura, Falésia, Olhos de Água).
- Excursions en bateau et dauphins, marina à 10 minutes.
- Grottes de Benagil à 20 minutes — l'une des merveilles naturelles les plus photographiées au monde.
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

Quand la réponse concerne un sujet précis (tarifs, dispos, réserver, activités, appartement, galerie, guide, contact/FAQ), appelle l'outil "navigate" en plus de ta réponse texte pour emmener le visiteur directement à la bonne page. N'invente jamais d'informations qui ne sont pas ci-dessus — si tu ne sais pas, invite le visiteur à contacter l'hôte via la page Contact.`;

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

  const messages = (body.messages || []).slice(-10); // borne l'historique envoyé
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "messages requis" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [NAVIGATE_TOOL],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    let text = "";
    let navigate: { page: string; anchor?: string } | null = null;

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use" && block.name === "navigate") {
        navigate = block.input as { page: string; anchor?: string };
      }
    }

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
  const nightly = MONTH_PRICE[isoMonthIndex(arrivee_iso)] ?? 0;
  const totalCents = Math.round(n * nightly * 100);
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

    if (url.pathname === "/availability") return handleAvailability(request, env, cors);
    if (url.pathname === "/checkout") return handleCheckout(request, env, cors);

    // Route par défaut (racine) : comportement historique du chatbot, inchangé.
    return handleChat(request, env, cors);
  },
};
