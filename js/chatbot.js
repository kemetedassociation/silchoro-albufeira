/**
 * chatbot.js — Assistant de conciergerie LUZDOSOL (Claude Haiku 4.5 via Cloudflare Worker).
 * Le widget ne s'affiche que si CHATBOT_ENDPOINT est configuré ci-dessous
 * (voir chatbot-worker/README — à déployer séparément).
 */
(function () {
  const CHATBOT_ENDPOINT = 'https://luzdosol-chatbot.kemeted-association.workers.dev';
  if (!CHATBOT_ENDPOINT) return;

  const SUGGESTIONS = [
    { label: 'Quels sont vos tarifs ?', text: 'Quels sont vos tarifs ?' },
    { label: 'Comment réserver ?', text: 'Comment réserver ?' },
    { label: 'Que faire à Albufeira ?', text: 'Que faire à Albufeira ?' },
  ];

  const history = [];
  let open = false;
  let sending = false;

  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    });
    children.forEach((c) => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  const bubble = el('button', { class: 'cb-bubble', 'aria-label': 'Ouvrir le chat' },
    el('img', { src: 'assets/icons/logo-mark.webp', alt: '' })
  );

  const panel = el('div', { class: 'cb-panel' },
    el('div', { class: 'cb-head' },
      el('img', { src: 'assets/icons/logo-mark.webp', alt: '' }),
      el('div', { class: 'cb-head-txt' },
        el('div', { class: 'cb-title' }, 'Assistant LUZDOSOL'),
        el('div', { class: 'cb-sub' }, 'Répond en quelques secondes')
      ),
      el('button', { class: 'cb-close', 'aria-label': 'Fermer' }, '✕')
    ),
    el('div', { class: 'cb-msgs', id: 'cb-msgs' }),
    el('div', { class: 'cb-suggestions', id: 'cb-suggestions' }),
    el('form', { class: 'cb-form', id: 'cb-form' },
      el('input', { class: 'cb-input', id: 'cb-input', placeholder: 'Posez votre question…', autocomplete: 'off' }),
      el('button', { class: 'cb-send', type: 'submit', 'aria-label': 'Envoyer' }, '→')
    )
  );

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  const msgsEl = panel.querySelector('#cb-msgs');
  const suggEl = panel.querySelector('#cb-suggestions');
  const formEl = panel.querySelector('#cb-form');
  const inputEl = panel.querySelector('#cb-input');

  function addBubbleMsg(role, text, navigate) {
    const row = el('div', { class: 'cb-row cb-row-' + role });
    row.appendChild(el('div', { class: 'cb-bubble-msg cb-bubble-' + role, html: escapeHtml(text) }));
    if (navigate && navigate.page) {
      const href = navigate.page + (navigate.anchor ? '#' + navigate.anchor : '');
      const btn = el('button', { class: 'cb-navlink' }, 'Voir la page →');
      btn.addEventListener('click', () => {
        if (window.luzdosolNavigate) window.luzdosolNavigate(href);
        else location.href = href;
      });
      row.appendChild(btn);
    }
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function escapeHtml(s) {
    return (s || '')
      .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function showTyping() {
    const row = el('div', { class: 'cb-row cb-row-assistant', id: 'cb-typing' },
      el('div', { class: 'cb-bubble-msg cb-bubble-assistant cb-typing' },
        el('span'), el('span'), el('span')
      )
    );
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function hideTyping() {
    const t = document.getElementById('cb-typing');
    if (t) t.remove();
  }

  async function send(text) {
    if (!text || sending) return;
    sending = true;
    suggEl.hidden = true;
    addBubbleMsg('user', text);
    history.push({ role: 'user', content: text });
    showTyping();
    try {
      const res = await fetch(CHATBOT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      hideTyping();
      if (data.error) {
        addBubbleMsg('assistant', "Désolé, je rencontre un souci technique. Contactez-nous directement via la page Contact.");
      } else {
        addBubbleMsg('assistant', data.text || '…', data.navigate);
        history.push({ role: 'assistant', content: data.text || '' });
      }
    } catch (err) {
      hideTyping();
      addBubbleMsg('assistant', "Connexion impossible pour le moment. Contactez-nous via WhatsApp ou la page Contact.");
    }
    sending = false;
  }

  SUGGESTIONS.forEach((s) => {
    const chip = el('button', { class: 'cb-chip' }, s.label);
    chip.addEventListener('click', () => send(s.text));
    suggEl.appendChild(chip);
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = inputEl.value.trim();
    if (!v) return;
    inputEl.value = '';
    send(v);
  });

  function togglePanel(force) {
    open = typeof force === 'boolean' ? force : !open;
    panel.classList.toggle('open', open);
    bubble.classList.toggle('open', open);
    if (open && !history.length) {
      addBubbleMsg('assistant', "Bonjour ! Je suis l'assistant de LUZDOSOL. Posez-moi vos questions sur le logement, les tarifs, les disponibilités ou les activités à Albufeira.");
    }
    if (open) setTimeout(() => inputEl.focus(), 300);
  }

  bubble.addEventListener('click', () => togglePanel());
  panel.querySelector('.cb-close').addEventListener('click', () => togglePanel(false));
})();
