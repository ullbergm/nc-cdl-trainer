/* The Shifting tab: two drills for the road test's manual transmission,
   registered with the engine through its APP_VIEWS hook (the engine routes
   #shifting here and hands over the view surface). Both read data/shifting.js.

   Gear speeds asks which gear a road speed calls for, up and down, and at
   what speed a gear comes, from the table in the data file. The choices use
   the engine's .choice buttons and #next Continue, so the engine's keyboard
   shortcuts (1-4 to answer, Enter to continue) work here untouched.

   Shift pattern draws the truck's H pattern with the lever and range
   selector and drills the move from one gear to the next.

   Double clutch trains the pause between the two clutch presses. Listen
   plays the manual's five-step cadence at the chosen pause, with a click for
   each pedal action; Tap has you press twice from memory and tells you how
   far off the pause was (Space taps on a keyboard); Drive is the whole shift
   by hand, clutch held on Space or a pedal button, the stick dragged on the
   H, with engine physics that only let a gear in when the rpm matches.

   Mode, direction, pause lengths, and sound persist in their own
   localStorage key, separate from study progress; drill scores last only
   while the tab is open. Loads after data/shifting.js and before js/app.js. */
(() => {
  const PREFS_KEY = 'nc-cdl-shifting-v1';
  const STROKE_MS = 300;     // clutch in -> clutch out, both presses
  const REP_GAP_MS = 600;    // rest at the shift point between Listen repeats
  const TAP_TIMEOUT_MS = 6000;
  const ON_TIME_MS = 150;    // |deviation| within this reads as on time
  const HISTORY = 10;
  const GRIND = 350;        // default rpm mismatch a gear still goes in at (Drive)

  // Bound at each render from the engine's view context.
  let view, $, esc, cfg;

  function loadPrefs() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { /* fresh */ }
    if (!['speeds', 'clutch', 'pattern'].includes(p.mode)) p.mode = 'speeds';
    if (!['up', 'down'].includes(p.dir)) p.dir = 'up';
    if (!['listen', 'tap', 'drive'].includes(p.sub)) p.sub = 'listen';
    if (typeof p.wait !== 'object' || !p.wait) p.wait = {};
    for (const d of ['up', 'down']) {
      if (!(p.wait[d] > 0)) p.wait[d] = SHIFTING.defaults[d];
    }
    if (typeof p.sound !== 'boolean') p.sound = true;
    if (!(p.grind >= 50 && p.grind <= 1000)) p.grind = GRIND;
    return p;
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }

  const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd'
    : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  const secs = ms => (ms / 1000).toFixed(2) + ' s';

  // ---------- tachometer ----------
  // The truck's shift point and per-gear drop from the data file. An upshift
  // starts the pause at the shift point and lands `drop` lower; a downshift
  // starts where the higher gear left the needle and revs it back up.
  const RPM = SHIFTING.rpm;
  const landRpm = RPM.shift - RPM.drop;
  const rpmStart = dir => (dir === 'up' ? RPM.shift : landRpm);
  const rpmTarget = dir => (dir === 'up' ? landRpm : RPM.shift);
  const RPM_TOL = 60;
  // The dial: a 240-degree sweep from DIAL_MIN at lower left to DIAL_MAX at
  // lower right, labelled in hundreds like a truck tachometer.
  const DIAL_MIN = 0, DIAL_MAX = 2500, SWEEP = 240, CX = 100, CY = 100, R = 82;
  const angle = rpm => -SWEEP / 2 + (Math.max(DIAL_MIN, Math.min(DIAL_MAX, rpm)) - DIAL_MIN) / (DIAL_MAX - DIAL_MIN) * SWEEP;
  // Polar point on the dial: 0 degrees straight up, clockwise positive.
  const pt = (r, deg) => {
    const a = deg * Math.PI / 180;
    return `${(CX + r * Math.sin(a)).toFixed(2)},${(CY - r * Math.cos(a)).toFixed(2)}`;
  };
  const arcAt = (r, a1, a2) => `M${pt(r, a1)} A${r},${r} 0 ${a2 - a1 > 180 ? 1 : 0},1 ${pt(r, a2)}`;
  const arc = (r, fromRpm, toRpm) => arcAt(r, angle(fromRpm), angle(toRpm));
  // Where the needle sits `elapsed` ms into a pause meant to last `wait` ms.
  // Clamped for Listen (the needle parks on the target); unclamped for Tap,
  // so a late press shows how far past the target the engine has gone.
  function rpmAt(dir, elapsed, wait, clamp) {
    let f = elapsed / wait;
    if (clamp) f = Math.min(1, f);
    const r = dir === 'up' ? RPM.shift - RPM.drop * f : landRpm + RPM.drop * f;
    return Math.round(Math.max(300, Math.min(DIAL_MAX - 100, r)) / 10) * 10;
  }
  function dialSVG(dir) {
    const start = rpmStart(dir), target = rpmTarget(dir);
    const ticks = [];
    for (let r = DIAL_MIN; r <= DIAL_MAX; r += 100) {
      const major = r % 500 === 0;
      const a = angle(r);
      ticks.push(`<line class="${major ? 'major' : 'minor'}" x1="${pt(R, a).replace(',', '" y1="')}" x2="${pt(R - (major ? 12 : 6), a).replace(',', '" y2="')}"/>`);
      if (major) ticks.push(`<text class="label" x="${pt(R - 24, a).replace(',', '" y="')}">${r / 100}</text>`);
    }
    return `
      <svg class="shdial" viewBox="0 0 200 172" aria-hidden="true">
        <circle class="face" cx="${CX}" cy="${CY}" r="96"/>
        <path class="track" d="${arc(R, DIAL_MIN, DIAL_MAX)}"/>
        <path class="drop" d="${arc(R, landRpm, RPM.shift)}"/>
        <path class="band" d="${arc(R, target - RPM_TOL, target + RPM_TOL)}"/>
        ${ticks.join('')}
        <text class="unit" x="${CX}" y="${CY + 36}">rpm ×100</text>
        <g id="shneedle" transform="rotate(${angle(start)} ${CX} ${CY})">
          <polygon points="${CX},22 ${CX - 3.5},${CY} ${CX + 3.5},${CY}"/>
          <polygon class="tail" points="${CX - 3.5},${CY} ${CX + 3.5},${CY} ${CX},${CY + 16}"/>
        </g>
        <circle class="hub" cx="${CX}" cy="${CY}" r="6"/>
        <text class="readout" id="shrpm" x="${CX}" y="${CY + 62}">${start}</text>
      </svg>`;
  }
  function tachHTML(dir) {
    const start = rpmStart(dir), target = rpmTarget(dir);
    return `
      <div class="shtach">
        ${dialSVG(dir)}
        <p class="hint">${dir === 'up'
          ? `Clutch in at ${start}. Through the pause the needle falls ${RPM.drop}, and the next gear goes in at ${target}.`
          : `Clutch in at ${start}. Through the pause you rev the needle up ${RPM.drop}, and the lower gear goes in at ${target}.`}
          ${dir === 'up'
            ? `Then, on the gas in the new gear, the needle climbs back to ${start} over about ${RPM.recover || 3} s, slower than it fell.`
            : `Then, slowing in the lower gear, the needle eases back down to ${start} over about ${RPM.recover || 3} s.`}
          The yellow segment is the drop; the green one is where the gear goes in.</p>
      </div>`;
  }
  let tachRun = 0;
  function setTach(dir, rpm, target = rpmTarget(dir)) {
    const num = $('#shrpm'), needle = $('#shneedle');
    if (!num || !needle) return;
    num.textContent = rpm;
    needle.setAttribute('transform', `rotate(${angle(rpm)} ${CX} ${CY})`);
    const on = Math.abs(rpm - target) <= RPM_TOL;
    num.classList.toggle('ok', on);
    needle.classList.toggle('ok', on);
  }
  // Runs the needle from the pause's start; `hold` ms after which it stops
  // updating (Listen), or null to run until stopTach (Tap).
  function animateTach(dir, wait, clamp, hold) {
    const me = ++tachRun;
    const t0 = performance.now();
    const frame = () => {
      if (tachRun !== me) return;
      const el = performance.now() - t0;
      setTach(dir, rpmAt(dir, el, wait, clamp));
      if (hold !== null && el >= hold) return;
      requestAnimationFrame(frame);
    };
    frame();
  }
  const stopTach = () => { tachRun++; };
  // After the gear is in: the needle comes back to the direction's starting
  // rpm over the truck's recover time. Eased out, since the engine pulls
  // hardest right after the shift, and it never comes back as fast as the
  // pause took it away.
  const RECOVER_MS = () => Math.round((RPM.recover || 3) * 1000);
  function recoverTach(dir, from) {
    const me = ++tachRun;
    const t0 = performance.now();
    const to = rpmStart(dir);
    const frame = () => {
      if (tachRun !== me) return;
      const x = Math.min(1, (performance.now() - t0) / RECOVER_MS());
      const f = 1 - (1 - x) * (1 - x);
      setTach(dir, Math.round((from + (to - from) * f) / 10) * 10);
      if (x < 1) requestAnimationFrame(frame);
    };
    frame();
  }
  const waitLabel = (dir, wait) => `${wait.toFixed(1)} s from press to press,
    ${rpmStart(dir)} ${dir === 'up' ? 'down' : 'up'} to ${rpmTarget(dir)} rpm`;
  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Same page-citation link the questions render.
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

  // ---------- gear speeds ----------
  // Per-visit state: the current question and the running score.
  let quiz = null;
  const score = { right: 0, asked: 0, streak: 0 };

  // Three question shapes; the same table answers all of them. `kind` picks
  // the wording, `answer` is the value the right choice carries.
  function nextQuestion(prev) {
    const rows = SHIFTING.gears;
    let q;
    do {
      const row = rows[Math.floor(Math.random() * rows.length)];
      const kind = ['up', 'down', 'speed'][Math.floor(Math.random() * 3)];
      q = { kind, row };
    } while (prev && q.kind === prev.kind && q.row === prev.row && rows.length > 1);
    // Four choices from a window of neighbouring rows, so the distractors
    // are the ones you would actually mix up.
    const i = rows.indexOf(q.row);
    const n = Math.min(4, rows.length);
    const start = Math.max(0, Math.min(rows.length - n, i - Math.floor(Math.random() * n)));
    q.answer = q.kind === 'speed' ? q.row.mph : q.row.gear;
    q.choices = shuffle(rows.slice(start, start + n).map(r => q.kind === 'speed' ? r.mph : r.gear));
    return q;
  }

  function promptHTML(q) {
    const mph = `<strong>${q.row.mph} mph</strong>`;
    if (q.kind === 'up') return `Accelerating, the speedometer reaches ${mph}. Which gear do you shift up into?`;
    if (q.kind === 'down') return `Slowing, the speedometer drops to ${mph}. Which gear do you drop down into?`;
    return `At what road speed do you shift into <strong>${ord(q.row.gear)}</strong>?`;
  }
  const choiceLabel = (q, v) => q.kind === 'speed' ? `${v} mph` : ord(v);

  function explainHTML(q, picked) {
    const rows = SHIFTING.gears;
    const i = rows.indexOf(q.row);
    const below = rows[i - 1], above = rows[i + 1];
    const neighbours = [
      below ? `${ord(below.gear)} at ${below.mph}` : '',
      above ? `${ord(above.gear)} at ${above.mph}` : '',
    ].filter(Boolean).join(', ');
    const right = picked === q.answer;
    const verdict = right ? 'Right.' : `Not ${choiceLabel(q, picked)}.`;
    return `<div class="explain ${right ? 'okbg' : 'wrongbg'}">
      <strong>${verdict}</strong> ${ord(q.row.gear)} is ${q.row.mph} mph${neighbours ? ` (${neighbours})` : ''}.
    </div>`;
  }

  function chartHTML(open) {
    const rows = SHIFTING.gears.map(r => `
      <tr${r.gear === SHIFTING.highRangeFrom ? ' class="shflip"' : ''}>
        <td>${ord(r.gear)}</td><td>${r.mph} mph</td>
        <td>${r.gear === SHIFTING.highRangeFrom ? 'range selector up' : ''}</td>
      </tr>`).join('');
    return `
      <details class="shchart"${open ? ' open' : ''}>
        <summary>Gear chart</summary>
        <div class="table-scroll"><table>
          <thead><tr><th>Gear</th><th>Speed</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p class="shrpmline">Shift up at <strong>${RPM.shift} rpm</strong> · the truck drops
          <strong>${RPM.drop} rpm</strong> per gear · each new gear picks up at
          <strong>${landRpm} rpm</strong></p>
        <div class="shchartpat">
          <p class="hint"><strong>${esc(PAT.name)}</strong> lever pattern, viewed from the seat:
            the top row is toward the dash. Each slot shows its low-range gear, and below or
            above it the gear the same slot gives with the range selector up.</p>
          ${patternSVG()}
          <p class="hint">${esc(PAT.note)}</p>
        </div>
      </details>`;
  }

  function speedsHTML(prefs) {
    if (!quiz) quiz = nextQuestion();
    const q = quiz;
    const answered = 'picked' in q;
    return `
      <p class="hint">The speeds are the ones taught in training for your truck, not numbers the
        manual prints: it says to learn what speed each gear is good for and shift by the
        speedometer (${cite(SHIFTING.page)}). Edit <code>data/shifting.js</code> if your truck differs.</p>
      ${chartHTML(prefs.chart)}
      <div class="tiles shtiles">
        <div class="tile"><div class="big" id="shright">${score.right}</div><div>right</div></div>
        <div class="tile"><div class="big" id="shasked">${score.asked}</div><div>asked</div></div>
        <div class="tile"><div class="big" id="shstreak">${score.streak}</div><div>streak</div></div>
      </div>
      <div class="quiz shq" data-answer="${q.answer}">
        <p class="qtext">${promptHTML(q)}</p>
        <div class="choices">
          ${q.choices.map((v, k) => {
            const cls = answered ? (v === q.answer ? ' correct' : v === q.picked ? ' wrong' : '') : '';
            return `<button class="choice${cls}" data-v="${v}" ${answered ? 'disabled' : ''}>
              <kbd>${k + 1}</kbd>${choiceLabel(q, v)}</button>`;
          }).join('')}
        </div>
        ${answered ? explainHTML(q, q.picked) : ''}
        ${answered ? '<div class="actions"><button class="primary" id="next">Next<kbd class="after">Enter</kbd></button></div>' : ''}
      </div>`;
  }

  function bindSpeeds(prefs) {
    const chart = $('.shchart');
    if (chart) chart.addEventListener('toggle', () => {
      prefs.chart = chart.open;
      savePrefs(prefs);
    });
    view.querySelectorAll('.shq .choice').forEach(b => b.addEventListener('click', () => {
      if ('picked' in quiz) return;
      quiz.picked = Number(b.dataset.v);
      score.asked++;
      if (quiz.picked === quiz.answer) { score.right++; score.streak++; } else score.streak = 0;
      renderShifting();
    }));
    const next = $('#next');
    if (next) next.addEventListener('click', () => {
      quiz = nextQuestion(quiz);
      renderShifting();
    });
  }

  // ---------- double clutch ----------
  let audio = null;
  function click(freq, prefs) {
    if (!prefs.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch { /* no audio on this device */ }
  }
  const TONE = { in: 330, out: 520, gas: 660 };

  // Drive's sound: an engine hum that follows the needle, plus one-shot
  // effects, all synthesized (the app ships no audio files). The hum is a
  // sawtooth through a low-pass, pitched as a six-cylinder four-stroke (three
  // firings per rev), louder under load than coasting. Everything honours the
  // Sound checkbox and starts only from a user gesture.
  const soundOn = () => loadPrefs().sound;
  function ac() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  let engine = null;
  function engineStart() {
    if (engine || !soundOn()) return;
    try {
      const ctx = ac();
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      sub.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      gain.gain.value = 0;
      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain).connect(ctx.destination);
      osc.start();
      sub.start();
      engine = { osc, sub, gain, ctx };
    } catch { engine = null; }
  }
  function engineSet(rpm, load) {
    if (!engine) return;
    const t = engine.ctx.currentTime;
    const hz = rpm / 60 * 3;
    engine.osc.frequency.setTargetAtTime(hz, t, 0.05);
    engine.sub.frequency.setTargetAtTime(hz / 2, t, 0.05);
    engine.gain.gain.setTargetAtTime(!soundOn() ? 0 : load ? 0.10 : 0.05, t, 0.08);
  }
  function engineStop() {
    if (!engine) return;
    const e = engine;
    engine = null;
    try {
      const t = e.ctx.currentTime;
      e.gain.gain.setTargetAtTime(0, t, 0.05);
      e.osc.stop(t + 0.4);
      e.sub.stop(t + 0.4);
    } catch { /* already gone */ }
  }
  function noise(ctx, secs) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * secs), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
  // The gear going home: a short low thump of filtered noise.
  function sfxClunk() {
    if (!soundOn()) return;
    try {
      const ctx = ac(), t = ctx.currentTime;
      const src = noise(ctx, 0.15);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t);
    } catch { /* no audio */ }
  }
  // Teeth not meeting: a ratchety buzz, sawtooth chopped by a fast tremolo
  // under a band of noise.
  function sfxGrind() {
    if (!soundOn()) return;
    try {
      const ctx = ac(), t = ctx.currentTime, dur = 0.45;
      const saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.setValueAtTime(95, t);
      saw.frequency.linearRampToValueAtTime(70, t + dur);
      const src = noise(ctx, dur);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1400;
      band.Q.value = 1.5;
      const trem = ctx.createGain();
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 28;
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(trem.gain);
      trem.gain.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.setValueAtTime(0.35, t + dur - 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      saw.connect(trem);
      src.connect(band).connect(trem);
      trem.connect(g).connect(ctx.destination);
      lfo.start(t); saw.start(t); src.start(t);
      lfo.stop(t + dur); saw.stop(t + dur);
    } catch { /* no audio */ }
  }
  // A refusal that is not a grind (clutch out, nothing in that slot): a dull knock.
  function sfxThud() {
    if (!soundOn()) return;
    try {
      const ctx = ac(), t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.16);
    } catch { /* no audio */ }
  }
  function sfxChime() {
    if (!soundOn()) return;
    [[660, 0], [880, 0.12], [1320, 0.24]].forEach(([hz, dt]) => setTimeout(() => click(hz, { sound: true }), dt * 1000));
  }

  // One Listen run: a token per run so a stale timeout after Stop or a route
  // change does nothing.
  let run = 0;
  let timers = [];
  function stopListen() {
    run++;
    stopTach();
    timers.forEach(clearTimeout);
    timers = [];
    const play = $('#shplay');
    if (play) { play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); }
    view.querySelectorAll('.shstep').forEach(s => s.classList.remove('now'));
    const status = $('#shstatus');
    if (status) status.textContent = '';
  }
  function startListen(prefs) {
    stopListen();
    const me = run;
    const steps = SHIFTING.steps[prefs.dir];
    const els = [...view.querySelectorAll('.shstep')];
    const status = $('#shstatus');
    const play = $('#shplay');
    play.textContent = 'Stop';
    play.setAttribute('aria-pressed', 'true');
    const wait = Math.round(prefs.wait[prefs.dir] * 1000);
    // (delay, step index, tone) for one repeat: the four pedal actions in the
    // manual's order, the second press landing exactly `wait` after the
    // first. The step flagged wait lights up between the strokes, no click.
    const pedals = steps.map((s, i) => s.wait ? null : i).filter(i => i !== null);
    const waitIdx = steps.findIndex(s => s.wait);
    const beats = [
      [0, pedals[0], 'in'], [STROKE_MS, pedals[1], 'out'],
      [wait, pedals[2], 'in'], [wait + STROKE_MS, pedals[3], 'gas'],
    ];
    const total = wait + 2 * STROKE_MS;
    const at = (ms, fn) => timers.push(setTimeout(() => { if (run === me && view.contains(play)) fn(); }, ms));
    let rep = 0;
    const cycle = () => {
      rep++;
      if (status) status.textContent = `Repeat ${rep}`;
      // The needle leaves the shift point at the first press and reaches the
      // target as the gear goes in; from the gas it climbs back to the shift
      // point, and the next rep starts once it is there.
      at(0, () => animateTach(prefs.dir, wait, true, wait + STROKE_MS));
      at(total, () => recoverTach(prefs.dir, rpmTarget(prefs.dir)));
      beats.forEach(([ms, i, tone]) => at(ms, () => {
        els.forEach(e => e.classList.remove('now'));
        els[i].classList.add('now');
        if (waitIdx >= 0 && i === pedals[1]) at(STROKE_MS / 2, () => {
          els.forEach(e => e.classList.remove('now'));
          els[waitIdx].classList.add('now');
        });
        click(TONE[tone], prefs);
      }));
      at(total + 400, () => els.forEach(e => e.classList.remove('now')));
      at(total + RECOVER_MS() + REP_GAP_MS, cycle);
    };
    cycle();
  }

  // Tap: two presses, the pause between them against the target.
  let tap = { first: null, timer: null, history: { up: [], down: [] } };
  function onTap(prefs) {
    const now = performance.now();
    const target = prefs.wait[prefs.dir] * 1000;
    const status = $('#shtapstatus');
    const btn = $('#shtap');
    if (tap.first === null) {
      tap.first = now;
      click(TONE.in, prefs);
      if (status) status.textContent = prefs.dir === 'up'
        ? 'Neutral, clutch out… let the rpm fall…'
        : 'Neutral, clutch out… bring the rpm up…';
      btn.classList.add('armed');
      animateTach(prefs.dir, target, false, null);
      tap.timer = setTimeout(() => {
        tap.first = null;
        btn.classList.remove('armed');
        stopTach();
        setTach(prefs.dir, rpmStart(prefs.dir));
        if (status) status.textContent = 'Too long in neutral. Start again from the first press.';
      }, TAP_TIMEOUT_MS);
      return;
    }
    clearTimeout(tap.timer);
    const elapsed = now - tap.first;
    const dev = Math.round(elapsed - target);
    const rpm = rpmAt(prefs.dir, elapsed, target, false);
    tap.first = null;
    btn.classList.remove('armed');
    stopTach();
    setTach(prefs.dir, rpm);
    recoverTach(prefs.dir, rpm);
    click(TONE.in, prefs);
    const hist = tap.history[prefs.dir];
    hist.unshift({ dev, rpm });
    if (hist.length > HISTORY) hist.length = HISTORY;
    if (status) status.textContent = 'Clutch out, on the gas. Press again to start another.';
    renderTapResult(prefs);
  }
  function verdict(dev) {
    if (Math.abs(dev) <= ON_TIME_MS) return { cls: 'ok', text: 'on time' };
    return { cls: 'bad', text: `${secs(Math.abs(dev))} ${dev < 0 ? 'early' : 'late'}` };
  }
  function tapResultHTML(prefs) {
    const hist = tap.history[prefs.dir];
    if (!hist.length) return '<p class="hint">Nothing timed yet for this direction.</p>';
    const target = prefs.wait[prefs.dir] * 1000;
    const { dev, rpm } = hist[0];
    const v = verdict(dev);
    // Deviation on a ±1 s scale around the target mark at centre.
    const pos = 50 + Math.max(-50, Math.min(50, dev / 20));
    const onTime = hist.filter(h => Math.abs(h.dev) <= ON_TIME_MS).length;
    const mean = Math.round(hist.reduce((a, h) => a + h.dev, 0) / hist.length);
    return `
      <p class="shresult ${v.cls}"><strong>${secs(target + dev)}</strong> · ${v.text}
        · gear went in at <strong>${rpm} rpm</strong>
        <span class="hint">(target ${secs(target)}, ${rpmTarget(prefs.dir)} rpm)</span></p>
      <div class="shmeter" aria-hidden="true">
        <span class="target"></span><span class="mark ${v.cls}" style="left:${pos}%"></span>
        <em class="early">early</em><em class="late">late</em>
      </div>
      <p class="hint">Last ${hist.length}: ${onTime} on time, averaging
        ${mean === 0 ? 'dead on' : `${secs(Math.abs(mean))} ${mean < 0 ? 'early' : 'late'}`}.
        <button class="btn shreset" id="shreset">Clear</button></p>`;
  }
  function renderTapResult(prefs) {
    const box = $('#shtapresult');
    if (!box) return;
    box.innerHTML = tapResultHTML(prefs);
    const reset = $('#shreset');
    if (reset) reset.addEventListener('click', () => {
      tap.history[prefs.dir] = [];
      renderTapResult(prefs);
    });
  }

  function clutchHTML(prefs) {
    const dir = prefs.dir;
    const steps = SHIFTING.steps[dir];
    const wait = prefs.wait[dir];
    return `
      <p class="hint">Most heavy trucks need double clutching: clutch in and to neutral, clutch out,
        a pause while the engine finds the rpm the next gear wants, then clutch in and into gear.
        The pause is the part that takes practice (${cite(SHIFTING.page)}). Set the pause your
        instructor teaches, listen until the rhythm sticks, then tap it from memory.</p>
      <div class="shbar">
        <div class="shmodes" role="group" aria-label="Direction">
          <button class="btn${dir === 'up' ? ' primary' : ''}" data-dir="up" aria-pressed="${dir === 'up'}">Upshift</button>
          <button class="btn${dir === 'down' ? ' primary' : ''}" data-dir="down" aria-pressed="${dir === 'down'}">Downshift</button>
        </div>
        <label class="shwait">Pause between clutch presses
          <input type="range" id="shwait" min="0.3" max="2.5" step="0.1" value="${wait}"
            aria-valuetext="${wait.toFixed(1)} seconds">
          <output for="shwait" id="shwaitout">${wait.toFixed(1)} s</output>
        </label>
        <label class="shsound"><input type="checkbox" id="shsound" ${prefs.sound ? 'checked' : ''}> Sound</label>
      </div>
      <ol class="shsteps">
        ${steps.map(s => `<li class="shstep${s.wait ? ' wait' : ''}${s.pedal ? ` pedal-${s.pedal}` : ''}">
          ${esc(s.do)}${s.wait ? ` <span class="shwaitlen">${waitLabel(dir, wait)}</span>` : ''}</li>`).join('')}
      </ol>
      <div class="shmodes shsub" role="group" aria-label="Practice">
        <button class="btn${prefs.sub === 'listen' ? ' primary' : ''}" data-sub="listen" aria-pressed="${prefs.sub === 'listen'}">Listen</button>
        <button class="btn${prefs.sub === 'tap' ? ' primary' : ''}" data-sub="tap" aria-pressed="${prefs.sub === 'tap'}">Tap</button>
        <button class="btn${prefs.sub === 'drive' ? ' primary' : ''}" data-sub="drive" aria-pressed="${prefs.sub === 'drive'}">Drive</button>
      </div>
      ${prefs.sub === 'drive' ? driveHTML(prefs) : prefs.sub === 'listen' ? `
        <div class="shlisten">
          <button class="btn primary" id="shplay" aria-pressed="false">Play</button>
          <span class="hint" id="shstatus"></span>
          ${tachHTML(dir)}
          <p class="hint">Each click is a pedal action: low for the clutch going in, higher coming out,
            highest when you are back on the gas. Follow along with your left foot and watch the
            needle.</p>
        </div>` : `
        <div class="shtapbox">
          <button class="shtapbtn" id="shtap">Clutch<kbd class="after">Space</kbd></button>
          ${tachHTML(dir)}
          <p class="hint" id="shtapstatus">Press once for the clutch going in to neutral, again for the clutch going in to the gear.</p>
          <div id="shtapresult">${tapResultHTML(prefs)}</div>
        </div>`}
      ${SHIFTING.missNote ? `<p class="hint shmiss">${esc(SHIFTING.missNote)}</p>` : ''}`;
  }

  function bindClutch(prefs) {
    view.querySelectorAll('button[data-dir]').forEach(b => b.addEventListener('click', () => {
      prefs.dir = b.dataset.dir;
      savePrefs(prefs);
      renderShifting();
    }));
    view.querySelectorAll('button[data-sub]').forEach(b => b.addEventListener('click', () => {
      prefs.sub = b.dataset.sub;
      savePrefs(prefs);
      renderShifting();
    }));
    const slider = $('#shwait');
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      prefs.wait[prefs.dir] = v;
      savePrefs(prefs);
      slider.setAttribute('aria-valuetext', `${v.toFixed(1)} seconds`);
      $('#shwaitout').textContent = `${v.toFixed(1)} s`;
      const len = $('.shwaitlen');
      if (len) len.textContent = waitLabel(prefs.dir, v);
      // A running cadence picks up the new pause on its next repeat.
      if ($('#shplay') && $('#shplay').textContent === 'Stop') startListen(prefs);
    });
    $('#shsound').addEventListener('change', e => {
      prefs.sound = e.target.checked;
      savePrefs(prefs);
      if (!prefs.sound) engineStop();
    });
    const play = $('#shplay');
    if (play) play.addEventListener('click', () => {
      if (play.textContent === 'Stop') stopListen(); else startListen(prefs);
    });
    const tapBtn = $('#shtap');
    if (tapBtn) {
      tapBtn.addEventListener('click', () => { tapBtn.blur(); onTap(prefs); });
      renderTapResult(prefs);
    }
    if ($('#shdrive')) bindDrive(prefs);
  }

  // ---------- drive: the whole shift by hand ----------
  // A run up through the gears in the table. Space (or the pedal button)
  // held is the clutch in; the stick drags on the H, or moves with the
  // arrow keys; G held blips the gas; R flips the range. The engine falls at
  // the upshift pause's rate whenever it is not driving the wheels, and the
  // truck coasts a little while it is in neutral, so the road rpm the next
  // gear wants is worked out from where you clutched in, not a fixed number.
  // A gear only goes in when the engine is near that rpm; further off it
  // grinds and the stick bounces back to neutral. The clutch coming out in
  // gear is graded on the mismatch at that moment, and the pull to the next
  // shift point is the recover time. Road speed is the state: each gear's rpm
  // per mph comes from the table, so a gear comes in at its listed speed.
  const IDLE = 600, GOVERNOR = 2100, COAST_MPH = 0.6, GAS_RATE = 900;
  const SMOOTH = 60, ROUGH = 150, SLOT_REACH = 24;
  const SPEEDO_MAX = 80;
  let grindRpm = GRIND; // the live setting; the Drive slider adjusts it
  const runGears = SHIFTING.gears.map(g => g.gear);
  const gearIdx = g => runGears.indexOf(g);
  // The table is the truth about the truck: each gear comes in at its listed
  // speed with the needle on the landing rpm, which fixes the gear's rpm per
  // mph. Gears below the table are extrapolated from its first two rows.
  function mphOf(gear) {
    const row = SHIFTING.gears.find(g => g.gear === gear);
    if (row) return row.mph;
    const [a, b] = SHIFTING.gears;
    return a.mph * Math.pow(a.mph / b.mph, a.gear - gear);
  }
  const rpmPerMph = gear => landRpm / mphOf(gear);
  const speedFmt = v => (v < 20 ? v.toFixed(1) : Math.round(v));
  let drive = null;
  let driveRun = 0;
  const stopDrive = () => { driveRun++; engineStop(); };
  const slotPoint = slot => ({ x: COLX[slot.col], y: ROWY[slot.row] });
  const nearestCol = x => COLX.reduce((best, cx, i) => (Math.abs(cx - x) < Math.abs(COLX[best] - x) ? i : best), 0);

  // Up: start in the lowest gear at the landing rpm and pull up through the
  // table. Down: start in the top gear at the shift point, slow, and drop a
  // gear each time the needle falls to the landing rpm, which is where that
  // gear came in, so the drop happens at the gear's own table speed. The
  // lower gear then wants more revs at that speed, and the blip on the gas
  // supplies them, as the manual's downshift steps say.
  function newDrive(dir) {
    const up = dir === 'up';
    const g0 = up ? runGears[0] : runGears[runGears.length - 1];
    const n = up ? runGears[1] : runGears[runGears.length - 2];
    const rpm0 = up ? landRpm : RPM.shift;
    return {
      dir, gear: g0, fromGear: g0, stick: slotPoint(findSlot(g0)), clutch: false, gas: false,
      range: gearRange(g0), rpm: rpm0, mph: rpm0 / rpmPerMph(g0), clutchInRpm: null, clutchInMph: null,
      msg: up
        ? `Rolling in ${ord(g0)}. ${ord(n)} comes in at ${mphOf(n)} mph, about ${RPM.shift} on the tach: clutch in, neutral, clutch out, wait, clutch in, gear, clutch out.`
        : `Slowing in ${ord(g0)}. Drop to ${ord(n)} when the needle falls to ${landRpm}, at ${mphOf(g0)} mph: clutch in, neutral, clutch out, blip the gas up to what ${ord(n)} wants, clutch in, gear, clutch out.`,
      log: [], grinds: 0, done: false, dragging: false, viaBar: false,
    };
  }
  const roadRpm = (s, gear) => Math.round(rpmPerMph(gear) * s.mph);
  const nextGear = s => runGears[gearIdx(s.fromGear) + (s.dir === 'up' ? 1 : -1)] || null;
  const lastGear = s => (s.dir === 'up' ? runGears[runGears.length - 1] : runGears[0]);

  function driveStep(dt, prefs) {
    const s = drive;
    if (!s || s.done) return;
    const fallRate = RPM.drop / prefs.wait.up;
    const accelRate = RPM.drop / (RPM.recover || 3);
    if (s.gear !== null && !s.clutch) {
      s.rpm = s.dir === 'up' ? Math.min(GOVERNOR, s.rpm + accelRate * dt)
        : Math.max(IDLE, s.rpm - accelRate * dt);
      s.mph = s.rpm / rpmPerMph(s.gear);
    } else {
      s.mph = Math.max(0, s.mph - COAST_MPH * dt);
      s.rpm = s.gas ? Math.min(GOVERNOR, s.rpm + GAS_RATE * dt)
        : Math.max(IDLE, s.rpm - fallRate * dt);
    }
    s.rpm = Math.round(s.rpm);
  }

  function driveClutch(down) {
    const s = drive;
    if (!s || s.done || s.clutch === down) return;
    s.clutch = down;
    engineStart();
    click(down ? TONE.in : TONE.out, { sound: soundOn() });
    if (down) {
      if (s.gear !== null) {
        s.clutchInRpm = s.rpm;
        s.clutchInMph = s.mph;
        s.fromGear = s.gear;
        const point = s.dir === 'up' ? RPM.shift : landRpm;
        const off = s.rpm - point;
        s.msg = `Clutch in at ${s.rpm} and ${speedFmt(s.mph)} mph` + (Math.abs(off) <= RPM_TOL ? '. Pull it to neutral.'
          : off > 0 ? `, ${off} ${s.dir === 'up' ? 'past the shift point' : 'above the drop point, early'}. Pull it to neutral.`
            : `, ${-off} ${s.dir === 'up' ? 'under the shift point' : 'below the drop point, lugging'}. Pull it to neutral.`);
      } else s.msg = 'Clutch in. Put it in gear when the needle is there.';
      return;
    }
    if (s.gear === null) {
      const n = nextGear(s);
      s.msg = !n ? 'Clutch out in neutral.'
        : s.dir === 'up' ? `Clutch out in neutral. The needle is falling; ${ord(n)} wants about ${roadRpm(s, n)} at this speed.`
          : `Clutch out in neutral. Blip the gas; ${ord(n)} wants about ${roadRpm(s, n)} at this speed.`;
      return;
    }
    // Clutch coming out in gear: the moment that is graded.
    const road = roadRpm(s, s.gear);
    const diff = s.rpm - road;
    const verdict = Math.abs(diff) <= SMOOTH ? ['ok', 'smooth']
      : Math.abs(diff) <= ROUGH ? ['warn', diff > 0 ? 'a touch early' : 'a touch late']
        : ['bad', diff > 0 ? 'jerked it, early' : 'jerked it, late'];
    if (s.fromGear !== s.gear) {
      s.log.unshift({ from: s.fromGear, to: s.gear, mph: s.clutchInMph, clutchIn: s.clutchInRpm, engaged: s.rpm, road, diff, cls: verdict[0], text: verdict[1] });
    }
    s.rpm = road;
    s.fromGear = s.gear;
    if (verdict[0] === 'bad') sfxThud();
    if (s.gear === lastGear(s)) {
      s.done = true;
      s.msg = `${s.dir === 'up' ? 'Top gear' : `Down to ${ord(s.gear)}`}, ${verdict[1]}. Run complete.`;
      sfxChime();
    } else {
      s.msg = s.dir === 'up'
        ? `In ${ord(s.gear)}, ${verdict[1]}. On the gas; ${ord(nextGear(s))} comes in at ${mphOf(nextGear(s))} mph.`
        : `In ${ord(s.gear)}, ${verdict[1]}. Keep slowing; drop to ${ord(nextGear(s))} when the needle falls to ${landRpm}.`;
    }
  }

  function driveEngage(slot) {
    const s = drive;
    const bounce = (why, grind) => {
      s.msg = why;
      s.gear = null;
      s.stick = { x: COLX[slot.col], y: NY };
      s.grinds++;
      if (grind) sfxGrind(); else sfxThud();
    };
    if (!s.clutch) return bounce('Clutch in before you put it in gear.');
    const gear = slotGear(slot, s.range);
    if (gear === null) return bounce(`Nothing in that slot with the range ${s.range}.`);
    if (gear === 'R') return bounce('You are rolling forward; reverse will not go in.');
    const road = roadRpm(s, gear);
    const diff = s.rpm - road;
    if (Math.abs(diff) > grindRpm) {
      return bounce(diff > 0
        ? `Grind. ${ord(gear)} wants about ${road} and the engine is at ${s.rpm}: too high, let the needle fall.`
        : `Grind. ${ord(gear)} wants about ${road} and the engine is at ${s.rpm}: too low, blip the gas to bring it up.`,
      true);
    }
    s.gear = gear;
    s.stick = slotPoint(slot);
    sfxClunk();
    s.msg = `In ${ord(gear)} at ${s.rpm}. Let the clutch out.`;
  }

  // Drag: the stick follows the pointer along the H. In gear with the clutch
  // out it is locked; with the clutch out it stays on the neutral bar. The
  // gear is asked for the moment the stick reaches a slot, not on release:
  // the natural move is to push it in and let the clutch out while the
  // hand is still on the stick. Reaching a slot ends the drag either way, so
  // the stick stays put (in gear, or bounced to neutral) until it is grabbed
  // again.
  function driveMove(x, y) {
    const s = drive;
    if (!s || s.done) return;
    x = Math.max(COLX[0], Math.min(COLX[2], x));
    y = Math.max(ROWY[0], Math.min(ROWY[1], y));
    if (s.gear !== null && !s.clutch) { s.msg = 'Clutch in before you move the stick.'; return; }
    if (!s.clutch) y = NY;
    if (Math.abs(y - NY) < 16) { s.stick = { x, y: NY }; s.viaBar = true; }
    else s.stick = { x: COLX[nearestCol(x)], y };
    if (s.gear !== null && Math.abs(s.stick.y - slotPoint(findSlot(s.gear)).y) > 6) {
      s.gear = null;
      s.viaBar = false; // the slot just left is not re-entered on the way out
      s.msg = 'Neutral. Let the clutch out and wait for the needle.';
    }
    if (s.gear !== null || !s.viaBar) return;
    const row = s.stick.y <= ROWY[0] + SLOT_REACH ? 0 : s.stick.y >= ROWY[1] - SLOT_REACH ? 1 : null;
    if (row === null) return;
    const slot = PAT.slots.find(sl => sl.col === nearestCol(s.stick.x) && sl.row === row);
    s.stick = slotPoint(slot);
    s.viaBar = false;
    driveEngage(slot);
    s.dragging = false;
  }
  function driveRelease() {
    const s = drive;
    if (!s || s.done || s.gear !== null) return;
    s.stick = { x: COLX[nearestCol(s.stick.x)], y: NY };
  }
  // Arrow keys: along the bar in neutral, into a slot from the bar, back to
  // the bar from a slot.
  function driveArrow(key) {
    const s = drive;
    if (!s || s.done) return;
    const col = nearestCol(s.stick.x);
    if (s.gear !== null) {
      if (!s.clutch) { s.msg = 'Clutch in before you move the stick.'; return; }
      const row = findSlot(s.gear).row;
      if ((row === 0 && key === 'ArrowDown') || (row === 1 && key === 'ArrowUp')) {
        s.gear = null;
        s.stick = { x: COLX[col], y: NY };
        s.msg = 'Neutral. Let the clutch out and wait for the needle.';
      }
      return;
    }
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      s.stick = { x: COLX[Math.max(0, Math.min(2, col + (key === 'ArrowLeft' ? -1 : 1)))], y: NY };
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      const slot = PAT.slots.find(sl => sl.col === col && sl.row === (key === 'ArrowUp' ? 0 : 1));
      s.stick = slotPoint(slot);
      driveEngage(slot);
    }
  }
  function driveRange() {
    const s = drive;
    if (!s || s.done) return;
    s.range = s.range === 'low' ? 'high' : 'low';
    s.msg = `Range selector ${s.range === 'high' ? 'up' : 'down'}.`;
  }

  // The speedometer: same face as the tach, 0 to SPEEDO_MAX mph, with a
  // green band on the speed the next gear comes in at (moved as you go).
  const speedAngle = v => -SWEEP / 2 + Math.max(0, Math.min(SPEEDO_MAX, v)) / SPEEDO_MAX * SWEEP;
  function speedoSVG(mph, nextMph) {
    const ticks = [];
    for (let v = 0; v <= SPEEDO_MAX; v += 5) {
      const major = v % 10 === 0;
      const a = speedAngle(v);
      ticks.push(`<line class="${major ? 'major' : 'minor'}" x1="${pt(R, a).replace(',', '" y1="')}" x2="${pt(R - (major ? 12 : 6), a).replace(',', '" y2="')}"/>`);
      if (major && v % 20 === 0) ticks.push(`<text class="label" x="${pt(R - 24, a).replace(',', '" y="')}">${v}</text>`);
    }
    return `
      <svg class="shdial shspeedo" viewBox="0 0 200 172" aria-hidden="true">
        <circle class="face" cx="${CX}" cy="${CY}" r="96"/>
        <path class="track" d="${arcAt(R, speedAngle(0), speedAngle(SPEEDO_MAX))}"/>
        <path class="band" id="shspband" d="${nextMph === null ? '' : arcAt(R, speedAngle(nextMph - 1.5), speedAngle(nextMph + 1.5))}"/>
        ${ticks.join('')}
        <text class="unit" x="${CX}" y="${CY + 36}">mph</text>
        <g id="shspneedle" transform="rotate(${speedAngle(mph)} ${CX} ${CY})">
          <polygon points="${CX},22 ${CX - 3.5},${CY} ${CX + 3.5},${CY}"/>
          <polygon class="tail" points="${CX - 3.5},${CY} ${CX + 3.5},${CY} ${CX},${CY + 16}"/>
        </g>
        <circle class="hub" cx="${CX}" cy="${CY}" r="6"/>
        <text class="readout" id="shmph" x="${CX}" y="${CY + 62}">${speedFmt(mph)}</text>
      </svg>`;
  }
  let bandFor = null;
  function setSpeedo(s) {
    const num = $('#shmph'), needle = $('#shspneedle'), band = $('#shspband');
    if (!num || !needle) return;
    num.textContent = speedFmt(s.mph);
    needle.setAttribute('transform', `rotate(${speedAngle(s.mph)} ${CX} ${CY})`);
    const n = nextGear(s);
    const want = n === null ? null : s.dir === 'up' ? mphOf(n) : mphOf(s.fromGear);
    if (band && bandFor !== want) {
      bandFor = want;
      band.setAttribute('d', want === null ? '' : arcAt(R, speedAngle(want - 1.5), speedAngle(want + 1.5)));
    }
    const on = want !== null && Math.abs(s.mph - want) <= 1.5 && s.gear === null;
    num.classList.toggle('ok', on);
    needle.classList.toggle('ok', on);
  }

  function driveHTML(prefs) {
    grindRpm = prefs.grind;
    if (!drive || drive.dir !== prefs.dir) drive = newDrive(prefs.dir);
    const s = drive;
    const lo = runGears[0], hi = runGears[runGears.length - 1];
    return `
      <div class="shdrive" id="shdrive">
        <p class="hint">${s.dir === 'up'
          ? `The whole shift, by hand, from ${ord(lo)} up to ${ord(hi)}. The speedometer is the truck: each gear comes in
             at the speed in your table, so the tach follows from the speed and the gear, and the drop varies a little
             from gear to gear around ${RPM.drop}.`
          : `The whole shift, by hand, from ${ord(hi)} down to ${ord(lo)}, slowing the whole way. Drop a gear when the
             needle falls to ${landRpm}, which is the speed that gear came in at; the lower gear wants more revs at that
             speed, and the blip on the gas supplies them. Upshift and Downshift above pick the run.`}
          Hold <strong>Space</strong> (or the pedal) for the clutch, drag the stick or use the arrow keys,
          hold <strong>G</strong> to blip the gas, <strong>R</strong> flips the range. A gear only goes in
          when the needle is near what that gear wants; the clutch coming out is graded on the match.
          With Sound on you hear the engine follow the needle, the clutch, the gear going home, and a grind
          when it does not.</p>
        <div class="shdrivelay">
          <div class="shdrivetach">${dialSVG(s.dir)}</div>
          <div class="shdrivetach">${speedoSVG(s.mph, nextGear(s) === null ? null : mphOf(nextGear(s)))}</div>
          <div class="shstickbox">
            ${patternSVG({ range: s.range, at: s.gear })}
            <div class="shpedals">
              <button class="shpedal${s.clutch ? ' down' : ''}" id="shclutchbtn" aria-pressed="${s.clutch}">Clutch<kbd class="after">Space</kbd></button>
              <button class="shpedal${s.gas ? ' down' : ''}" id="shgasbtn" aria-pressed="${s.gas}">Gas<kbd class="after">G</kbd></button>
              <button class="btn" id="shrangebtn">Range: ${s.range === 'high' ? 'High' : 'Low'}<kbd class="after">R</kbd></button>
            </div>
            <label class="shwait shgrind">Gear goes in within
              <input type="range" id="shgrind" min="100" max="800" step="50" value="${grindRpm}"
                aria-valuetext="${grindRpm} rpm">
              <output for="shgrind" id="shgrindout">±${grindRpm} rpm</output>
            </label>
          </div>
        </div>
        <p class="shdrivestate" id="shstate"></p>
        <p class="shdrivemsg" id="shmsg">${esc(s.msg)}</p>
        <ol class="shlog" id="shlog"></ol>
        <div class="actions"><button class="btn" id="shrestart">Start over</button></div>
      </div>`;
  }

  function driveStateText(s) {
    if (s.done) return `Run complete: ${s.log.length} shifts, ${s.grinds} grind${s.grinds === 1 ? '' : 's'}.`;
    const n = nextGear(s);
    if (s.gear !== null && !s.clutch) {
      if (s.dir === 'up') {
        const cue = n === null ? '' : s.mph >= mphOf(n) - 0.5 ? ` Shift now, ${ord(n)} comes in at ${mphOf(n)}.`
          : ` ${ord(n)} comes in at ${mphOf(n)}.`;
        return `In ${ord(s.gear)}, accelerating, ${speedFmt(s.mph)} mph.` + cue;
      }
      const cue = n === null ? '' : s.rpm <= landRpm + RPM_TOL ? ` Drop to ${ord(n)} now.`
        : ` Drop to ${ord(n)} at ${landRpm}, ${mphOf(s.gear)} mph.`;
      return `In ${ord(s.gear)}, slowing, ${speedFmt(s.mph)} mph.` + cue;
    }
    if (s.gear !== null) return `Clutch in, still in ${ord(s.gear)}, ${speedFmt(s.mph)} mph.`;
    const want = n ? `${speedFmt(s.mph)} mph, ${ord(n)} wants about ${roadRpm(s, n)}` : `${speedFmt(s.mph)} mph`;
    const blip = n && s.dir === 'down' && !s.clutch && s.rpm < roadRpm(s, n) - SMOOTH ? ' Blip the gas.' : '';
    return (s.clutch ? 'Clutch in, neutral. ' : 'Neutral, clutch out. ') + want + '.' + blip;
  }
  function driveLogHTML(s) {
    return s.log.map(e => `<li class="${e.cls}">${ord(e.from)} to ${ord(e.to)} at ${speedFmt(e.mph)} mph
      (${s.dir === 'up' ? `table says ${mphOf(e.to)}` : `drop point ${mphOf(e.from)}`}): clutch in at ${e.clutchIn},
      gear in at ${e.engaged} against ${e.road} wanted, <strong>${e.text}</strong>.</li>`).join('');
  }
  function drivePaint() {
    const s = drive;
    const box = $('#shdrive');
    if (!s || !box) return;
    const n = nextGear(s);
    const point = s.dir === 'up' ? RPM.shift : landRpm;
    const target = s.gear !== null && !s.clutch ? point : n ? roadRpm(s, n) : point;
    setTach(s.dir, s.rpm, target);
    setSpeedo(s);
    engineSet(s.rpm, !s.done && ((s.gear !== null && !s.clutch && s.dir === 'up') || s.gas));
    const knob = $('#shknob');
    if (knob) knob.style.transform = `translate(${s.stick.x}px,${s.stick.y}px)`;
    const svg = box.querySelector('.shpattern');
    if (svg) {
      svg.classList.toggle('high', s.range === 'high');
      svg.classList.toggle('low', s.range === 'low');
      svg.querySelectorAll('.slot .low').forEach(t => t.classList.toggle('on', s.range === 'low'));
      svg.querySelectorAll('.slot .high').forEach(t => t.classList.toggle('on', s.range === 'high'));
      const kt = svg.querySelector('.knob text');
      if (kt) kt.textContent = s.range === 'high' ? 'HI' : 'LO';
    }
    $('#shclutchbtn').classList.toggle('down', s.clutch);
    $('#shclutchbtn').setAttribute('aria-pressed', s.clutch);
    $('#shgasbtn').classList.toggle('down', s.gas);
    $('#shgasbtn').setAttribute('aria-pressed', s.gas);
    $('#shrangebtn').firstChild.textContent = `Range: ${s.range === 'high' ? 'High' : 'Low'}`;
    $('#shstate').textContent = driveStateText(s);
    $('#shmsg').textContent = s.msg;
    const log = $('#shlog');
    const html = driveLogHTML(s);
    if (log.innerHTML !== html) log.innerHTML = html;
  }

  function bindDrive(prefs) {
    const box = $('#shdrive');
    const svg = box.querySelector('.shpattern');
    svg.classList.add('drive');
    const toSVG = e => {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    };
    svg.addEventListener('pointerdown', e => {
      if (!drive || drive.done) return;
      e.preventDefault();
      engineStart();
      try { svg.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      drive.dragging = true;
      driveMove(...toSVG(e));
    });
    svg.addEventListener('pointermove', e => {
      if (drive && drive.dragging) driveMove(...toSVG(e));
    });
    const endDrag = () => {
      if (!drive || !drive.dragging) return;
      drive.dragging = false;
      driveRelease();
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    const hold = (btn, on) => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        on(true);
      });
      const off = () => on(false);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('lostpointercapture', off);
      btn.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    };
    hold($('#shclutchbtn'), driveClutch);
    hold($('#shgasbtn'), down => { if (drive) { drive.gas = down; engineStart(); } });
    $('#shrangebtn').addEventListener('click', driveRange);
    const grind = $('#shgrind');
    grind.addEventListener('input', () => {
      grindRpm = Number(grind.value);
      prefs.grind = grindRpm;
      savePrefs(prefs);
      grind.setAttribute('aria-valuetext', `${grindRpm} rpm`);
      $('#shgrindout').textContent = `±${grindRpm} rpm`;
    });
    $('#shrestart').addEventListener('click', () => {
      drive = newDrive(prefs.dir);
      renderShifting();
    });
    // The loop: physics on real elapsed time, then paint.
    const me = ++driveRun;
    let last = performance.now();
    const frame = now => {
      if (driveRun !== me || !view.contains(box)) return;
      driveStep(Math.min(0.1, (now - last) / 1000), prefs);
      last = now;
      drivePaint();
      requestAnimationFrame(frame);
    };
    drivePaint();
    requestAnimationFrame(frame);
  }
  // For the browser suite: advance the simulation by hand.
  self.SHIFTING_DRIVE = {
    step: seconds => { driveStep(seconds, loadPrefs()); drivePaint(); },
    state: () => drive,
    audio: () => ({ context: audio ? audio.state : null, engine: !!engine }),
    wants: gear => (drive ? roadRpm(drive, gear) : null),
  };

  // Space taps when the Tap drill is on screen. Blurring a focused tap button
  // first keeps the browser's own Space-activates-button from firing a second
  // tap on keyup.
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    if (view && view.querySelector('#shdrive')) {
      const k = e.key;
      const keys = [' ', 'g', 'G', 'r', 'R', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!keys.includes(k)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (tag === 'BUTTON') document.activeElement.blur();
      if (k === ' ') driveClutch(true);
      else if (k === 'g' || k === 'G') { if (drive) { drive.gas = true; engineStart(); } }
      else if (k === 'r' || k === 'R') driveRange();
      else driveArrow(k);
      drivePaint();
      return;
    }
    if (e.key !== ' ') return;
    const tapBtn = view && view.querySelector('#shtap');
    if (!tapBtn) return;
    e.preventDefault();
    if (document.activeElement === tapBtn) tapBtn.blur();
    onTap(loadPrefs());
  });
  document.addEventListener('keyup', e => {
    if (!(view && view.querySelector('#shdrive'))) return;
    if (e.key === ' ') driveClutch(false);
    else if (e.key === 'g' || e.key === 'G') { if (drive) drive.gas = false; }
    else return;
    drivePaint();
  });


  // ---------- shift pattern ----------
  const PAT = SHIFTING.pattern;
  const COLX = [50, 120, 190], ROWY = [40, 160], NY = 100; // H geometry in the SVG
  const slotGear = (slot, range) => (range === 'high' ? slot.high : slot.low);
  const gearRange = g => (g !== 'R' && g >= SHIFTING.highRangeFrom ? 'high' : 'low');
  const findSlot = g => PAT.slots.find(s => s.low === g || s.high === g);
  const slotWhere = s => `${s.row ? 'bottom' : 'top'} ${['left', 'middle', 'right'][s.col]}`;
  const gearName = g => (g === 'R' ? 'reverse' : ord(g));
  const topGear = Math.max(...PAT.slots.map(s => (typeof s.high === 'number' ? s.high : 0)));

  // The H pattern. `range` is the selector's state (which number reads
  // large at each slot and what the knob says); `at` the gear the lever sits
  // in, null for neutral; `live` makes the slots tappable; `mark` colours a
  // slot correct or wrong after an answer.
  function patternSVG({ range = 'low', at = null, live = false, mark = {} } = {}) {
    const gates = COLX.map(x =>
      `<line class="gate" x1="${x}" y1="${ROWY[0]}" x2="${x}" y2="${ROWY[1]}"/>`).join('');
    const slots = PAT.slots.map((s, i) => {
      const x = COLX[s.col], y = ROWY[s.row];
      const out = s.row ? 1 : -1; // high-range label sits away from the neutral bar
      return `<g class="slot${mark[i] ? ` ${mark[i]}` : ''}" data-slot="${i}"
          ${live ? `role="button" tabindex="0" aria-label="${slotWhere(s)} slot"` : ''}>
        <circle class="pad" cx="${x}" cy="${y}" r="17"/>
        <text class="low${range === 'low' ? ' on' : ''}" x="${x}" y="${y}">${s.low}</text>
        ${s.high !== null
          ? `<text class="high${range === 'high' ? ' on' : ''}" x="${x}" y="${y + out * 31}">${s.high}</text>` : ''}
      </g>`;
    }).join('');
    const slot = at !== null ? findSlot(at) : null;
    const pos = slot ? [COLX[slot.col], ROWY[slot.row]] : [COLX[1], NY];
    return `
      <svg class="shpattern ${range}" viewBox="0 0 240 200" role="img"
          aria-label="${esc(PAT.name)} shift pattern">
        <line class="gate" x1="${COLX[0]}" y1="${NY}" x2="${COLX[2]}" y2="${NY}"/>
        ${gates}${slots}
        <g class="knob" id="shknob" style="transform:translate(${pos[0]}px,${pos[1]}px)">
          <circle r="14"/><text>${range === 'high' ? 'HI' : 'LO'}</text>
        </g>
      </svg>`;
  }

  // The drill: from one gear to the next (or from neutral into 1st or
  // reverse), set the range selector and tap the slot. The lever starts in
  // the current gear with the selector where that gear left it, so the
  // 5th-to-6th flip has to be made on purpose.
  let pat = null;
  const pscore = { right: 0, asked: 0, streak: 0 };
  function nextMove(prev) {
    let m;
    do {
      const r = Math.random();
      if (r < 0.15) m = { cur: null, target: Math.random() < 0.7 ? 1 : 'R' };
      else {
        const cur = 1 + Math.floor(Math.random() * topGear);
        const up = cur === 1 ? true : cur === topGear ? false : Math.random() < 0.65;
        m = { cur, target: up ? cur + 1 : cur - 1 };
      }
    } while (prev && m.cur === prev.cur && m.target === prev.target);
    m.range = m.cur === null ? 'low' : gearRange(m.cur);
    return m;
  }
  function explainMove(m) {
    const want = findSlot(m.target), need = gearRange(m.target);
    const answer = `${gearName(m.target)} is the ${slotWhere(want)} slot with the range ${need}`;
    if (m.picked === PAT.slots.indexOf(want) && m.range === need) {
      const flipped = m.cur !== null && gearRange(m.cur) !== need;
      return `<div class="explain okbg"><strong>Right.</strong> ${answer[0].toUpperCase()}${answer.slice(1)}.
        ${flipped ? ` You preselected the range in ${ord(m.cur)} and it changed on the way through neutral.` : ''}
      </div>`;
    }
    const got = slotGear(PAT.slots[m.picked], m.range);
    const slotRight = m.picked === PAT.slots.indexOf(want);
    const lead = slotRight
      ? `Right slot, wrong range: with the selector ${m.range} that is ${got === null ? 'nothing' : gearName(got)}.`
      : `That slot with the range ${m.range} is ${got === null ? 'nothing' : gearName(got)}.`;
    return `<div class="explain wrongbg"><strong>${lead}</strong> ${answer[0].toUpperCase()}${answer.slice(1)}.</div>`;
  }
  function patternHTML() {
    if (!pat) pat = nextMove();
    const m = pat;
    const answered = 'picked' in m;
    const mark = {};
    let at = m.cur;
    if (answered) {
      const want = PAT.slots.indexOf(findSlot(m.target));
      const right = m.picked === want && m.range === gearRange(m.target);
      mark[m.picked] = right ? 'correct' : 'wrong';
      if (!right) mark[want] = 'correct';
      at = slotGear(PAT.slots[m.picked], m.range);
      if (at === null) at = m.cur;
    }
    return `
      <p class="hint">The lever on an ${esc(PAT.name)}: three gates on a neutral bar, five forward
        slots that each give one gear with the range selector down and another with it up. The
        drill puts you in a gear and asks for the next one; set the selector, then tap the slot.</p>
      <div class="tiles shtiles">
        <div class="tile"><div class="big" id="shright">${pscore.right}</div><div>right</div></div>
        <div class="tile"><div class="big" id="shasked">${pscore.asked}</div><div>asked</div></div>
        <div class="tile"><div class="big" id="shstreak">${pscore.streak}</div><div>streak</div></div>
      </div>
      <div class="quiz shmove" data-cur="${m.cur === null ? '' : m.cur}" data-target="${m.target}">
        <p class="qtext">${m.cur === null
          ? `From neutral, put it in <strong>${gearName(m.target)}</strong>.`
          : `You are in <strong>${ord(m.cur)}</strong>. Shift to <strong>${ord(m.target)}</strong>.`}</p>
        <div class="shrange" role="group" aria-label="Range selector">
          <span class="hint">Range selector</span>
          <button class="btn${m.range === 'low' ? ' primary' : ''}" data-range="low"
            aria-pressed="${m.range === 'low'}" ${answered ? 'disabled' : ''}>Low</button>
          <button class="btn${m.range === 'high' ? ' primary' : ''}" data-range="high"
            aria-pressed="${m.range === 'high'}" ${answered ? 'disabled' : ''}>High</button>
        </div>
        ${patternSVG({ range: m.range, at, live: !answered, mark })}
        ${answered ? explainMove(m) : '<p class="hint">Set the range, then tap the slot the lever goes to.</p>'}
        ${answered ? '<div class="actions"><button class="primary" id="next">Next<kbd class="after">Enter</kbd></button></div>' : ''}
      </div>`;
  }
  function bindPattern() {
    view.querySelectorAll('button[data-range]').forEach(b => b.addEventListener('click', () => {
      if ('picked' in pat) return;
      pat.range = b.dataset.range;
      renderShifting();
    }));
    const pick = slot => {
      if ('picked' in pat) return;
      pat.picked = Number(slot.dataset.slot);
      const want = PAT.slots.indexOf(findSlot(pat.target));
      const right = pat.picked === want && pat.range === gearRange(pat.target);
      pscore.asked++;
      if (right) { pscore.right++; pscore.streak++; } else pscore.streak = 0;
      renderShifting();
    };
    view.querySelectorAll('.shmove .slot[role="button"]').forEach(slot => {
      slot.addEventListener('click', () => pick(slot));
      slot.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(slot); }
      });
    });
    const next = $('#next');
    if (next) next.addEventListener('click', () => {
      pat = nextMove(pat);
      renderShifting();
    });
  }

  // ---------- the tab ----------
  function renderShifting(ctx) {
    if (ctx) ({ view, $, esc, cfg } = ctx);
    stopListen();
    stopTach();
    stopDrive();
    clearTimeout(tap.timer);
    tap.first = null;
    const prefs = loadPrefs();
    const mode = prefs.mode;
    const tab = (id, m, label) =>
      `<button class="btn${mode === m ? ' primary' : ''}" id="${id}" aria-pressed="${mode === m}">${label}</button>`;
    view.innerHTML = `
      <div class="shifting">
        <h2>Shifting practice</h2>
        <div class="shbar">
          <div class="shmodes" role="group" aria-label="Drill">
            ${tab('shspeeds', 'speeds', 'Gear speeds')}
            ${tab('shpattern', 'pattern', 'Shift pattern')}
            ${tab('shclutch', 'clutch', 'Double clutch')}
          </div>
        </div>
        ${mode === 'speeds' ? speedsHTML(prefs) : mode === 'pattern' ? patternHTML() : clutchHTML(prefs)}
        <p class="disclaimer">The double-clutch steps are Section 2.3 of the
          <a href="${cfg.manuals.default.url}" target="_blank" rel="noopener">NC Commercial
          Driver Manual</a>. The gear speeds, the rpm figures, the pause lengths, and the shift
          pattern are training figures for one truck; your instructor and your truck are
          authoritative, and the manual says to learn the speeds for the vehicle you drive.</p>
      </div>`;
    const pickMode = m => () => {
      prefs.mode = m;
      savePrefs(prefs);
      renderShifting();
    };
    $('#shspeeds').addEventListener('click', pickMode('speeds'));
    $('#shpattern').addEventListener('click', pickMode('pattern'));
    $('#shclutch').addEventListener('click', pickMode('clutch'));
    if (mode === 'speeds') bindSpeeds(prefs);
    else if (mode === 'pattern') bindPattern();
    else bindClutch(prefs);
  }

  self.APP_VIEWS = Object.assign(self.APP_VIEWS || {}, { shifting: renderShifting });
})();
