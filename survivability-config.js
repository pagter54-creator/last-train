/* LAST RAIL 0.7 — combat survivability / emergency repair tuning.
 * All numbers introduced by the survivability patch live here so balance passes
 * do not require touching controller code.
 */
window.SURVIVABILITY_CONFIG = Object.freeze({
  // Destroyed-carriage emergency response.
  emergencyInvulnerabilitySeconds: 1.25,
  rubbleCoverSeconds: 8,
  rubbleRangedDamageReduction: 0.70,
  repairRangedDamageReduction: 0.50,
  restoredCarDamageReduction: 0.50,
  restoredCarProtectionSeconds: 2,

  // Crew abandons combat and prioritizes carriage repair at or below this HP ratio.
  // Destroyed carriages always use emergency repair priority regardless of this value.
  repairPriorityHpRatio: 0.30,

  // Enemy pressure smoothing. These are soft movement caps, not spawn caps.
  enemyAttackSoftCap: 6,
  enemyAttackHardCap: 10,
  overflowEnemyMoveMultiplier: 0.50,
  heavyOverflowEnemyMoveMultiplier: 0.20,
  lowEnemyThreshold: 5,
  lowEnemySpeedMultiplier: 1.30,
  eliteSoftCapBonus: 2,
  eliteHardCapBonus: 2,
  crisisSoftCapBonus: 1,
  crisisHardCapBonus: 1,

  // Crew maximum-health progression.
  crewHpPerLevel: 2,

  // Small feedback timings only; they do not affect combat rules.
  recoveryFlashSeconds: 0.8,
  statusRefreshSeconds: 0.15
});
