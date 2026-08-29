import { ObjectEntry } from "../../db";

export interface ObjectTemplate {
  name: string;
  material: string;
  category: string;
  failureMode: string;
  debrisDescription: string;
  soundDescription: string;
}

const OBJECT_TEMPLATES: ObjectTemplate[] = [
  {
    name: "Coca-Cola Can",
    material: "Aluminum",
    category: "Beverage",
    failureMode: "buckles and folds inward/outward unevenly before flattening, aluminum crumples and creases",
    debrisDescription: "no debris, aluminum stays intact as it flattens",
    soundDescription: "hollow metallic crumple, then crunch as aluminum folds",
  },
  {
    name: "Ripe Red Watermelon",
    material: "Organic",
    category: "Food",
    failureMode: "skin splits open under pressure, flesh crushes and juice squeezes outward at the edges as it is compressed, volume conserved",
    debrisDescription: "juice and red flesh fragments squeeze out at plate edges, staying low to the ground",
    soundDescription: "wet squish and crack as skin splits, then mushy compression",
  },
  {
    name: "Ceramic Coffee Mug",
    material: "Ceramic",
    category: "Kitchen",
    failureMode: "cracks and fragments outward at contact points before full collapse, brittle shattering into sharp shards",
    debrisDescription: "ceramic shards and powder scatter outward at plate edges, staying low",
    soundDescription: "sharp crack and tinkle of breaking ceramic, then grinding as fragments compress",
  },
  {
    name: "Tennis Ball",
    material: "Rubber/Felt",
    category: "Sports",
    failureMode: "flattens and material squeezes outward at the edges, rubber deforms progressively, felt tears",
    debrisDescription: "no debris, rubber stays intact as it flattens",
    soundDescription: "rubbery squish and pop as felt tears, then flat compression",
  },
  {
    name: "Cardboard Box",
    material: "Cardboard",
    category: "Packaging",
    failureMode: "buckles and folds inward unevenly, corrugated layers crush and compress, not symmetrically",
    debrisDescription: "small cardboard fibers and dust at plate edges",
    soundDescription: "dry crunching and folding of cardboard layers",
  },
  {
    name: "Glass Bottle",
    material: "Glass",
    category: "Beverage",
    failureMode: "cracks and fragments outward at contact points, brittle shattering into sharp shards before full collapse",
    debrisDescription: "glass shards and powder scatter outward at plate edges, staying low",
    soundDescription: "sharp crack and tinkle of breaking glass, then grinding as fragments compress",
  },
  {
    name: "Banana",
    material: "Organic",
    category: "Food",
    failureMode: "skin splits open, flesh crushes and squeezes outward, soft organic material deforms progressively",
    debrisDescription: "banana flesh and skin fragments squeeze out at plate edges",
    soundDescription: "wet squish and soft crack as skin splits",
  },
  {
    name: "Rubber Duck",
    material: "Rubber",
    category: "Toy",
    failureMode: "flattens and material squeezes outward at the edges, rubber deforms progressively, air escapes with a squeak",
    debrisDescription: "no debris, rubber stays intact as it flattens",
    soundDescription: "air squeak as rubber compresses, then flat rubber squish",
  },
  {
    name: "Old Keyboard",
    material: "Plastic/Metal",
    category: "Electronics",
    failureMode: "keys pop off, plastic casing buckles and cracks, circuit board bends and fragments",
    debrisDescription: "plastic keycaps and fragments scatter outward, staying low",
    soundDescription: "plastic cracking and snapping, keys pinging off, then crunching",
  },
  {
    name: "Styrofoam Cup",
    material: "Styrofoam",
    category: "Packaging",
    failureMode: "compresses and crumples inward, styrofoam squeaks and deforms, material stays mostly intact",
    debrisDescription: "small styrofoam beads and fragments at plate edges",
    soundDescription: "squeaky styrofoam compression, then quiet crunch",
  },
  {
    name: "Pillow",
    material: "Fabric/Feather",
    category: "Home",
    failureMode: "fabric tears, feathers and stuffing squeeze outward at the edges as it is compressed",
    debrisDescription: "feathers and fabric fibers float outward and settle low to the ground",
    soundDescription: "fabric tearing, soft whoosh of escaping feathers",
  },
  {
    name: "Egg",
    material: "Organic/Shell",
    category: "Food",
    failureMode: "shell cracks and fragments outward, yolk and white squeeze out at the edges",
    debrisDescription: "shell fragments and egg contents squeeze out at plate edges",
    soundDescription: "sharp crack of shell, wet squish of contents",
  },
  {
    name: "Running Shoe",
    material: "Leather/Rubber",
    category: "Fashion",
    failureMode: "sole compresses, leather upper buckles and folds, rubber deforms progressively",
    debrisDescription: "no major debris, material stays mostly intact",
    soundDescription: "leather creaking, rubber squishing, then flat compression",
  },
  {
    name: "Apple",
    material: "Organic",
    category: "Food",
    failureMode: "skin splits, flesh crushes and juice squeezes outward, firm organic material deforms",
    debrisDescription: "apple flesh and juice squeeze out at plate edges",
    soundDescription: "crunchy crack as skin splits, wet compression",
  },
  {
    name: "Kitchen Sponge",
    material: "Foam",
    category: "Home",
    failureMode: "compresses flat, foam squeezes and water squeezes out if wet, material stays intact",
    debrisDescription: "water droplets squeeze out at plate edges if sponge is wet",
    soundDescription: "quiet squish, then flat compression",
  },
  {
    name: "Hardcover Book",
    material: "Paper",
    category: "Education",
    failureMode: "pages crush and compress, cover buckles, paper fibers compress and flatten",
    debrisDescription: "paper fragments and dust at plate edges",
    soundDescription: "dry crunching of paper, then grinding as pages compress",
  },
  {
    name: "CD Disc",
    material: "Polycarbonate",
    category: "Electronics",
    failureMode: "cracks and shatters into sharp fragments, brittle plastic failure before full collapse",
    debrisDescription: "polycarbonate shards scatter outward at plate edges",
    soundDescription: "sharp crack and tinkle of breaking plastic",
  },
  {
    name: "Golf Ball",
    material: "Rubber/Resin",
    category: "Sports",
    failureMode: "outer shell cracks, rubber core deforms and flattens progressively",
    debrisDescription: "small shell fragments at plate edges",
    soundDescription: "sharp crack of shell, rubbery compression",
  },
  {
    name: "Slipper",
    material: "Foam/Rubber",
    category: "Fashion",
    failureMode: "foam compresses flat, rubber sole deforms, material squeezes outward at edges",
    debrisDescription: "no major debris, material stays intact",
    soundDescription: "foam squishing, rubber compression",
  },
  {
    name: "Soap Bar",
    material: "Soap",
    category: "Home",
    failureMode: "cracks and fragments, then compresses into a flat disc, soap shaves off at edges",
    debrisDescription: "soap shavings and fragments at plate edges",
    soundDescription: "dry crack, then grinding compression",
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getTemplates(): ObjectTemplate[] {
  return OBJECT_TEMPLATES;
}

export function generatePrompt(template: ObjectTemplate): string {
  return `A hyper-realistic, documentary-style industrial video: a hydraulic press slowly crushing a ${template.name} in a small mechanical workshop.

Machine details: Heavy-duty steel hydraulic press, oil-stained hydraulic cylinder, visible scratches, rust spots, and worn metal texture on the frame. Bolted to a stained concrete floor. Hydraulic hoses visible at the sides, slightly oily and worn.

Object placement: The ${template.name} sits exactly centered on the flat bottom steel plate, resting naturally under gravity (correct shadow, correct contact points — not floating or perfectly balanced in an artificial way).

Camera: Fixed tripod, straight-on eye-level front angle, no movement, no zoom. Static single shot, entire event in one continuous take. 1080p, 30fps, slight lens grain, handheld-adjacent but locked-off framing — like a real fixed security or workshop demo camera, not a cinema rig.

Lighting: Flat fluorescent overhead workshop lighting, slight greenish-white cast, visible hard shadows under the press and object, no rim lighting, no lens flares, no color grading.

Physics — critical:

Top plate descends at a slow, constant hydraulic speed — no sudden jumps in speed.
Plates remain perfectly parallel and horizontal throughout — zero tilt.
The object deforms progressively and realistically based on its real material properties: ${template.failureMode}.
Debris or expelled material: ${template.debrisDescription}.
No bounce-back, no plate hesitation, no reversal.
Sequence ends with the top and bottom plates fully flush and touching, object completely flattened/compressed between them, with any expelled material visible squeezed out at the plate edges.

Audio: Low mechanical hydraulic hum, occasional metallic creak, ${template.soundDescription}, then a final solid metal-on-metal clunk when plates fully meet. No music, no foley exaggeration, no ambient effects layered for drama.

Style: Raw, unpolished industrial test-footage aesthetic — like a real workshop demonstration video, not a produced ad. Slightly imperfect exposure, no dramatic color grading, no slow motion.

Negative prompt: no cartoon physics, no exaggerated stretching or squashing, no glowing or magical effects, no explosion unless the object is explicitly explosive, no floating debris, no camera shake or movement, no slow-motion ramping, no gap between plates at the end, no object disappearing/teleporting, no CGI-clean textures, no music, no dramatic lighting shifts.`;
}

export function generateTitle(template: ObjectTemplate): string {
  const hooks = [
    "THIS WAS SO SATISFYING",
    "YOU WON'T BELIEVE WHAT HAPPENS",
    "INCREDIBLE DESTRUCTION",
    "SO MUCH PRESSURE",
    "WATCH IT CRUMBLE",
    "ABSOLUTELY CRUSHED",
    "TOTAL DESTRUCTION",
    "SLOW AND DESTRUCTIVE",
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  return `Hydraulic Press Crushing ${template.name} - ${hook} #Shorts`;
}

export function generateDescription(template: ObjectTemplate): string {
  return (
    `Watch this ${template.material.toLowerCase()} ${template.name.toLowerCase()} get completely destroyed by a hydraulic press!\n\n` +
    `Object: ${template.name}\n` +
    `Material: ${template.material}\n` +
    `Category: ${template.category}\n` +
    `Failure Mode: ${template.failureMode}\n\n` +
    `#Shorts #HydraulicPress #Satisfying #Crushing #${template.name.replace(/\s+/g, "")} #Destruction #HydraulicPressChannel`
  );
}

export function generateTags(template: ObjectTemplate): string[] {
  return [
    "hydraulic press",
    "satisfying",
    "crushing",
    "destruction",
    template.name.toLowerCase(),
    template.material.toLowerCase(),
    template.category.toLowerCase(),
    "shorts",
    "hydraulic press crushing",
    "industrial",
    "workshop",
    "real",
    "documentary",
  ];
}
