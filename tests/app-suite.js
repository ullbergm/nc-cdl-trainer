/* App-specific browser tests, run after the synced engine suite: the
 * Pre-trip script tab and the Shifting drills. Run through TestSuite so results land in the same
 * RESULTS:: line. */
TestSuite.run(() => {
  const { t, q, qa, nav } = TestSuite;

  // --- pre-trip script tab ---
  // Read mode lays the whole script open for the default rig (tractor
  // coupling and trailer on, bus and coach off), memorize mode collapses it
  // for recall, and both the mode and the rig picks survive leaving the tab.
  const defaultOn = new Set(PRETRIP_SCRIPT.rigs.filter(r => r.default).map(r => r.key));
  const defaultGroups = PRETRIP_SCRIPT.groups.filter(g => !g.rig || defaultOn.has(g.rig));

  nav('pretrip');
  t('pre-trip shows every group the default rig has', qa('.ptgroup').length === defaultGroups.length);
  t('read mode lays every script item open',
    qa('.ptitem').length === defaultGroups.reduce((n, g) => n + g.items.length, 0)
    && qa('.ptitem').every(d => d.open));
  t('every group cites its manual page as a link',
    qa('.ptgroup h3 a.cite').length === defaultGroups.length
    && qa('.ptgroup h3 a.cite').every(a => a.href.includes('#page=')));
  t('the air-brake automatic-failure warning is shown', !!q('.ptwarn'));

  q('#ptrecite').click();
  t('memorize mode hides every item’s checks',
    qa('.ptitem').length > 0 && qa('.ptitem').every(d => !d.open));
  q('.ptitem summary').click();
  t('tapping an item reveals its checks', q('.ptitem').open);
  nav('home');
  nav('pretrip');
  t('memorize mode survives leaving the tab', qa('.ptitem').every(d => !d.open));

  const offRig = PRETRIP_SCRIPT.rigs.find(r => !r.default);
  const offGroups = PRETRIP_SCRIPT.groups.filter(g => g.rig === offRig.key).length;
  q(`input[data-rig="${offRig.key}"]`).click();
  t('turning a rig on shows its groups',
    qa('.ptgroup').length === defaultGroups.length + offGroups);
  q(`input[data-rig="${offRig.key}"]`).click();
  t('turning a rig back off hides them again', qa('.ptgroup').length === defaultGroups.length);
  q('#ptread').click();
  t('read mode reopens the whole script', qa('.ptitem').every(d => d.open));
});

