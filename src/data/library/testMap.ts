/**
 * Test-Kennungen des Programm-Seeds v4 → Tests des KYDON-Katalogs.
 * Drei gab es schon (5 km, 10 km, Klimmzüge); die übrigen stehen in
 * `data/testCatalogProgram.ts`. Damit zeigt jeder Retest auf einen Test mit
 * Protokoll — und die Bewertung läuft über denselben Weg wie jeder andere
 * Test (Regel 7: gegen den Messfehler, und ohne belegten Messfehler gar nicht).
 */
export const SEED_TEST_TO_SLUG: Record<string, string> = {
  TEST_5K_TT: 'run_5k',
  TEST_10K_TT: 'run_10k',
  TEST_MAX_REPS_KLIMMZUG: 'pull_up_max_reps',
  TEST_5RM_DIRECT: 'strength_5rm',
  TEST_3RM_DIRECT: 'strength_3rm',
  TEST_10RM_DIRECT: 'strength_10rm',
  TEST_HYROX_HALF_SIM: 'hyrox_half_sim',
  TEST_GPP_CIRCUIT: 'gpp_circuit',
  TEST_HR_RECOVERY_60S: 'hr_recovery_60s',
  TEST_OPENER_SIM: 'opener_simulation',
}
