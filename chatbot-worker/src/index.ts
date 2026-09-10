import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

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

TARIFS (réservation directe, sans commission)
- Haute saison (mi-juin → mi-septembre) : à partir de 65€/nuit.
- Basse saison : Octobre/Novembre/Mai : 50€/nuit. Décembre/Mars/Avril : 43€/nuit (promo). Juin : 65€/nuit.
- Séjour minimum de 6 nuits.
- Paiement : acompte par virement PayPal (à luzdosol351@gmail.com, option "à un ami/famille" recommandée), solde selon modalités convenues avec l'hôte.

RÉSERVATION (processus en 3 étapes)
1. Choisir une date d'arrivée dans le calendrier des disponibilités (page Tarifs, onglet "Disponibilités").
2. Remplir le formulaire de réservation (page Tarifs, onglet "Réserver").
3. Confirmer directement avec l'hôte sur WhatsApp, ou régler un acompte PayPal.

ANNULATION
- Gratuite jusqu'à 30 jours avant l'arrivée (remboursement intégral).
- Entre 30 et 7 jours avant : 50% remboursé.
- Moins de 7 jours avant : non remboursable (sauf situation particulière, à voir avec l'hôte).

ALBUFEIRA & ACTIVITÉS
- Plages dorées à 5 minutes à pied (Praia da Oura, Falésia, Olhos de Água).
- Excursions en bateau et dauphins, marina à 10 minutes.
- Grottes de Benagil à 20 minutes — l'une des merveilles naturelles les plus photographiées au monde.
- Sports nautiques (jet-ski, surf, paddle), vieille ville blanchie à la chaux, vie nocturne réputée.
- 300 jours de soleil par an, température moyenne 24°C, 25+ plages à proximité.

PAGES DU SITE (utilise l'outil "navigate" pour y envoyer le visiteur quand c'est pertinent)
- index.html : accueil
- appartement.html : détails de l'appartement, photos, équipements
- albufeira.html : activités et destination
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
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
  },
};