// --- shifting tab ---
// Gear speeds: the chart lists every row of the table, each question offers
// four choices and carries its answer, a right pick scores and a wrong one
// resets the streak, and Next asks another. Double clutch: the manual's five
// steps per direction, the pause slider seeded from the data defaults and
// remembered per direction, and two taps produce a timed result. Every mode
// choice survives leaving the tab.
TestSuite.run(() => {
  const { t, q, qa, nav } = TestSuite;
  const drillOpen = () => !!q('.shq');

  nav('shifting');
  t('shifting opens on the gear-speed drill', drillOpen());
  t('the gear chart lists every gear in the table',
    qa('.shchart tbody tr').length === SHIFTING.gears.length);
  const land = SHIFTING.rpm.shift - SHIFTING.rpm.drop;
  t('the chart states the shift point, the drop, and where the next gear picks up',
    q('.shrpmline').textContent.includes(`${SHIFTING.rpm.shift} rpm`)
    && q('.shrpmline').textContent.includes(`${SHIFTING.rpm.drop} rpm`)
    && q('.shrpmline').textContent.includes(`${land} rpm`));
  t('the drill hint cites the manual page as a link',
    !!q('.shifting a.cite') && q('.shifting a.cite').href.includes('#page='));
  t('a question offers four choices', qa('.shq .choice').length === 4);
  const answer = q('.shq').dataset.answer;
  const right = qa('.shq .choice').find(b => b.dataset.v === answer);
  const wrong = qa('.shq .choice').find(b => b.dataset.v !== answer);
  wrong.click();
  t('a wrong pick is marked and the right one revealed',
    !!q('.shq .choice.wrong') && !!q('.shq .choice.correct') && !!q('.explain.wrongbg'));
  t('a wrong pick counts as asked, not right',
    q('#shasked').textContent === '1' && q('#shright').textContent === '0');
  q('#next').click();
  t('Next asks another question', qa('.shq .choice:not(:disabled)').length === 4);
  const answer2 = q('.shq').dataset.answer;
  qa('.shq .choice').find(b => b.dataset.v === answer2).click();
  t('a right pick scores and starts a streak',
    !!q('.explain.okbg') && q('#shright').textContent === '1' && q('#shstreak').textContent === '1');
  t('the right choice is always one of the four', !!right);

  q('#shclutch').click();
  t('the double-clutch drill lists the manual’s upshift steps',
    qa('.shstep').length === SHIFTING.steps.up.length && !!q('.shstep.wait'));
  t('the pause slider starts at the upshift default',
    Number(q('#shwait').value) === SHIFTING.defaults.up);
  t('the upshift pause runs the needle from the shift point down to the landing rpm',
    q('.shwaitlen').textContent.includes(`${SHIFTING.rpm.shift} down to ${land} rpm`)
    && q('#shrpm').textContent === String(SHIFTING.rpm.shift));
  q('button[data-dir="down"]').click();
  t('Downshift swaps in the downshift steps and pause',
    q('.shstep.wait').textContent.includes('rpm the lower gear')
    && Number(q('#shwait').value) === SHIFTING.defaults.down);
  t('the downshift pause revs the needle from the landing rpm back to the shift point',
    q('.shwaitlen').textContent.includes(`${land} up to ${SHIFTING.rpm.shift} rpm`)
    && q('#shrpm').textContent === String(land));
  q('#shwait').value = '1.5';
  q('#shwait').dispatchEvent(new Event('input', { bubbles: true }));
  t('moving the slider updates the readout', q('#shwaitout').textContent === '1.5 s');
  q('button[data-dir="up"]').click();
  t('each direction keeps its own pause', Number(q('#shwait').value) === SHIFTING.defaults.up);
  q('button[data-dir="down"]').click();
  t('the changed pause is remembered', Number(q('#shwait').value) === 1.5);

  q('#shsound').click();
  q('#shplay').click();
  t('Play starts the cadence', q('#shplay').textContent === 'Stop');
  q('#shplay').click();
  t('Stop ends it', q('#shplay').textContent === 'Play');

  q('button[data-sub="tap"]').click();
  t('Tap shows the clutch button with no result yet',
    !!q('#shtap') && !q('.shresult'));
  q('#shtap').click();
  t('the first press arms the button', q('#shtap').classList.contains('armed'));
  q('#shtap').click();
  t('the second press produces a timed result against the 1.5 s target',
    !!q('.shresult') && q('.shresult').textContent.includes('target 1.50 s')
    && !q('#shtap').classList.contains('armed'));
  t('an instant second press reads as early', q('.shresult').textContent.includes('early'));
  t('the result says where the needle was when the gear went in',
    q('.shresult').textContent.includes(`${land} rpm`)
    && q('#shrpm').textContent === String(land));
  q('#shreset').click();
  t('Clear empties the history', !q('.shresult'));

  nav('home');
  nav('shifting');
  t('the double-clutch drill, direction, and Tap survive leaving the tab',
    !!q('#shtap') && q('button[data-dir="down"]').getAttribute('aria-pressed') === 'true');
  q('#shspeeds').click();
  t('Gear speeds comes back with the score kept', drillOpen() && q('#shright').textContent === '1');
  t('the gear chart carries the lever pattern', !!q('.shchart .shpattern'));

  // Shift pattern: every slot is drawn and tappable, the lever starts in the
  // current gear with the selector where that gear left it, the right slot
  // in the right range scores, and a wrong one shows both slots.
  const slots = SHIFTING.pattern.slots;
  const gearOf = v => (v === 'R' ? 'R' : Number(v));
  const ord2 = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  const RPM_RECOVER_S = SHIFTING.rpm.recover || 3;
  const rangeOf = g => (g !== 'R' && g >= SHIFTING.highRangeFrom ? 'high' : 'low');
  const slotOf = g => slots.findIndex(s => s.low === g || s.high === g);
  q('#shpattern').click();
  t('the shift-pattern drill draws every lever slot as a button',
    qa('.shmove .slot[role="button"]').length === slots.length);
  let mv = q('.shmove');
  const cur = mv.dataset.cur === '' ? null : gearOf(mv.dataset.cur);
  t('the selector starts where the current gear left it',
    q('button[data-range][aria-pressed="true"]').dataset.range === (cur === null ? 'low' : rangeOf(cur)));
  let target = gearOf(mv.dataset.target);
  q(`button[data-range="${rangeOf(target)}"]`).click();
  const tapSlot = i => q(`.shmove .slot[data-slot="${i}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  tapSlot(slotOf(target));
  t('the right slot in the right range scores',
    !!q('.explain.okbg') && q('.slot.correct') && q('#shright').textContent === '1');
  q('#next').click();
  mv = q('.shmove');
  target = gearOf(mv.dataset.target);
  q(`button[data-range="${rangeOf(target)}"]`).click();
  const wrongSlot = slots.findIndex(s => s.low !== target && s.high !== target && s.low !== 'R');
  tapSlot(wrongSlot);
  t('a wrong slot is marked and the right one shown',
    !!q('.explain.wrongbg') && !!q('.slot.wrong') && !!q('.slot.correct')
    && q('#shasked').textContent === '2' && q('#shstreak').textContent === '0');
  nav('home');
  nav('shifting');
  t('the shift-pattern drill survives leaving the tab', !!q('.shmove'));

  // Drive: one full upshift driven through the keyboard with the clock
  // advanced by hand. Clutch in at the shift point, stick to neutral, clutch
  // out, let the needle fall, clutch in, stick into the next gear, clutch
  // out; the log grades the engagement.
  const key = (type, k) => document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
  q('#shclutch').click();
  q('button[data-dir="up"]').click();
  q('button[data-sub="drive"]').click();
  const sim = SHIFTING_DRIVE;
  const first = SHIFTING.gears[0].gear, second = SHIFTING.gears[1].gear;
  t('Drive starts rolling in the lowest gear of the table at the landing rpm and its speed',
    !!q('#shdrive') && sim.state().gear === first && sim.state().rpm === land
    && sim.state().mph === SHIFTING.gears[0].mph && !!q('#shmph'));
  sim.step(RPM_RECOVER_S);
  t('accelerating in gear brings the needle to the shift point',
    Math.abs(sim.state().rpm - SHIFTING.rpm.shift) <= 5 && q('#shstate').textContent.includes(`${ord2(second)} comes in at`));
  while (sim.state().mph < SHIFTING.gears[1].mph) sim.step(0.1);
  t('reaching the next gear\'s table speed says shift now', q('#shstate').textContent.includes('Shift now'));
  key('keydown', ' ');
  t('Space holds the clutch in and records the clutch-in rpm',
    sim.state().clutch && sim.state().clutchInRpm === sim.state().rpm && q('#shclutchbtn').classList.contains('down'));
  const firstRow = SHIFTING.pattern.slots.find(sl => sl.low === first || sl.high === first).row;
  key('keydown', firstRow === 0 ? 'ArrowDown' : 'ArrowUp');
  t('pulling the stick out of gear reads neutral', sim.state().gear === null);
  key('keyup', ' ');
  t('clutch out in neutral says what the next gear wants',
    !sim.state().clutch && q('#shstate').textContent.includes(`${ord2(second)} wants`));
  key('keydown', ' ');
  const secondSlot = SHIFTING.pattern.slots.find(sl => sl.low === second || sl.high === second);
  const stickCol = [50, 120, 190].indexOf(sim.state().stick.x);
  for (let c = stickCol; c < secondSlot.col; c++) key('keydown', 'ArrowRight');
  for (let c = stickCol; c > secondSlot.col; c--) key('keydown', 'ArrowLeft');
  key('keydown', secondSlot.row === 0 ? 'ArrowUp' : 'ArrowDown');
  t('too early, the gear grinds and the stick bounces to neutral',
    sim.state().gear === null && q('#shmsg').textContent.startsWith('Grind') && sim.state().grinds === 1);
  key('keyup', ' ');
  while (sim.state().rpm > sim.wants(second) + 20) sim.step(0.05);
  key('keydown', ' ');
  key('keydown', secondSlot.row === 0 ? 'ArrowUp' : 'ArrowDown');
  t('at the right rpm the next gear goes in', sim.state().gear === second);
  key('keyup', ' ');
  t('clutch out in gear logs a smooth shift',
    sim.state().log.length === 1 && sim.state().log[0].to === second && sim.state().log[0].cls === 'ok'
    && q('#shlog li.ok') !== null);
  sim.step(RPM_RECOVER_S);
  t('the table speeds and the rpm rule agree for the run so far: 5th at the landing rpm reads the table speed',
    Math.abs(sim.state().rpm / land * SHIFTING.gears[1].mph - sim.state().mph) < 0.5);
  q('#shrestart').click();
  t('Start over resets the run', sim.state().gear === first && sim.state().log.length === 0);
  // Downshift run: start in top gear at the shift point, slow to the landing
  // rpm, neutral, blip the gas up to what the lower gear wants, gear in.
  const top = SHIFTING.gears[SHIFTING.gears.length - 1].gear, below = SHIFTING.gears[SHIFTING.gears.length - 2].gear;
  q('button[data-dir="down"]').click();
  t('Downshift starts the run in top gear at the shift point',
    !!q('#shdrive') && sim.state().dir === 'down' && sim.state().gear === top && sim.state().rpm === SHIFTING.rpm.shift);
  while (sim.state().rpm > land + 20) sim.step(0.1);
  t('slowing to the landing rpm says drop now', q('#shstate').textContent.includes(`Drop to ${ord2(below)} now`));
  key('keydown', ' ');
  const topRow = SHIFTING.pattern.slots.find(sl => sl.low === top || sl.high === top).row;
  key('keydown', topRow === 0 ? 'ArrowDown' : 'ArrowUp');
  key('keyup', ' ');
  t('clutch out in neutral on a downshift asks for a blip',
    sim.state().gear === null && q('#shmsg').textContent.includes('Blip the gas'));
  key('keydown', 'g');
  while (sim.state().rpm < sim.wants(below) - 10) sim.step(0.05);
  key('keyup', 'g');
  key('keydown', ' ');
  const belowSlot = SHIFTING.pattern.slots.find(sl => sl.low === below || sl.high === below);
  const col0 = [50, 120, 190].indexOf(sim.state().stick.x);
  for (let c = col0; c < belowSlot.col; c++) key('keydown', 'ArrowRight');
  for (let c = col0; c > belowSlot.col; c--) key('keydown', 'ArrowLeft');
  if (top >= SHIFTING.highRangeFrom && below < SHIFTING.highRangeFrom) key('keydown', 'r');
  key('keydown', belowSlot.row === 0 ? 'ArrowUp' : 'ArrowDown');
  t('with the revs up the lower gear goes in', sim.state().gear === below);
  key('keyup', ' ');
  t('the downshift is logged as smooth', sim.state().log.length === 1 && sim.state().log[0].cls === 'ok');
  q('button[data-dir="up"]').click();
  t('switching back to Upshift starts a fresh upshift run', sim.state().dir === 'up' && sim.state().gear === first);
  t('the grind window slider starts at the default', Number(q('#shgrind').value) === 350);
  q('#shgrind').value = '600';
  q('#shgrind').dispatchEvent(new Event('input', { bubbles: true }));
  t('moving it updates the readout', q('#shgrindout').textContent === '±600 rpm');
  nav('home');
  nav('shifting');
  t('the grind window is remembered', Number(q('#shgrind').value) === 600);
});
