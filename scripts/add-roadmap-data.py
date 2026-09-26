"""One-off: add the Roadmap (docs/ROADMAP.md) to the data files. Refuses to run twice."""
import json

NODES = 'src/data/nodes.json'
SKILLS = 'src/data/skills.json'
ROADMAP = 'src/data/roadmap.json'

def reps(sets, n): return {'type': 'reps', 'sets': sets, 'target': n}
def hold(sets, s): return {'type': 'hold', 'sets': sets, 'target': s}

# chain id, name, branch, day, [ (node id, name, goal, requires, cue) ]
CHAINS = [
 ('hollow-hang', 'Hollow body hang', 'pull', 'pull', [
   ('rm-hollow-hang-1', 'Hollow body hang', hold(3, 20), ['pull-hang'], 'Hang with arms straight, ribs down, legs together slightly in front: a hollow shape on the bar.'),
   ('rm-hollow-hang-2', 'Hollow body hang, 30 s', hold(3, 30), ['rm-hollow-hang-1'], 'Same hollow shape, longer. No swinging.')]),
 ('frog-stand', 'Frog stand', 'push', 'push', [
   ('rm-frog-1', 'Frog stand, toes touching', hold(3, 10), ['push-knee'], 'Hands shoulder-width, knees on the backs of your arms, lean forward; keep toes lightly on the floor.'),
   ('rm-frog-2', 'Frog stand', hold(3, 30), ['rm-frog-1'], 'Lean until the feet float. Look slightly forward, fingers grip the floor.')]),
 ('planche-lean', 'Pseudo planche lean', 'push', 'push', [
   ('rm-lean-1', 'Planche lean', hold(3, 15), ['push-standard'], 'Push-up position, fingers turned out, lean shoulders forward over the hands, arms straight.'),
   ('rm-lean-2', 'Deep planche lean', hold(3, 30), ['rm-lean-1'], 'Shoulders well past the hands, protract the shoulder blades, body hollow.')]),
 ('elbow-lever', 'Elbow lever', 'push', 'push', [
   ('rm-elbow-1', 'Elbow lever, one leg down', hold(3, 10), ['rm-frog-2'], 'Elbows into the hips, lean forward until the body is level; one foot still touches.'),
   ('rm-elbow-2', 'Elbow lever', hold(3, 10), ['rm-elbow-1'], 'Whole body level, balanced on the elbows at your hips.')]),
 ('german-hang', 'German hang', 'pull', 'pull', [
   ('rm-german-1', 'Skin the cat', reps(3, 3), ['pull-hang'], 'From a hang, tuck and rotate backwards through your arms, then return. Slow and controlled.'),
   ('rm-german-2', 'German hang', hold(3, 15), ['rm-german-1'], 'Hang with the arms behind you and the shoulders fully extended. Go only as deep as is comfortable.')]),
 ('butchers-block', "Butcher's block", 'push', 'push', [
   ('rm-butcher', "Butcher's block stretch", hold(3, 45), [], 'Kneel with elbows on a bench, hold a stick behind your head, sink the chest down. Opens the shoulders for handstands. Needs a bench and a stick.')]),
 ('back-lever', 'Back lever', 'pull', 'pull', [
   ('rm-bl-tuck', 'Tuck back lever', hold(3, 10), ['rm-german-2'], 'From a German hang, lift the hips until the back is level, knees tucked.'),
   ('rm-bl-adv', 'Advanced tuck back lever', hold(3, 8), ['rm-bl-tuck'], 'Back flat, hips open to 90 degrees.'),
   ('rm-bl-straddle', 'Straddle back lever', hold(3, 5), ['rm-bl-adv'], 'Legs straight and wide, body level.'),
   ('rm-bl-full', 'Back lever', hold(3, 5), ['rm-bl-straddle'], 'Legs together, straight line from head to toes, level with the floor.')]),
 ('compression', 'Compact leg lifts', 'core', 'legs', [
   ('rm-compact', 'Compact leg lifts', reps(3, 10), ['core-hollow'], 'Sit with straight legs, hands beside the knees; lift both heels off the floor without leaning back.')]),
 ('reverse-nordic', 'Reverse Nordic', 'legs', 'legs', [
   ('rm-rn-1', 'Partial reverse Nordic', reps(3, 8), ['legs-squat'], 'Kneel tall, lean back in a straight line from knees to head, go only part way, come back up.'),
   ('rm-rn-2', 'Reverse Nordic', reps(3, 8), ['rm-rn-1'], 'Full range lean back, hips stay straight, then return.')]),
 ('straddle-sit', 'Straddle sit', 'core', 'legs', [
   ('rm-straddle-sit', 'Straddle sit', hold(3, 45), [], 'Sit with legs wide and straight, back tall, walk the chest forward. Flexibility for presses.')]),
 ('shoulder-stand', 'Shoulder stand', 'core', 'legs', [
   ('rm-shoulder-stand', 'Shoulder stand', hold(3, 30), ['core-hollow'], 'Lie back, lift the hips and legs straight up, support the hips with the hands, body straight.')]),
 ('one-arm-hang', 'Single-arm hang', 'pull', 'pull', [
   ('rm-oah-1', 'One-arm hang, towel assisted', hold(3, 10), ['pull-pullup'], 'Hang from one hand, the other holds a towel over the bar for a little help. Count each side.'),
   ('rm-oah-2', 'One-arm hang', hold(3, 15), ['rm-oah-1'], 'One hand only, shoulder active, no swinging. Count each side.')]),
 ('v-sit', 'V-sit', 'core', 'legs', [
   ('rm-vsit-1', 'High L-sit', hold(3, 10), ['core-lsit'], 'From an L-sit, lift the legs above hip height, push the shoulders down hard.'),
   ('rm-vsit-2', 'V-sit', hold(3, 5), ['rm-vsit-1'], 'Hands behind the hips, legs up high in a V.')]),
 ('sissy-squat', 'Sissy squat', 'legs', 'legs', [
   ('rm-sissy-1', 'Assisted sissy squat', reps(3, 8), ['legs-squat'], 'Hold a post, rise on the toes, knees travel forward while hips stay straight.'),
   ('rm-sissy-2', 'Sissy squat', reps(3, 8), ['rm-sissy-1'], 'No support. Knees forward, body in a straight line from knees to head.')]),
 ('swing', 'Gymnastics swing', 'pull', 'pull', [
   ('rm-swing', 'Gymnastics swing', reps(3, 10), ['rm-hollow-hang-2'], 'On the bar, move between hollow and arch with straight arms to build a controlled swing.')]),
 ('sl-rdl', 'Single-leg Romanian deadlift', 'legs', 'legs', [
   ('rm-rdl', 'Single-leg Romanian deadlift', reps(3, 10), ['legs-split'], 'Stand on one leg, hinge at the hip with a flat back, free leg goes back. Count each side.')]),
 ('kip-up', 'Kip-up', 'core', 'legs', [
   ('rm-kip-1', 'Roll-back rocks', reps(3, 8), ['rm-shoulder-stand'], 'Roll back onto the shoulders with hands by the ears, then rock forward fast.'),
   ('rm-kip-2', 'Kip-up', reps(3, 3), ['rm-kip-1'], 'Roll back, push through the hands and kick the legs out to land on your feet. Use a soft surface.')]),
 ('dragon-squat', 'Dragon squat', 'legs', 'legs', [
   ('rm-dragon-sq-1', 'Half dragon squat', reps(3, 5), ['legs-pistol'], 'Squat on one leg while the other leg passes behind it; hold something for balance. Count each side.'),
   ('rm-dragon-sq-2', 'Dragon squat', reps(3, 3), ['rm-dragon-sq-1'], 'Full depth, free leg behind and off the floor, no support. Count each side.')]),
 ('back-bridge', 'Back bridge', 'core', 'legs', [
   ('rm-bridge-1', 'Table-top bridge', hold(3, 20), [], 'Hands behind you, lift the hips until the body is flat like a table.'),
   ('rm-bridge-2', 'Back bridge', hold(3, 20), ['rm-bridge-1'], 'From lying down, push up with hands by the ears into an arch; push the shoulders over the hands.')]),
 ('bulgarian-dip', 'Bulgarian dip', 'push', 'push', [
   ('rm-dip', 'Parallel bar dip', reps(3, 10), ['push-standard'], 'On parallel bars, lower until the shoulders are below the elbows, press back up.'),
   ('rm-bulgarian', 'Bulgarian dip', reps(3, 6), ['rm-dip'], 'On rings, turn the rings out and let the hands go wide at the bottom. Needs rings.')]),
 ('lsit-pullup', 'L-sit pull-up', 'pull', 'pull', [
   ('rm-lsit-pullup', 'L-sit pull-up', reps(3, 5), ['pull-pullup', 'core-lsit'], 'Hold the legs straight out in an L and pull up without swinging.')]),
 ('false-grip', 'False-grip pull-up', 'pull', 'pull', [
   ('rm-fg-hang', 'False-grip hang', hold(3, 20), ['pull-pullup'], 'Wrists over the bar (or rings), palms sitting on top: the grip used for muscle-ups.'),
   ('rm-fg-pullup', 'False-grip pull-up', reps(3, 5), ['rm-fg-hang'], 'Keep the false grip all the way up and down.')]),
 ('lsit-handstand', 'L-sit to handstand', 'push', 'push', [
   ('rm-lsit-hs-1', 'Tuck L-sit to wall handstand', reps(3, 3), ['core-lsit', 'push-hs-back'], 'From a tuck L-sit, lean forward and lift the hips until the feet reach the wall.'),
   ('rm-lsit-hs-2', 'L-sit to handstand', reps(3, 1), ['rm-lsit-hs-1'], 'Press from L-sit into a freestanding handstand with straight arms.')]),
 ('ninety-hold', '90-degree hold', 'push', 'push', [
   ('rm-90-1', '90-degree hold, feet on the wall', hold(3, 5), ['rm-elbow-2', 'push-wall-hspu'], 'Bent arms at 90 degrees, body level, feet resting on a wall behind you.'),
   ('rm-90-2', '90-degree hold', hold(3, 5), ['rm-90-1'], 'Same position without the wall.')]),
 ('straddle-press', 'Straddle press', 'push', 'push', [
   ('rm-press-1', 'Straddle press from a box', reps(3, 3), ['push-hs-free', 'rm-straddle-sit'], 'Hands on the floor, feet on a box, lean forward and lift the straddled legs into a handstand.'),
   ('rm-press-2', 'Straddle press', reps(3, 1), ['rm-press-1'], 'From standing in a straddle, press to handstand with straight arms.')]),
 ('pelican', 'Pelican push-up', 'push', 'push', [
   ('rm-pelican', 'Pelican push-up', reps(3, 3), ['rm-bulgarian', 'rm-90-2'], 'An advanced deep push-up with the hands far back by the hips. Watch the video chapter for the exact form before trying.')]),
 ('ring-muscle-up', 'Ring muscle-up', 'pull', 'pull', [
   ('rm-ring-mu-1', 'Low-ring muscle-up transition', reps(3, 3), ['pull-mu', 'rm-fg-pullup'], 'On low rings with feet on the floor, practise turning over the rings with a false grip. Needs rings.'),
   ('rm-ring-mu-2', 'Ring muscle-up', reps(3, 2), ['rm-ring-mu-1'], 'From a false-grip hang, pull, turn over the rings and press to support.')]),
 ('straddle-planche', 'Straddle planche', 'push', 'push', [
   ('rm-sp-1', 'Straddle planche', hold(3, 3), ['push-planche-oneleg'], 'Straight arms, legs wide and straight, body level.'),
   ('rm-sp-2', 'Straddle planche push-up', reps(3, 1), ['rm-sp-1'], 'Lower and press while holding the straddle planche.')]),
 ('hs-kip', 'Handstand to kip-up', 'core', 'legs', [
   ('rm-hs-kip', 'Handstand to kip-up', reps(3, 1), ['push-hs-free', 'rm-kip-2'], 'From a handstand, tuck the chin and roll down, then kip up to your feet in one flow. Use a soft surface.')]),
]

