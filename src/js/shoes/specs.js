// Parameter specs for the 18 Soleora shoes. Colourways follow the design review.
// Heights are relative to a shoe length of 1 (t: 0 heel -> 1 toe).

const DRESS = {
  heelW: 0.118, waistW: 0.126, ballW: 0.176, toeW: 0.11, toeExp: 0.32, heelExp: 0.2,
  roof: [[0, 0.29], [0.3, 0.28], [0.45, 0.255], [0.6, 0.21], [0.75, 0.165], [0.9, 0.125], [1, 0.08]],
  topline: [[0, 0.215], [0.2, 0.16], [0.36, 0.18]],
  heelHeight: 0.075, heelLen: 0.26, ballT: 0.6, toeSpring: 0.025,
  soleThick: [[0, 0.03], [1, 0.026]], inset: 0.008, boxiness: 0.78,
};

const SPORT = {
  heelW: 0.124, waistW: 0.136, ballW: 0.19, toeW: 0.13, toeExp: 0.3, heelExp: 0.2,
  roof: [[0, 0.3], [0.3, 0.29], [0.48, 0.265], [0.65, 0.21], [0.82, 0.16], [1, 0.095]],
  topline: [[0, 0.26], [0.18, 0.195], [0.34, 0.21]],
  heelHeight: 0, heelLen: 0.25, toeSpring: 0.04,
  soleThick: [[0, 0.055], [1, 0.05]], inset: 0.004, boxiness: 0.72,
};

const BOOT = {
  heelW: 0.12, waistW: 0.13, ballW: 0.18, toeW: 0.11, toeExp: 0.34, heelExp: 0.2,
  roof: [[0, 0.64], [0.25, 0.63], [0.38, 0.55], [0.5, 0.37], [0.62, 0.25], [0.78, 0.17], [0.92, 0.125], [1, 0.085]],
  topline: [[0, 0.56], [0.3, 0.55], [0.36, 0.56], [0.4, 0.64]],
  heelHeight: 0.07, heelLen: 0.26, ballT: 0.6, toeSpring: 0.025,
  soleThick: [[0, 0.035], [1, 0.03]], inset: 0.008, boxiness: 0.75,
};

const LOW = { // ballet flats, pumps
  heelW: 0.11, waistW: 0.118, ballW: 0.168, toeW: 0.09, toeExp: 0.4, heelExp: 0.2,
  roof: [[0, 0.27], [0.3, 0.26], [0.5, 0.23], [0.68, 0.17], [0.85, 0.12], [1, 0.06]],
  topline: [[0, 0.165], [0.22, 0.1], [0.5, 0.095], [0.64, 0.14], [0.7, 0.28]],
  heelHeight: 0.012, heelLen: 0.22, toeSpring: 0.02,
  soleThick: [[0, 0.016], [1, 0.014]], inset: 0.004, boxiness: 0.72,
};

const L = (base, over = {}) => ({ ...base, ...over });

export const CATEGORY_TINTS = {
  athletic: '#B7CCC3', casual: '#CBC2DE', formal: '#C6B8AD', boots: '#CFB894', womens: '#BFC9D8',
};

/**
 * Each spec: last, upper {kind,color,paint?}, sole {layers:[{kind,color,frac}], lip}, heel?, laces?, tongue?,
 * seams?, perforations?, straps?, buckle?, pullTab?, studs?, lugs?, bow?, zip?, footbed?
 * `hot` maps anchor names to {t, theta, side} or a part name.
 */
