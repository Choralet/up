// App-only facts layered on top of the user's tree export (src/data/trees.json).
// The export stays a faithful copy; everything the app decided lives here (Plan 8, docs/DECISIONS.md).
import type { Branch, DayType, Goal } from './types'

export interface TreeInfo {
  /** short name for chips, tracks and the Skills tab */
  name: string
  branch: Branch
  /** skill ladders: the day type that trains them */
  day?: Exclude<DayType, 'rest'>
}

/** In the order tracks are asked in Find your level and listed on a day. */
export const TREE_INFO: Record<string, TreeInfo> = {
  hpush: { name: 'Push-ups', branch: 'push' },
  vpush: { name: 'Overhead', branch: 'push' },
  dip: { name: 'Dips', branch: 'push' },
  vpull: { name: 'Pull-ups', branch: 'pull' },
  hpull: { name: 'Rows', branch: 'pull' },
  squat: { name: 'Squats', branch: 'legs' },
  hinge: { name: 'Hinge', branch: 'legs' },
  antiext: { name: 'Plank & hollow', branch: 'core' },
  compress: { name: 'Leg raises', branch: 'core' },
  lateral: { name: 'Side plank', branch: 'core' },
  tri: { name: 'Triceps', branch: 'push' },
  scap: { name: 'Shoulder blades', branch: 'push' },
  cuff: { name: 'Rotator cuff', branch: 'push' },
  bic: { name: 'Biceps', branch: 'pull' },
  rear: { name: 'Rear delts', branch: 'pull' },
  grip: { name: 'Grip & wrists', branch: 'pull' },
  calf: { name: 'Calves', branch: 'legs' },
  tib: { name: 'Tibialis', branch: 'legs' },
  hips: { name: 'Hips', branch: 'legs' },
  lowback: { name: 'Lower back', branch: 'core' },
  neck: { name: 'Neck', branch: 'core' },
  hs: { name: 'Handstand', branch: 'push', day: 'push' },
  hspu: { name: 'Handstand push-up', branch: 'push', day: 'push' },
  planche: { name: 'Planche', branch: 'push', day: 'push' },
  elbow: { name: 'Elbow lever', branch: 'push', day: 'push' },
  fl: { name: 'Front lever', branch: 'pull', day: 'pull' },
  bl: { name: 'Back lever', branch: 'pull', day: 'pull' },
  bmu: { name: 'Bar muscle-up', branch: 'pull', day: 'pull' },
  rmu: { name: 'Ring muscle-up', branch: 'pull', day: 'pull' },
  flag: { name: 'Human flag', branch: 'pull', day: 'pull' },
  oap: { name: 'One-arm pull-up', branch: 'pull', day: 'pull' },
  pistol: { name: 'Pistol squat', branch: 'legs', day: 'legs' },
  lsit: { name: 'L-sit', branch: 'core', day: 'legs' },
  dflag: { name: 'Dragon flag', branch: 'core', day: 'legs' },
}

/** A skill ladder's first rung waits for one main exercise (picked from the source notes; not in the export). */
export const GATES: Record<string, string[]> = {
  hs: ['antiext:pl'],
  hspu: ['hpush:p'],
  planche: ['hpush:p'],
  elbow: ['hpush:k'],
  fl: ['vpull:pu'],
  bl: ['vpull:np'],
  bmu: ['vpull:pu'],
  rmu: ['vpull:pu', 'dip:d'],
  flag: ['vpush:whn'],
  oap: ['vpull:pu'],
  pistol: ['squat:s'],
  lsit: ['antiext:pl'],
  dflag: ['compress:hkr'],
}

/** The same exercise in two trees: finishing one finishes the other. */
export const TWINS: [string, string][] = [
  ['vpush:pk', 'hspu:pk'],
  ['vpush:epk', 'hspu:epk'],
  ['vpush:whn', 'hspu:wn'],
  ['vpull:cbp', 'bmu:cb'],
  ['vpull:arp', 'oap:arp'],
  ['vpull:tw', 'oap:tw'],
  ['vpull:wpu', 'oap:wpu'],
  ['vpull:dh', 'grip:g1'],
  ['vpull:sp', 'scap:s3'],
  ['dip:sbd', 'bmu:sbd'],
  ['dip:rd', 'rmu:rd'],
  ['grip:g4', 'rmu:fg'],
  ['squat:pis', 'pistol:bp'],
  ['squat:cs', 'hips:m6'],
  ['lateral:cp', 'hips:m5'],
  ['lateral:sha', 'hips:m3'],
  ['hinge:rh', 'lowback:l3'],
  ['hinge:ghr', 'lowback:l4'],
  ['compress:llr', 'dflag:llr'],
  ['hpush:d', 'tri:x5'],
  ['grip:g5', 'hs:w'],
  ['planche:fr', 'elbow:cr'],
]

const reps = (sets: number, target: number, per?: Goal['per']): Goal => (per ? { type: 'reps', sets, target, per } : { type: 'reps', sets, target })
const hold = (sets: number, target: number, per?: Goal['per']): Goal => (per ? { type: 'hold', sets, target, per } : { type: 'hold', sets, target })

