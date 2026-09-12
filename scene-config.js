/* 화면 연출 값. 전투 밸런스와 분리하여 체감 속도만 독립적으로 조절한다. */
window.SCENE_CONFIG = {
  horizon: 0.27,
  groundOffset: 28, spawnInset: 16, emergenceSeconds: 1.5,
  launchSlide: 240,
  mountains: { tileWidthRatio: 1.5, segments: 12, colors: ['#445b60', '#3d5052', '#394642'], peakHeight: 70, layerOffset: 13 },
  motion: { ground: 740, mountains: 18, hills: 58, clouds: 9, debris: 78, streaks: 24, idle: 0.65 },
  perspective: { farScale: 0.25, nearScale: 1.6, approachEnd: 0.61 },
  palette: { sky: '#233c48', haze: '#9b9280', sand: '#74634e', earth: '#302b29', amber: '#edc67b', teal: '#83c6c4' },
  crewColors: ['#db976d', '#88b5be', '#c7ac67', '#ab9ebc', '#8fa980'],
  refreshMs: 140
};