TREE_EXT = [
 {'id': 'pull-fl-straddle', 'name': 'Straddle front lever', 'short': 'Straddle lever', 'branch': 'pull', 'kind': 'skill', 'skill': 'front-lever', 'requires': ['pull-fl-adv'], 'col': 1, 'goal': hold(3, 5), 'cue': 'Legs straight and wide, body level under the bar, arms straight.'},
 {'id': 'push-planche-oneleg', 'name': 'One-leg planche', 'branch': 'push', 'kind': 'skill', 'skill': 'planche', 'requires': ['push-adv-tuck'], 'col': 1, 'goal': hold(3, 5), 'cue': 'From advanced tuck, extend one leg straight back; hips stay level.'},
 {'id': 'core-dragon-full', 'name': 'Dragon flag', 'branch': 'core', 'kind': 'skill', 'skill': 'dragon-flag', 'requires': ['core-dragon'], 'col': 0, 'goal': reps(3, 3), 'cue': 'Straight body from shoulders to toes, lower slowly with control.'},
]

VID = {1: [9,49,126,169,219,249,280,323,350,385,435,463,538,588,620,649,679,728,762,783,846,915],
       2: [8,26,90,142,181,205,250,285,321,340,390,414,434,471,498,540,577,629],
       3: [5,63,127,174,216,231,253,271,282,298]}
