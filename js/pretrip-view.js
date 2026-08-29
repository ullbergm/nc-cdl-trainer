/* The Pre-trip tab: the Section 11 vehicle-inspection script from
   data/pretrip-script.js as a recite-and-reveal checklist, registered with
   the engine through its APP_VIEWS hook: the engine routes #pretrip to
   renderPretrip and hands it the view surface. Read mode lays the whole
   script open; memorize mode collapses every item so you say its checks out
   loud before revealing them. Groups that only apply to some rigs (coupling,
   trailer, bus, coach) toggle on and off, and mode and rig choices persist
   in their own localStorage key, separate from study progress.
   Loads after data/pretrip-script.js and before js/app.js. */
(() => {
  const PREFS_KEY = 'nc-cdl-pretrip-v1';

  // Bound at each render from the engine's view context; the helpers below
  // only run from inside renderPretrip, so they always see current bindings.
  let view, $, esc, cfg;

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
      if (typeof p.rigs !== 'object' || !p.rigs) p.rigs = {};
      return p;
    } catch { return { rigs: {} }; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }
  const rigOn = (prefs, r) => (r.key in prefs.rigs ? !!prefs.rigs[r.key] : !!r.default);

  // Same page-citation link the questions render: printed label -> physical
  // PDF page via the manual's pages map, plain text if the label is unmapped.
  function cite(page) {
    const m = cfg.manuals.default;
    const target = m.pages && m.pages[page];
    const label = `${esc(m.cite || 'Manual')} p. ${esc(page)}`;
    return m.url && target
      ? `<a class="cite" href="${m.url}#page=${encodeURIComponent(target)}"
           target="_blank" rel="noopener"
           title="Open the manual at page ${esc(page)}">${label}</a>`
      : `<span class="cite">${label}</span>`;
  }

  function itemHTML(item, open) {
    return `
      <details class="ptitem"${open ? ' open' : ''}>
        <summary>${esc(item.name)}</summary>
        <ul>${item.say.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        ${item.note ? `<p class="ptnote">${esc(item.note)}</p>` : ''}
      </details>`;
  }

  function groupHTML(group, open) {
    return `
      <section class="ptgroup">
        <h3>${esc(group.name)} ${cite(group.page)}</h3>
        ${group.warn ? `<p class="ptwarn">${esc(group.warn)}</p>` : ''}
        ${group.items.map(i => itemHTML(i, open)).join('')}
        ${group.note ? `<p class="ptnote">${esc(group.note)}</p>` : ''}
      </section>`;
  }

  function renderPretrip(ctx) {
    if (ctx) ({ view, $, esc, cfg } = ctx);
    const prefs = loadPrefs();
    const open = !prefs.memorize;
    const groups = PRETRIP_SCRIPT.groups.filter(g => {
      const rig = g.rig && PRETRIP_SCRIPT.rigs.find(r => r.key === g.rig);
      return !rig || rigOn(prefs, rig);
    });
    view.innerHTML = `
      <div class="pretrip">
        <h2>Pre-trip inspection script</h2>
        <p class="hint">On the vehicle inspection test you walk around the vehicle, point to or
          touch each item, and explain to the examiner what you are checking and why — you will
          not have to crawl under the hood or under the vehicle. This is Section 11 of the manual
          as a script to memorize: work one group at a time until the words come without looking.</p>
        <div class="ptbar">
          <div class="ptmodes" role="group" aria-label="Study mode">
            <button class="btn${open ? ' primary' : ''}" id="ptread"
              aria-pressed="${open}">Read</button>
            <button class="btn${open ? '' : ' primary'}" id="ptrecite"
              aria-pressed="${!open}">Memorize</button>
          </div>
          <div class="ptrigs" role="group" aria-label="Vehicle add-ons">
            ${PRETRIP_SCRIPT.rigs.map(r => `
              <label class="ptrig"><input type="checkbox" data-rig="${esc(r.key)}"
                ${rigOn(prefs, r) ? 'checked' : ''}> ${esc(r.label)}</label>`).join('')}
          </div>
        </div>
        ${open ? '' : `<p class="hint">Say each item’s checks out loud, then tap it to see
          how you did.</p>`}
        ${groups.map(g => groupHTML(g, open)).join('')}
        <p class="disclaimer">Condensed from Section 11 of the
          <a href="${cfg.manuals.default.url}" target="_blank" rel="noopener">NC Commercial
          Driver Manual</a>; the manual and your examiner’s instructions are authoritative.
          The Skills Test Review questions in Study and Exam cover the same material.</p>
      </div>`;

    const mode = memorize => () => {
      prefs.memorize = memorize;
      savePrefs(prefs);
      renderPretrip();
    };
    $('#ptread').addEventListener('click', mode(false));
    $('#ptrecite').addEventListener('click', mode(true));
    view.querySelectorAll('input[data-rig]').forEach(box =>
      box.addEventListener('change', () => {
        prefs.rigs[box.dataset.rig] = box.checked;
        savePrefs(prefs);
        renderPretrip();
      }));
  }

  self.APP_VIEWS = Object.assign(self.APP_VIEWS || {}, { pretrip: renderPretrip });
})();