export const SHOE_SPECS = {
  'running-shoes': {
    last: L(SPORT, { soleThick: [[0, 0.11], [0.6, 0.085], [1, 0.07]], toeSpring: 0.06, topline: [[0, 0.24], [0.18, 0.18], [0.34, 0.2]], lace: { from: 0.38, to: 0.64, gap: 0.03 } }),
    upper: { kind: 'knit', color: '#F1F0EB', paint: 'runner' },
    sole: { layers: [{ kind: 'rubber', color: '#2B3036', frac: 0.18 }, { kind: 'rubber', color: '#FFFFFF', frac: 0.82 }], lip: 0.012 },
    laces: { from: 0.4, to: 0.62, pairs: 6, color: '#2F5D8A', style: 'cross' },
    tongue: { color: '#E6E5E0' },
    anchors: { midsole: { sole: 0.25 }, vamp: { t: 0.78, theta: 1.0, side: 1 }, heel: { t: 0.03, theta: 0.6, side: 1 } },
  },
  'basketball-shoes': {
    last: L(SPORT, { roof: [[0, 0.45], [0.3, 0.44], [0.45, 0.35], [0.6, 0.25], [0.8, 0.165], [1, 0.095]], topline: [[0, 0.4], [0.2, 0.35], [0.28, 0.35]], soleThick: [[0, 0.07], [1, 0.06]], lace: { from: 0.34, to: 0.62, gap: 0.035 } }),
    upper: { kind: 'calf', color: '#7A1E2B', paint: 'counter', paintColor: '#5E1520' },
    sole: { layers: [{ kind: 'rubber', color: '#E9E6E0', frac: 0.3 }, { kind: 'rubber', color: '#F4F2EE', frac: 0.7 }], lip: 0.014 },
    laces: { from: 0.36, to: 0.6, pairs: 7, color: '#F4F2EE', style: 'cross' },
    tongue: { color: '#7A1E2B' },
    anchors: { collar: { t: 0.12, theta: 'top', side: 1 }, sole: { sole: 0.6 }, laces: { lace: 0.5 } },
  },
  'football-boots': {
    last: L(SPORT, { roof: [[0, 0.31], [0.3, 0.3], [0.5, 0.26], [0.68, 0.18], [0.85, 0.12], [1, 0.07]], topline: [[0, 0.22], [0.18, 0.17], [0.34, 0.19]], soleThick: [[0, 0.022], [1, 0.018]], toeExp: 0.55, toeW: 0.09, ballW: 0.178, lace: { from: 0.4, to: 0.68, gap: 0.022 } }),
    upper: { kind: 'calf', color: '#15191E' },
    sole: { layers: [{ kind: 'rubber', color: '#2A2F35', frac: 1 }], lip: 0.006 },
    laces: { from: 0.42, to: 0.66, pairs: 7, color: '#E8E4DA', style: 'bar' },
    tongue: { color: '#15191E' },
    studs: { color: '#C9C3B5', points: [[0.08, 0.5], [0.08, -0.5], [0.2, 0], [0.62, 0.55], [0.62, -0.55], [0.76, 0.6], [0.76, -0.6], [0.88, 0.35], [0.88, -0.35], [0.7, 0]] },
    anchors: { studs: { stud: 3 }, vamp: { t: 0.8, theta: 1.1, side: 1 }, laces: { lace: 0.5 } },
  },
  'hiking-shoes-boots': {
    last: L(SPORT, { roof: [[0, 0.46], [0.3, 0.45], [0.45, 0.36], [0.6, 0.25], [0.8, 0.165], [1, 0.1]], topline: [[0, 0.38], [0.22, 0.33], [0.3, 0.34]], soleThick: [[0, 0.07], [1, 0.06]], toeW: 0.13, lace: { from: 0.33, to: 0.6, gap: 0.03 } }),
    upper: { kind: 'suede', color: '#6B5A45', paint: 'bumper', paintColor: '#2A2826' },
    sole: { layers: [{ kind: 'rubber', color: '#2A2826', frac: 0.45 }, { kind: 'rubber', color: '#4A4540', frac: 0.55 }], lip: 0.014 },
    laces: { from: 0.35, to: 0.58, pairs: 6, color: '#B5482F', style: 'cross' },
    tongue: { color: '#5A4A38' },
    lugs: { color: '#2A2826' },
    collarPad: { color: '#5A4A38' },
    anchors: { lugs: { sole: 0.7, under: true }, toeCap: { t: 0.97, theta: 1.2, side: 1 }, collar: { t: 0.08, theta: 'top', side: 1 } },
  },
  sneakers: {
    last: L(SPORT, { soleThick: [[0, 0.05], [1, 0.048]], toeSpring: 0.02, lace: { from: 0.4, to: 0.66, gap: 0.028 } }),
    upper: { kind: 'canvas', color: '#F4F2EE' },
    sole: { layers: [{ kind: 'gum', color: '#B9773E', frac: 0.3 }, { kind: 'rubber', color: '#F4F2EE', frac: 0.7 }], lip: 0.012 },
    laces: { from: 0.42, to: 0.64, pairs: 6, color: '#F4F2EE', style: 'cross' },
    tongue: { color: '#ECEAE4' },
    seams: [{ type: 'cap', t: 0.84 }],
    stripe: { color: '#1C2430' },
    anchors: { sole: { sole: 0.5 }, vamp: { t: 0.74, theta: 1.0, side: 1 }, laces: { lace: 0.5 } },
  },
  loafers: {
    last: L(DRESS, { topline: [[0, 0.2], [0.22, 0.15], [0.42, 0.17], [0.5, 0.24], [0.55, 0.32]] }),
    upper: { kind: 'calf', color: '#4A2A1E' },
    sole: { layers: [{ kind: 'calf', color: '#2A1A12', frac: 1 }], lip: 0.012 },
    heel: { kind: 'calf', color: '#2A1A12' },
    seams: [{ type: 'apron', from: 0.56, theta: 0.85 }],
    straps: [{ t0: 0.52, t1: 0.57, color: '#43251A', slot: true }],
    anchors: { vamp: { t: 0.8, theta: 'top', side: 1 }, strap: { t: 0.545, theta: 'top', side: 1 }, heelBlock: { heel: true } },
  },
  'slip-ons-espadrilles': {
    last: L(SPORT, { roof: [[0, 0.3], [0.3, 0.29], [0.5, 0.25], [0.68, 0.18], [0.85, 0.13], [1, 0.08]], topline: [[0, 0.17], [0.22, 0.12], [0.44, 0.13], [0.54, 0.24], [0.6, 0.3]], soleThick: [[0, 0.06], [1, 0.055]], toeSpring: 0.015, inset: 0.0 }),
    upper: { kind: 'canvas', color: '#2E3F5C' },
    sole: { layers: [{ kind: 'rubber', color: '#3A3530', frac: 0.15 }, { kind: 'jute', color: '#C9A877', frac: 0.85 }], lip: 0 },
    anchors: { juteSole: { sole: 0.6 }, vamp: { t: 0.78, theta: 1.0, side: 1 } },
  },
  sandals: {
    last: L(SPORT, { roof: [[0, 0.22], [0.5, 0.2], [0.8, 0.12], [1, 0.07]], topline: [[0, 0.13], [0.25, 0.12]], soleThick: [[0, 0.045], [1, 0.035]], toeSpring: 0.02, inset: 0.012 }),
    upper: null,
    sole: { layers: [{ kind: 'rubber', color: '#3A2A20', frac: 0.45 }, { kind: 'calf', color: '#C8A17C', frac: 0.55 }], lip: 0 },
    straps: [
      { t0: 0.58, t1: 0.66, color: '#8A5A3C', scale: 0.62 },
      { t0: 0.76, t1: 0.81, color: '#8A5A3C', scale: 0.62 },
    ],
    heelStrap: { color: '#8A5A3C', y0: 0.065, y1: 0.105 },
    buckle: { t: 0.15, theta: 0.5, side: 1, small: true },
    anchors: { strap: { t: 0.62, theta: 'strap', side: 1 }, sole: { sole: 0.4 } },
  },
  'oxford-shoes': {
    last: L(DRESS, { lace: { from: 0.4, to: 0.56, gap: 0.012 } }),
    upper: { kind: 'polished', color: '#1B1B1D' },
    sole: { layers: [{ kind: 'calf', color: '#3A2418', frac: 1 }], lip: 0.012 },
    heel: { kind: 'calf', color: '#2A1A12' },
    laces: { from: 0.41, to: 0.54, pairs: 5, color: '#1B1B1D', style: 'bar' },
    tongue: { color: '#1B1B1D' },
    seams: [{ type: 'cap', t: 0.83 }, { type: 'quarter', t: 0.42 }],
    anchors: { laces: { lace: 0.5 }, toeCap: { t: 0.9, theta: 'top', side: 1 }, heelBlock: { heel: true } },
  },
  'derby-shoes': {
    last: L(DRESS, { lace: { from: 0.38, to: 0.56, gap: 0.03 } }),
    upper: { kind: 'calf', color: '#5A3A26' },
    sole: { layers: [{ kind: 'calf', color: '#2E1D14', frac: 1 }], lip: 0.012 },
    heel: { kind: 'calf', color: '#2A1A12' },
    laces: { from: 0.39, to: 0.54, pairs: 5, color: '#2E1D14', style: 'bar' },
    tongue: { color: '#4E3220' },
    seams: [{ type: 'quarter', t: 0.4 }],
    anchors: { laces: { lace: 0.5 }, toe: { t: 0.92, theta: 'top', side: 1 }, sole: { sole: 0.7 } },
  },
  brogues: {
    last: L(DRESS, { lace: { from: 0.4, to: 0.56, gap: 0.014 } }),
    upper: { kind: 'calf', color: '#8B5530' },
    sole: { layers: [{ kind: 'calf', color: '#3A2418', frac: 1 }], lip: 0.012 },
    heel: { kind: 'calf', color: '#2A1A12' },
    laces: { from: 0.41, to: 0.54, pairs: 5, color: '#4A2A18', style: 'bar' },
    tongue: { color: '#7A4A28' },
    seams: [{ type: 'wing', t: 0.8, depth: 0.32, perforate: true }, { type: 'quarter', t: 0.42, perforate: true }],
    medallion: true,
    anchors: { broguing: { t: 0.7, theta: 0.75, side: 1 }, toeCap: { t: 0.92, theta: 'top', side: 1 }, laces: { lace: 0.5 } },
  },
  'monk-straps': {
    last: L(DRESS, { topline: [[0, 0.215], [0.2, 0.16], [0.38, 0.2], [0.46, 0.27], [0.5, 0.34]] }),
    upper: { kind: 'polished', color: '#3B2A22' },
    sole: { layers: [{ kind: 'calf', color: '#22160F', frac: 1 }], lip: 0.012 },
    heel: { kind: 'calf', color: '#22160F' },
    straps: [{ t0: 0.41, t1: 0.49, color: '#22160F', grow: 0.01, from: 0.25 }],
    buckle: { t: 0.45, theta: 0.42, side: 1, big: true },
    anchors: { buckle: { buckle: true }, vamp: { t: 0.78, theta: 'top', side: 1 }, heelBlock: { heel: true } },
  },
  'chelsea-boots': {
    last: L(BOOT),
    upper: { kind: 'suede', color: '#6A4A35', paint: 'elastic', paintColor: '#2A2A2A' },
    sole: { layers: [{ kind: 'rubber', color: '#2A1E17', frac: 1 }], lip: 0.012 },
    heel: { kind: 'calf', color: '#2A1E17' },
    pullTab: { color: '#4A3325' },
    anchors: { elastic: { t: 0.3, theta: 0.9, side: 1 }, pullTab: { pull: true }, heelBlock: { heel: true } },
  },
  'chukka-boots': {
    last: L(BOOT, { roof: [[0, 0.5], [0.28, 0.49], [0.4, 0.4], [0.54, 0.28], [0.68, 0.19], [0.85, 0.14], [1, 0.08]], topline: [[0, 0.44], [0.24, 0.42], [0.3, 0.43]], heelHeight: 0, toeW: 0.11, toeExp: 0.45, soleThick: [[0, 0.05], [1, 0.045]], lace: { from: 0.33, to: 0.48, gap: 0.03 } }),
    upper: { kind: 'suede', color: '#B79A72' },
    sole: { layers: [{ kind: 'crepe', color: '#D9C29A', frac: 1 }], lip: 0.01 },
    laces: { from: 0.36, to: 0.45, pairs: 2, color: '#5A4632', style: 'bar' },
    tongue: { color: '#A88B64' },
    anchors: { laces: { lace: 0.5 }, shaft: { t: 0.15, theta: 1.0, side: 1 }, sole: { sole: 0.5 } },
  },
  'work-boots': {
    last: L(BOOT, { roof: [[0, 0.62], [0.28, 0.61], [0.4, 0.5], [0.54, 0.32], [0.68, 0.22], [0.85, 0.16], [1, 0.1]], topline: [[0, 0.56], [0.22, 0.55], [0.26, 0.56]], heelHeight: 0.02, toeW: 0.13, toeExp: 0.4, ballW: 0.19, soleThick: [[0, 0.07], [1, 0.06]], lace: { from: 0.28, to: 0.56, gap: 0.03 } }),
    upper: { kind: 'nubuck', color: '#A0662E', paint: 'toecap', paintColor: '#7E4E22' },
    sole: { layers: [{ kind: 'rubber', color: '#3A2418', frac: 0.5 }, { kind: 'rubber', color: '#5A3A22', frac: 0.5 }], lip: 0.016 },
    laces: { from: 0.3, to: 0.54, pairs: 8, color: '#E2D5B8', style: 'cross' },
    tongue: { color: '#8E5A28' },
    seams: [{ type: 'cap', t: 0.82 }],
    lugs: { color: '#3A2418' },
    anchors: { toeCap: { t: 0.92, theta: 'top', side: 1 }, lugs: { sole: 0.6, under: true }, laces: { lace: 0.2 } },
  },
  heels: {
    last: L(LOW, { heelHeight: 0.27, heelLen: 0.2, ballT: 0.68, toeExp: 0.95, toeW: 0.015, ballW: 0.166, roof: [[0, 0.25], [0.3, 0.24], [0.5, 0.21], [0.68, 0.15], [0.85, 0.1], [1, 0.05]], topline: [[0, 0.15], [0.25, 0.09], [0.5, 0.085], [0.62, 0.12], [0.68, 0.26]] }),
    upper: { kind: 'patent', color: '#1C2430' },
    sole: { layers: [{ kind: 'calf', color: '#141820', frac: 1 }], lip: 0.004 },
    heel: { kind: 'patent', color: '#1C2430', taper: 0.14, len: 0.12 },
    anchors: { heelBlock: { heel: true }, toe: { t: 0.96, theta: 'top', side: 1 }, sole: { sole: 0.45 } },
  },
  'ballet-flats': {
    last: L(LOW, {
      heelW: 0.105, waistW: 0.112, ballW: 0.16, toeW: 0.115, toeExp: 0.28, heelExp: 0.22,
      roof: [[0, 0.22], [0.3, 0.22], [0.5, 0.2], [0.65, 0.165], [0.8, 0.13], [0.93, 0.1], [1, 0.07]],
      topline: [[0, 0.13], [0.12, 0.105], [0.35, 0.085], [0.55, 0.095], [0.63, 0.13], [0.67, 0.25]],
      heelHeight: 0.014, heelLen: 0.2, toeSpring: 0.018, soleThick: [[0, 0.018], [1, 0.014]], boxiness: 1.0, inset: 0.002,
    }),
    upper: { kind: 'polished', color: '#22262C' },
    sole: { layers: [{ kind: 'calf', color: '#3A2A22', frac: 1 }], lip: 0.004 },
    bow: { color: '#22262C', big: true },
    piping: { color: '#16191D' },
    anchors: { bow: { bow: true }, collar: { t: 0.3, theta: 'top', side: 1 }, sole: { sole: 0.6 } },
  },
  'ankle-boots': {
    last: L(BOOT, { roof: [[0, 0.52], [0.28, 0.51], [0.4, 0.42], [0.54, 0.28], [0.68, 0.18], [0.85, 0.12], [1, 0.06]], topline: [[0, 0.46], [0.3, 0.45], [0.36, 0.46], [0.4, 0.53]], heelHeight: 0.1, heelLen: 0.24, ballT: 0.64, toeExp: 0.55, toeW: 0.07, ballW: 0.172 }),
    upper: { kind: 'calf', color: '#3D2B2B' },
    sole: { layers: [{ kind: 'calf', color: '#1E1515', frac: 1 }], lip: 0.008 },
    heel: { kind: 'calf', color: '#1E1515', taper: 0.88, len: 0.22 },
    zip: { t: 0.2, color: '#B8B4AA' },
    anchors: { heelBlock: { heel: true }, zip: { zip: true }, shaft: { t: 0.15, theta: 1.0, side: 1 } },
  },
};

export const SHOE_SLUGS = Object.keys(SHOE_SPECS);