ITEMS = {
 1: [('hollow-hang','Hollow body hang',['rm-hollow-hang-1','rm-hollow-hang-2']), ('frog-stand','Frog stand',['rm-frog-1','rm-frog-2']),
     ('hollow-hold','Hollow body hold',['core-hollow']), ('planche-lean','Pseudo planche lean',['rm-lean-1','rm-lean-2']),
     ('pseudo-pushup','Pseudo planche push-up',['push-pseudo']), ('tuck-front-lever','Tuck front lever',['pull-fl-tuck']),
     ('elbow-lever','Elbow lever',['rm-elbow-1','rm-elbow-2']), ('german-hang','German hang',['rm-german-1','rm-german-2']),
     ('butchers-block',"Butcher's block",['rm-butcher']), ('pistol','Pistol squat',['legs-pistol']),
     ('tuck-back-lever','Tuck back lever',['rm-bl-tuck']), ('compact-leg-lifts','Compact leg lifts',['rm-compact']),
     ('pike-pushup','Pike push-ups',['push-pike']), ('l-sit','L-sit',['core-tuck-lsit','core-lsit']),
     ('archer-pushup','Archer push-up',['push-archer']), ('tuck-planche','Tuck planche',['push-tuck-planche']),
     ('reverse-nordic','Reverse Nordic',['rm-rn-1','rm-rn-2']), ('straddle-sit','Straddle sit',['rm-straddle-sit']),
     ('shoulder-stand','Shoulder stand',['rm-shoulder-stand']), ('muscle-up','Muscle-up',['pull-mu-neg','pull-mu']),
     ('handstand','Handstand',['push-hs-chest','push-hs-back','push-hs-free']), ('wall-hspu','Handstand push-up',['push-wall-hspu'])],
 2: [('one-arm-hang','Single-arm hang',['rm-oah-1','rm-oah-2']), ('hanging-leg-raise','Hanging leg raises',['core-leg-raise']),
     ('v-sit','V-sit',['rm-vsit-1','rm-vsit-2']), ('sissy-squat','Sissy squat',['rm-sissy-1','rm-sissy-2']),
     ('swing','Gymnastics swing',['rm-swing']), ('sl-rdl','Bodyweight deadlift (single-leg)',['rm-rdl']),
     ('kip-up','Kip-up',['rm-kip-1','rm-kip-2']), ('back-lever','Back lever',['rm-bl-adv','rm-bl-straddle','rm-bl-full']),
     ('adv-front-lever','Advanced tuck front lever',['pull-fl-adv']), ('half-dragon-squat','Half dragon squat',['rm-dragon-sq-1']),
     ('adv-planche','Advanced tuck planche',['push-adv-tuck']), ('back-bridge','Back bridge',['rm-bridge-1','rm-bridge-2']),
     ('bulgarian-dip','Bulgarian dip',['rm-dip','rm-bulgarian']), ('lsit-pullup','L-sit pull-up',['rm-lsit-pullup']),
     ('false-grip','Wrist (false-grip) pull-ups',['rm-fg-hang','rm-fg-pullup']), ('archer-pullup','Archer pull-up',['pull-archer']),
     ('dragon-flag','Dragon flag',['core-dragon','core-dragon-full']), ('lsit-handstand','L-sit to handstand',['rm-lsit-hs-1','rm-lsit-hs-2'])],
 3: [('ninety-hold','The 90 hold',['rm-90-1','rm-90-2']), ('straddle-press','Straddle press',['rm-press-1','rm-press-2']),
     ('pelican','Pelican push-up',['rm-pelican']), ('dragon-squat','Almighty dragon squat',['rm-dragon-sq-2']),
     ('straddle-front-lever','Straddle front lever',['pull-fl-straddle']), ('ring-muscle-up','Ring muscle-up',['rm-ring-mu-1','rm-ring-mu-2']),
     ('freestanding-hspu','Freestanding handstand push-up',['push-hspu']), ('one-leg-planche','One-leg planche',['push-planche-oneleg']),
     ('straddle-planche','Straddle (planche) push-up',['rm-sp-1','rm-sp-2']), ('hs-kip','Handstand to kip-up',['rm-hs-kip'])],
}

