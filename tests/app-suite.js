/* App-specific browser tests, run after the synced engine suite: the
 * Pre-trip script tab. Runs through TestSuite so results land in the same
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