/**
 * Goals the "advance" text can't give. NONE = no number in the source (agent's default, editable in the app);
 * FINAL = an "up to" sequence whose last target is the goal; the rest correct a reading.
 */
export const GOALS: Record<string, Goal> = {
  // NONE
  'vpull:cu': reps(3, 8), // "Same as pull-up"
  'squat:pis': reps(3, 8, 'leg'), // same as the pistol ladder's box pistol
  'hinge:rdl': reps(3, 8),
  'antiext:hro': reps(3, 15),
  'lateral:rpal': reps(3, 12),
  'grip:g5': hold(1, 180),
  'scap:s3': reps(3, 8),
  'hs:w': hold(1, 180),
  'hs:ku': reps(3, 5),
  'hs:hp': reps(3, 5),
  'hs:ph': reps(3, 3),
  'hspu:fhs': reps(3, 5),
  'hspu:n90': reps(3, 3),
  'planche:bap': hold(3, 10),
  'planche:ppu': reps(3, 8),
  'planche:fp': hold(3, 5),
  'fl:bfl': hold(3, 10),
  'bmu:wmu': reps(3, 3),
  'flag:bf': hold(3, 10),
  'lsit:mn': hold(3, 5),
  'oap:wpu': reps(3, 5),
  // FINAL ("up to", "→")
  'antiext:pl': hold(1, 60),
  'antiext:hh': hold(1, 60),
  'lateral:sp': hold(1, 60, 'side'),
  'lowback:l2': hold(1, 60),
  // corrections
  'hs:oah': hold(3, 10), // the text's 60 s is the two-arm prerequisite
  'squat:js': reps(5, 6), // "3–5 sets of 3–6": top of both ranges
  'hips:m5': hold(3, 30, 'side'), // Copenhagen plank, as in the Side plank tree
}

/** Shorter tree labels where the name does not fit two lines. */
export const SHORT: Record<string, string> = {
  'hpush:oai': 'One-arm incline',
  'hpush:pp': 'Pseudo planche',
  'vpush:dpk': 'Deficit pike push-up',
  'dip:bd': 'Bench dip',
  'dip:rs': 'Ring support',
  'hpull:vr': 'Vertical row',
  'hpull:hr': 'Australian row',
  'hpull:tflr': 'Tuck lever row',
  'squat:wbs': 'Weighted split squat',
  'squat:pis': 'Box pistol',
  'hinge:ht': 'SL hip thrust',
  'hinge:slc': 'Slider leg curl',
  'hinge:rdl': 'Bodyweight RDL',
  'hinge:rh': 'Reverse hyper',
  'hinge:ghr': 'Glute-ham raise',
  'antiext:hh': 'Hollow hold',
  'antiext:sro': 'Long rollout',
  'compress:spl': 'Pike lifts',
  'lateral:cp': 'Copenhagen plank',
  'lateral:sha': 'Side plank abduction',
  'calf:c2': 'Deficit calf raise',
  'calf:c3': 'SL deficit calf raise',
  'calf:c4': 'Weighted calf raise',
  'calf:c5': 'Bent-knee calf raise',
  'tib:t2': 'Hard tib raise',
  'grip:g3': 'One-arm hang',
  'grip:g5': 'Wrist prep',
  'grip:g6': 'Fingertip plank',
  'grip:g7': 'Band wrist curls',
  'bic:b2': 'Bodyweight curl',
  'bic:b5': 'Chin-up negatives',
  'tri:x1': 'Band triceps',
  'tri:x2': 'Triceps extension',
  'tri:x4': 'Sphinx push-up',
  'neck:n1': 'Neck isometrics',
  'neck:n2': 'Lying neck raises',
  'hips:m2': 'Band lateral walk',
  'hips:m3': 'Side plank abduction',
  'cuff:q1': 'External rotation',
  'lowback:l2': 'Superman hold',
  'lowback:l3': 'Reverse hyper',
  'scap:s4': 'Support shrug',
  'scap:s5': 'Handstand shrug',
  'hs:hp': 'Wall heel pulls',
  'planche:bap': 'Band planche',
  'planche:ppu': 'Planche push-ups',
  'fl:flr': 'Lever raises',
  'fl:bfl': 'Band front lever',
  'bl:sb': 'Straddle back lever',
  'bmu:ep': 'Explosive pull-up',
  'bmu:amu': 'Assisted muscle-up',
  'rmu:fgr': 'False-grip rows',
  'rmu:td': 'Transition drill',
  'flag:ef': 'Eccentric flag',
  'lsit:fs': 'Feet-down L-sit',
  'oap:aoap': 'Assisted one-arm',
  'oap:wpu': 'Weighted pull-up',
  'pistol:ap': 'Assisted pistol',
  'pistol:eps': 'Elevated pistol',
  'dflag:llr': 'Lying leg raise',
  'dflag:tdf': 'Tuck dragon flag',
  'dflag:sldf': 'Straddle dragon flag',
  'dflag:dfn': 'Dragon flag negatives',
}