text = open(NODES).read()
assert '"rm-' not in text, 'already applied'
nodes = []
for _, _, branch, _, steps in CHAINS:
    for nid, name, goal, req, cue in steps:
        nodes.append({'id': nid, 'name': name, 'branch': branch, 'kind': 'skill', 'skill': None, 'requires': req, 'col': 0, 'goal': goal, 'cue': cue, 'roadmapOnly': True})
# fill chain ids
i = 0
for cid, _, _, _, steps in CHAINS:
    for _ in steps:
        nodes[i]['skill'] = cid
        i += 1
lines = ',\n'.join('  ' + json.dumps(n, ensure_ascii=False) for n in TREE_EXT + nodes)
end = text.rstrip().rstrip(']').rstrip()
open(NODES, 'w').write(end + ',\n\n' + lines + '\n]\n')

skills = json.load(open(SKILLS))
skills += [{'id': cid, 'name': name, 'day': day, 'roadmapOnly': True} for cid, name, _, day, _ in CHAINS]
open(SKILLS, 'w').write('[\n' + ',\n'.join('  ' + json.dumps(s, ensure_ascii=False) for s in skills) + '\n]\n')

items = []
for year in (1, 2, 3):
    assert len(ITEMS[year]) == len(VID[year])
    for (iid, name, steps), t in zip(ITEMS[year], VID[year]):
        items.append({'id': f'y{year}-{iid}', 'year': year, 'name': name, 'steps': steps, 't': t})
open(ROADMAP, 'w').write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in items) + '\n]\n')
print(len(nodes) + len(TREE_EXT), 'nodes,', len(CHAINS), 'chains,', len(items), 'items')
