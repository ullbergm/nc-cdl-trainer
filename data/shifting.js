/* The shifting drills the Shifting tab renders: which gear goes with which
   road speed, and the double-clutch cadence from Section 2.3 of the NC
   Commercial Driver Manual.

   The gear table and the rpm figures are the ones taught in training, not
   something the manual prints: the manual only says to learn the operating
   rpm range and "what speeds each gear is good for" (p. 2-9). Edit `gears`
   and `rpm` to match the truck you drive; the drills, the chart, and the
   tests all read them. Gears below the first entry are for getting rolling
   and are not drilled.

   `steps` are the manual's basic double-clutching procedures, one line per
   pedal action, in the manual's order. The step flagged `wait` is the pause
   between the two clutch presses that the cadence trainer times; `defaults`
   are the starting pause lengths in seconds, one per direction, which the
   tab lets you adjust and remembers. */
const SHIFTING = {
  page: '2-9',
  gears: [
    { gear: 4, mph: 10 },
    { gear: 5, mph: 15 },
    { gear: 6, mph: 20 },
    { gear: 7, mph: 25 },
    { gear: 8, mph: 35 },
    { gear: 9, mph: 45 },
    { gear: 10, mph: 55 },
  ],
  // The tachometer side of the same table: shift up when the needle reaches
  // `shift`, and the truck's gearing drops `drop` rpm per gear, so the new
  // gear picks up at shift - drop. Downshifting mirrors it: the lower gear
  // wants `drop` rpm more than the higher one had. The cadence trainer
  // animates the needle between the two across the pause, then brings it
  // back to where the next shift starts over `recover` seconds: on the gas
  // in the new gear after an upshift, or slowing in the lower gear after a
  // downshift. Slower than the drop, as it is in the truck. In the Drive
  // simulator the speed table is the truth about the gearing, so the drop
  // there varies a little from gear to gear around this figure.
  rpm: { shift: 1500, drop: 400, recover: 3 },
  // Where the range selector flips on a 10-speed: the first gear of high range.
  highRangeFrom: 6,
  // The lever: an Eaton Fuller 10-speed H pattern, three gates on a neutral
  // bar. Each slot is a lever position with the gear it gives in low range
  // and in high range (reverse has no high-range gear on the placard).
  // col 0-2 runs left to right, row 0 is toward the dash, row 1 toward you.
  pattern: {
    name: 'Eaton Fuller 10-speed',
    slots: [
      { col: 0, row: 0, low: 'R', high: null },
      { col: 0, row: 1, low: 1, high: 6 },
      { col: 1, row: 0, low: 2, high: 7 },
      { col: 1, row: 1, low: 3, high: 8 },
      { col: 2, row: 0, low: 4, high: 9 },
      { col: 2, row: 1, low: 5, high: 10 },
    ],
    note: 'Range selector down for 1st through 5th, up for 6th through 10th. Preselect it while you are still in 5th (or 6th on the way down); the range changes as the lever passes through neutral.',
  },
  steps: {
    up: [
      { do: 'Release the accelerator, push in the clutch, and shift to neutral at the same time.', pedal: 'in' },
      { do: 'Release the clutch.', pedal: 'out' },
      { do: 'Let the engine and gears slow to the rpm the next gear needs.', wait: true },
      { do: 'Push in the clutch and shift to the higher gear at the same time.', pedal: 'in' },
      { do: 'Release the clutch and press the accelerator at the same time.', pedal: 'out' },
    ],
    down: [
      { do: 'Release the accelerator, push in the clutch, and shift to neutral at the same time.', pedal: 'in' },
      { do: 'Release the clutch.', pedal: 'out' },
      { do: 'Press the accelerator to bring the engine and gears up to the rpm the lower gear needs.', wait: true },
      { do: 'Push in the clutch and shift to the lower gear at the same time.', pedal: 'in' },
      { do: 'Release the clutch and press the accelerator at the same time.', pedal: 'out' },
    ],
  },
  // Seconds from the first clutch press to the second, per direction.
  defaults: { up: 1.0, down: 0.7 },
  // The manual's advice when the pause ran long and the gear will not go in.
  missNote: 'If you stay in neutral too long the gear may not go in. Do not force it: return to neutral, release the clutch, bring the engine speed up to match road speed, and try again.',
};
