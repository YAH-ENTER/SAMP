/* ==========================================================================
   roof3d.js — the roof anatomy model, rebuilt on Three.js.

   Replaces a hand-written canvas-2D rasteriser. Everything that was fought for
   by hand is now the renderer's job and is correct by construction:

     - occlusion comes from the hardware depth buffer, so the house is solid
       from every angle with no sorting or culling tricks
     - antialiasing is MSAA, so edges do not crawl or shimmer
     - surfaces are real lit materials with a cast shadow, not flat greys

   Built to the three-best-practices skill: import maps rather than CDN script
   tags, renderer.setAnimationLoop rather than manual rAF, two lights with a
   tight shadow frustum, and geometry/material disposal on teardown.

   The model stays STATIONARY. A ring pulses outward on the ground to say it is
   interactive. Labels sit on the part they name and are hidden by raycast when
   geometry stands in front of them. Clicking one flies the camera to it.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ------------------------------------------------------------- dimensions */
const MX = 5.2, MZ = 3.4, WH = 6.4, RH = 10.6, OH = 0.55;
const EX = MX + OH, EZ = MZ + OH;
const GX0 = -1.8, GX1 = 1.8, GZ = 5.6, GRH = 10.6, GEZ = GZ + OH, gMid = 0;
const WX0 = -10.6, WX1 = -5.2, WZ0 = -2.3, WZ1 = 2.7;
const WWH = 5.2, WRH = 8.4, WEZ = WZ1 + OH, WEX = WX0 - OH;
const wMidZ = (WZ0 + WZ1) / 2;
const IN = 1 / 46;            // one unit is about 46 inches
const TRIM = 1.6;             // lift the thinnest trim so it still reads

const slopeZ = (y) => EZ * (1 - (y - WH) / (RH - WH));

/* -------------------------------------------------------------- materials */
// monochrome by request: one grey per material, differentiated by roughness
const MATS = {
  roof:    new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.97, metalness: 0.0, side: THREE.DoubleSide }),
  shingle: new THREE.MeshStandardMaterial({ color: 0x585c62, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }),
  siding:  new THREE.MeshStandardMaterial({ color: 0x9fa0a0, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }),
  trim:    new THREE.MeshStandardMaterial({ color: 0xd8d8d6, roughness: 0.7,  metalness: 0.0, side: THREE.DoubleSide }),
  brick:   new THREE.MeshStandardMaterial({ color: 0x75777a, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }),
  glass:   new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.18, metalness: 0.5, side: THREE.DoubleSide }),
  shutter: new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.8,  metalness: 0.0, side: THREE.DoubleSide }),
  metal:   new THREE.MeshStandardMaterial({ color: 0xb6babd, roughness: 0.42, metalness: 0.55, side: THREE.DoubleSide }),
  porch:   new THREE.MeshStandardMaterial({ color: 0xcfd0cf, roughness: 0.75, metalness: 0.0, side: THREE.DoubleSide })
};

const GREEN = 0x66bc45;

/* ---------------------------------------------------------------- helpers */
const disposables = [];
function track(g) { disposables.push(g); return g; }

function addBox(parent, x0, x1, y0, y1, z0, z1, mat) {
  const g = track(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)));
  const m = new THREE.Mesh(g, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// a flat polygon in a plane, given as [x,y] pairs, extruded to a thin slab
function addPlate(parent, pts, mat, depth, axis, offset) {
  const shape = new THREE.Shape();
  pts.forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])));
  shape.closePath();
  const g = track(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }));
  const m = new THREE.Mesh(g, mat);
  if (axis === "z") m.position.z = offset;
  else { m.rotation.y = Math.PI / 2; m.position.x = offset; }
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// a roof plane: four corners in 3D, as a two-triangle mesh with thickness
function addQuad(parent, a, b, c, d, mat) {
  const g = track(new THREE.BufferGeometry());
  const v = new Float32Array([
    a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2],
    a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

/* ---- 3-tab asphalt shingles, as geometry ---------------------------------
   The planes above are the deck. The shingles are laid on top of it as real
   relief rather than drawn on, because the thing that makes a 3-tab roof
   recognisable is the shadow: a hard line under every course butt, and a short
   vertical nick at every cutout.

   To spec: 12 by 36 inch shingles, three tabs each so a cutout falls every 12
   inches, about 5 inches of exposure, and each course shifted 6 inches — half a
   tab — so no two cutouts ever stack up.

   Every plane feeds ONE merged buffer, so the whole roof is a single draw call
   instead of a few thousand.
-------------------------------------------------------------------------- */
const SHING = [];

// Corners go eave-left, eave-right, ridge-right, ridge-left. A hip or a gable
// return passes its apex twice: the bilinear read below collapses that edge on
// its own, and the courses narrow into the point the way they should.
function shinglePlane(P0, P1, P2, P3) {
  const p0 = new THREE.Vector3(...P0), p1 = new THREE.Vector3(...P1);
  const p2 = new THREE.Vector3(...P2), p3 = new THREE.Vector3(...P3);
  const at = (u, v) => p0.clone().lerp(p1, u).lerp(p3.clone().lerp(p2, u), v);

  let n = new THREE.Vector3().subVectors(p1, p0)
    .cross(new THREE.Vector3().subVectors(p3, p0));
  if (n.lengthSq() < 1e-9) return;
  n.normalize();
  if (n.y < 0) n.negate();                     // always stand off the deck

  // A course's butt rests on the head of the course below it, then settles onto
  // the deck further up the slope. So each course ramps DOWN as it rises, and
  // the next course's butt steps back up over it. That step is the shadow line
  // every course throws, and because the profile resets each course it never
  // accumulates up the roof.
  const BASE = n.clone().multiplyScalar(0.5 * IN);
  const STEP = n.clone().multiplyScalar(1.7 * IN);
  const butt = BASE.clone().add(STEP);          // lifted, at the course butt
  const head = BASE;                            // down on the deck, up-slope

  const slope = Math.max(p0.distanceTo(p3), p1.distanceTo(p2));
  const run = Math.max(p0.distanceTo(p1), p3.distanceTo(p2));
  const courses = Math.max(2, Math.round(slope / (5 * IN)));
  const tabs = Math.max(1, Math.round(run / (12 * IN)));
  const slot = Math.min(0.4, (1.1 * IN) / Math.max(run, 1e-4));   // the cutout

  const tri = (a, b, c) => SHING.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };

  for (let ci = 0; ci < courses; ci++) {
    const v0 = ci / courses, v1 = (ci + 1) / courses;
    const shift = (ci % 2) * 0.5;              // 6 inches on a 12 inch tab
    for (let ti = -1; ti <= tabs; ti++) {
      let u0 = (ti + shift) / tabs + slot / 2;
      let u1 = (ti + 1 + shift) / tabs - slot / 2;
      if (u1 <= 0 || u0 >= 1) continue;
      u0 = Math.max(0, u0); u1 = Math.min(1, u1);
      if (u1 - u0 < 1e-4) continue;
      const a = at(u0, v0).add(butt), b = at(u1, v0).add(butt);
      const c = at(u1, v1).add(head), d = at(u0, v1).add(head);
      quad(a, b, c, d);                        // the exposed face of the course
      // the butt edge: a step up off the head of the course below, which is
      // what throws the shadow line, plus the nick at each tab cutout
      quad(at(u0, v0).add(head), at(u1, v0).add(head), b, a);
    }
  }
}

function addShingles(parent) {
  if (!SHING.length) return;
  const g = track(new THREE.BufferGeometry());
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SHING), 3));
  g.computeVertexNormals();                    // non-indexed, so these stay crisp
  const m = new THREE.Mesh(g, MATS.shingle);
  m.castShadow = true; m.receiveShadow = true;
  // The label occlusion test raycasts the house, and raycasting is CPU work with
  // no acceleration structure behind it. These forty thousand triangles are
  // forty thousand ray tests per label per frame, for nothing: a shingle sits on
  // the roof deck, and the deck is already an occluder. So skip them.
  m.raycast = () => {};
  parent.add(m);
  SHING.length = 0;
}

/* ---- the 5in K-style gutter, swept from its real section ------------------
   5in top opening front to back, about 3.5in high, 3.125in bottom, half inch
   front lip, rolled from 11.75in coil. The face LEANS outward and carries a
   concave break then a convex roll: that is what makes it read as a gutter.
   ExtrudeGeometry along the run is exactly the right tool for this.
-------------------------------------------------------------------------- */
const KSEC = [
  [0.00, 3.50], [0.00, 0.00], [3.125, 0.00],
  [3.30, 0.45], [3.25, 0.95], [4.05, 2.05], [4.75, 2.70],
  [5.00, 3.05], [4.55, 3.05], [4.55, 3.30], [0.25, 3.30]
];

function addGutter(parent, x0, x1, yTop, zFascia, dir) {
  const s = IN * TRIM;
  const shape = new THREE.Shape();
  KSEC.forEach((p, i) => {
    // negated because the quarter turn below maps the shape's first axis to -z
    const z = -dir * p[0] * s, y = p[1] * s;
    i ? shape.lineTo(z, y) : shape.moveTo(z, y);
  });
  shape.closePath();
  const g = track(new THREE.ExtrudeGeometry(shape, { depth: Math.abs(x1 - x0), bevelEnabled: false }));
  const m = new THREE.Mesh(g, MATS.metal);
  // the section is drawn in the z/y plane and extrudes along +z, so a quarter
  // turn sends the extrusion down the run in +x and the section out in z
  m.rotation.y = Math.PI / 2;
  m.position.set(Math.min(x0, x1), yTop - 3.5 * s, zFascia);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);

  // hidden hangers bridging the open top
  const step = 30 * IN;
  for (let hx = Math.min(x0, x1) + step; hx < Math.max(x0, x1) - step * 0.4; hx += step) {
    addBox(parent, hx - 0.012, hx + 0.012, yTop - 0.4 * s, yTop - 0.15 * s,
           zFascia + dir * 0.3 * s, zFascia + dir * 4.7 * s, MATS.metal);
  }
}

// fascia, soffit and drip edge, read from the roof edge inward
function addEaveTrim(parent, x0, x1, yEave, zEdge, zWall, dir) {
  // The roof planes are zero-thickness quads, so anything whose top sits at
  // exactly yEave is coplanar with the roof's lower edge and the two fight for
  // the depth buffer, which shows up as a sawtooth running the length of the
  // eave. Everything below the roof is dropped clear of it by EPS.
  const EPS = 0.035;
  const top = yEave - EPS;
  const fd = 7.25 * IN * TRIM;
  addBox(parent, x0, x1, top - fd, top, zEdge, zEdge + dir * 0.75 * IN * TRIM, MATS.trim);
  addBox(parent, x0, x1, top - fd - 0.02, top - fd, Math.min(zEdge, zWall), Math.max(zEdge, zWall), MATS.trim);
  const dl = 1.5 * IN * TRIM;
  addBox(parent, x0, x1, top - dl, top, zEdge + dir * 0.4 * IN * TRIM, zEdge + dir * 0.9 * IN * TRIM, MATS.metal);
}

function addDownspout(parent, x, yTop, zWall, dir) {
  const w = 2 * IN * TRIM, d = 3 * IN * TRIM, off = 1.5 * IN * TRIM;
  const zc = zWall + dir * (off + d / 2);
  addBox(parent, x - w / 2, x + w / 2, 10 * IN, yTop, zc - d / 2, zc + d / 2, MATS.metal);
  addBox(parent, x - w / 2, x + w / 2, yTop, yTop + 5 * IN * TRIM,
         zc - d / 2 + dir * 1.4 * IN * TRIM, zc + d / 2 + dir * 1.4 * IN * TRIM, MATS.metal);
  addBox(parent, x - w / 2, x + w / 2, 2 * IN, 10 * IN,
         zc - d / 2 + dir * 3.5 * IN * TRIM, zc + d / 2 + dir * 3.5 * IN * TRIM, MATS.metal);
}

// shuttered double-hung sash
function addWindow(parent, plane, c, cx, cy, w, h, shutters) {
  const hw = w / 2, hh = h / 2, t = 0.9 * IN * TRIM;
  if (plane === "z") {
    addBox(parent, cx - hw, cx + hw, cy - hh, cy + hh, c, c + t, MATS.glass);
    addBox(parent, cx - hw - 0.05, cx + hw + 0.05, cy + hh, cy + hh + 0.07, c, c + t * 1.6, MATS.trim);
    addBox(parent, cx - hw - 0.05, cx + hw + 0.05, cy - hh - 0.05, cy - hh, c, c + t * 2.2, MATS.trim);
    addBox(parent, cx - hw - 0.02, cx + hw + 0.02, cy - 0.015, cy + 0.015, c + t, c + t * 1.3, MATS.trim);
    if (shutters) {
      [[-hw - 0.38, -hw - 0.06], [hw + 0.06, hw + 0.38]].forEach((s) =>
        addBox(parent, cx + s[0], cx + s[1], cy - hh, cy + hh, c, c + t * 0.8, MATS.shutter));
    }
  } else {
    addBox(parent, c, c + t, cy - hh, cy + hh, cx - hw, cx + hw, MATS.glass);
    addBox(parent, c, c + t * 1.6, cy + hh, cy + hh + 0.07, cx - hw - 0.05, cx + hw + 0.05, MATS.trim);
  }
}

/* ------------------------------------------------------------ build it all */
function buildHouse() {
  const house = new THREE.Group();

  // main block
  addBox(house, -MX, MX, 0, WH, -MZ, MZ, MATS.siding);
  addBox(house, -MX - 0.08, MX + 0.08, 0, 0.5, -MZ - 0.08, MZ + 0.08, MATS.brick);

  // gable ends
  addPlate(house, [[-MZ, WH], [MZ, WH], [0, RH]], MATS.siding, 0.06, "x", MX);
  addPlate(house, [[-MZ, WH], [MZ, WH], [0, RH]], MATS.siding, 0.06, "x", -MX - 0.06);

  // main roof planes
  addQuad(house, [-EX, WH, EZ], [EX, WH, EZ], [EX, RH, 0], [-EX, RH, 0], MATS.roof);
  shinglePlane([-EX, WH, EZ], [EX, WH, EZ], [EX, RH, 0], [-EX, RH, 0]);
  addQuad(house, [-EX, WH, -EZ], [EX, WH, -EZ], [EX, RH, 0], [-EX, RH, 0], MATS.roof);
  shinglePlane([-EX, WH, -EZ], [EX, WH, -EZ], [EX, RH, 0], [-EX, RH, 0]);
  addBox(house, -EX, EX, RH - 0.04, RH + 0.09, -0.16, 0.16, MATS.roof);   // ridge cap

  // sashes
  [-4.3, -3.1, 2.3, 3.5, 4.5].forEach((x) => addWindow(house, "z", MZ, x, 1.7, 0.9, 1.7, true));
  [-4.3, -3.1, 2.3, 3.5, 4.5].forEach((x) => addWindow(house, "z", MZ, x, 4.2, 0.9, 1.5, true));
  [-3.4, 0, 3.4].forEach((x) => addWindow(house, "z", -MZ - 0.04, x, 1.7, 0.9, 1.7, true));
  [-3.4, 0, 3.4].forEach((x) => addWindow(house, "z", -MZ - 0.04, x, 4.2, 0.9, 1.5, true));

  // centre entrance gable
  addBox(house, GX0, GX1, 0, WH, MZ, GZ, MATS.siding);
  addBox(house, GX0 - 0.1, GX1 + 0.1, 0, 0.5, MZ, GZ + 0.1, MATS.brick);
  addPlate(house, [[GX0, WH], [GX1, WH], [gMid, GRH]], MATS.siding, 0.06, "z", GZ);
  addQuad(house, [GX0 - OH, WH, GEZ], [gMid, GRH, GEZ], [gMid, GRH, 0], [GX0 - OH, WH, 0], MATS.roof);
  shinglePlane([GX0 - OH, WH, GEZ], [GX0 - OH, WH, 0], [gMid, GRH, 0], [gMid, GRH, GEZ]);
  addQuad(house, [GX1 + OH, WH, GEZ], [gMid, GRH, GEZ], [gMid, GRH, 0], [GX1 + OH, WH, 0], MATS.roof);
  shinglePlane([GX1 + OH, WH, GEZ], [GX1 + OH, WH, 0], [gMid, GRH, 0], [gMid, GRH, GEZ]);
  addWindow(house, "z", GZ + 0.06, gMid, 4.3, 1.4, 1.6, false);
  addBox(house, gMid - 0.55, gMid + 0.55, 0.5, 2.7, GZ + 0.06, GZ + 0.12, MATS.trim);

  // Columned porch. The roof is a shed slope running from a ledger on the wall
  // down to a beam over the posts, which is what ties it to the house; a flat
  // slab read as a shelf floating in front of the elevation.
  const PZ = GZ + 1.7;          // post line
  const PY_HI = 3.55;           // ledger at the wall
  const PY_LO = 3.05;           // beam over the posts
  const PX0 = GX0 - 0.3, PX1 = GX1 + 0.3;
  const PE = PZ + 0.45;         // the slope oversails the beam

  // deck and its one step
  addBox(house, PX0, PX1, 0.26, 0.56, GZ, PE, MATS.porch);
  addBox(house, gMid - 1.1, gMid + 1.1, 0.02, 0.26, PE, PE + 0.34, MATS.porch);

  // posts, with a plinth and a cap so they read as columns
  [gMid - 1.5, gMid + 1.5].forEach((px) => {
    addBox(house, px - 0.11, px + 0.11, 0.56, PY_LO, PZ - 0.11, PZ + 0.11, MATS.porch);
    addBox(house, px - 0.17, px + 0.17, 0.56, 0.76, PZ - 0.17, PZ + 0.17, MATS.porch);
    addBox(house, px - 0.17, px + 0.17, PY_LO - 0.2, PY_LO, PZ - 0.17, PZ + 0.17, MATS.porch);
  });

  // beam across the post heads, then the sloped roof plane over it
  addBox(house, PX0, PX1, PY_LO, PY_LO + 0.22, PZ - 0.14, PZ + 0.14, MATS.porch);
  addQuad(house, [PX0, PY_HI, GZ], [PX1, PY_HI, GZ], [PX1, PY_LO + 0.22, PE], [PX0, PY_LO + 0.22, PE], MATS.roof);
  shinglePlane([PX0, PY_LO + 0.22, PE], [PX1, PY_LO + 0.22, PE], [PX1, PY_HI, GZ], [PX0, PY_HI, GZ]);
  // fascia on the low edge, and returns closing the slope at each end
  addBox(house, PX0, PX1, PY_LO + 0.06, PY_LO + 0.24, PE - 0.05, PE, MATS.trim);
  const RET = [[-GZ, PY_HI], [-PE, PY_LO + 0.22], [-PE, PY_LO], [-GZ, PY_HI - 0.2]];
  addPlate(house, RET, MATS.trim, 0.05, "x", PX1);
  addPlate(house, RET, MATS.trim, 0.05, "x", PX0 - 0.05);

  // dormers
  function dormer(xc, dw) {
    const y0 = WH + 0.20 * (RH - WH), y1 = y0 + 1.15, apex = y1 + 0.55;
    const zf = slopeZ(y0), zE = slopeZ(y1), zA = slopeZ(apex);
    addBox(house, xc - dw, xc + dw, y0, y1, zf - 0.06, zf, MATS.siding);
    addPlate(house, [[xc - dw, y1], [xc + dw, y1], [xc, apex]], MATS.siding, 0.06, "z", zf - 0.06);
    addQuad(house, [xc - dw, y1, zf], [xc, apex, zf], [xc, apex, zA], [xc - dw, y1, zE], MATS.roof);
    shinglePlane([xc - dw, y1, zf], [xc - dw, y1, zE], [xc, apex, zA], [xc, apex, zf]);
    addQuad(house, [xc + dw, y1, zf], [xc, apex, zf], [xc, apex, zA], [xc + dw, y1, zE], MATS.roof);
    shinglePlane([xc + dw, y1, zf], [xc + dw, y1, zE], [xc, apex, zA], [xc, apex, zf]);
    addWindow(house, "z", zf, xc, y0 + 0.6, 0.6, 0.85, false);
  }
  dormer(-3.5, 0.52);
  dormer(3.5, 0.52);

  // left wing with a hipped end
  addBox(house, WX0, WX1, 0, WWH, WZ0, WZ1, MATS.siding);
  addBox(house, WX0 - 0.08, WX1, 0, 0.5, WZ0 - 0.08, WZ1 + 0.08, MATS.brick);
  const hipX = WX0 + 1.5;
  addQuad(house, [WEX, WWH, WEZ], [WX1, WWH, WEZ], [WX1, WRH, wMidZ], [hipX, WRH, wMidZ], MATS.roof);
  shinglePlane([WEX, WWH, WEZ], [WX1, WWH, WEZ], [WX1, WRH, wMidZ], [hipX, WRH, wMidZ]);
  addQuad(house, [WEX, WWH, WZ0 - OH], [WX1, WWH, WZ0 - OH], [WX1, WRH, wMidZ], [hipX, WRH, wMidZ], MATS.roof);
  shinglePlane([WEX, WWH, WZ0 - OH], [WX1, WWH, WZ0 - OH], [WX1, WRH, wMidZ], [hipX, WRH, wMidZ]);
  addQuad(house, [WEX, WWH, WEZ], [WEX, WWH, WZ0 - OH], [hipX, WRH, wMidZ], [hipX, WRH, wMidZ], MATS.roof);
  shinglePlane([WEX, WWH, WEZ], [WEX, WWH, WZ0 - OH], [hipX, WRH, wMidZ], [hipX, WRH, wMidZ]);
  addBox(house, hipX, WX1, WRH - 0.04, WRH + 0.08, wMidZ - 0.14, wMidZ + 0.14, MATS.roof);

  // garage doors
  [-9.1, -6.6].forEach((gx) => {
    addBox(house, gx - 1.1, gx + 1.1, 0.5, 2.9, WZ1, WZ1 + 0.06, MATS.trim);
    for (let i = 1; i < 4; i++) {
      addBox(house, gx - 1.1, gx + 1.1, 0.5 + (2.4 / 4) * i - 0.012, 0.5 + (2.4 / 4) * i + 0.012,
             WZ1 + 0.06, WZ1 + 0.09, MATS.shutter);
    }
  });
  addWindow(house, "z", WZ1, -7.9, 3.8, 0.8, 1.0, true);

  // chimney with crown and flue
  const cx0 = 3.7, cx1 = 4.6, cz0 = -1.3, cz1 = -0.4, cTop = 12.4;
  addBox(house, cx0, cx1, 6.0, cTop, cz0, cz1, MATS.brick);
  addBox(house, cx0 - 0.12, cx1 + 0.12, cTop, cTop + 0.18, cz0 - 0.12, cz1 + 0.12, MATS.trim);
  addBox(house, cx0 + 0.22, cx1 - 0.22, cTop + 0.18, cTop + 0.62, cz0 + 0.22, cz1 - 0.22, MATS.metal);

  // ridge vent, box vents, pipe boots
  addBox(house, -2.6, 2.6, RH + 0.09, RH + 0.2, -0.26, 0.26, MATS.metal);
  [[-1.4, 0.62], [1.4, 0.62]].forEach(([u, v]) => {
    const y = WH + v * (RH - WH), z = -EZ * (1 - v);
    addBox(house, u - 0.3, u + 0.3, y, y + 0.22, z - 0.3, z + 0.3, MATS.metal);
  });
  [[-0.9, 0.36], [0.7, 0.46]].forEach(([u, v]) => {
    const y = WH + v * (RH - WH), z = -EZ * (1 - v);
    addBox(house, u - 0.1, u + 0.1, y, y + 0.5, z - 0.1, z + 0.1, MATS.metal);
  });

  // eave assembly and gutters
  addEaveTrim(house, -EX, EX, WH, EZ, MZ, 1);
  addEaveTrim(house, -EX, EX, WH, -EZ, -MZ, -1);
  addEaveTrim(house, WEX, WX1, WWH, WEZ, WZ1, 1);
  addGutter(house, -EX, EX, WH - 1.6 * IN * TRIM, EZ, 1);
  addGutter(house, -EX, EX, WH - 1.6 * IN * TRIM, -EZ, -1);
  addGutter(house, WEX, WX1, WWH - 1.6 * IN * TRIM, WEZ, 1);
  addDownspout(house, EX - 0.18, WH - 5.5 * IN * TRIM, EZ, 1);
  addDownspout(house, WEX + 0.22, WWH - 5.5 * IN * TRIM, WEZ, 1);

  // every plane laid above merges into one mesh here
  addShingles(house);

  return house;
}

/* ------------------------------------------------------------- the parts */
const PARTS = [
  { id: "ridge", p: [0.8, RH + 0.2, 0], label: "Ridge &amp; ridge vent",
    body: "The high line where the two slopes meet. The vent runs along it and lets hot attic air out; it only works if the soffits can draw air in.",
    view: { theta: 0.5, phi: 1.0, dist: 13 } },
  { id: "hip", p: [WX0 - 0.1, (WWH + WRH) / 2, wMidZ], label: "Hip",
    body: "The outward sloping ridge where two planes meet at a corner. Hips shed water from two directions at once and need their own cap course.",
    view: { theta: 2.3, phi: 1.15, dist: 10 } },
  { id: "valley", p: [GX1 + OH, WH + 0.4, EZ - 0.5], label: "Valley",
    body: "The inward joint where the entrance gable meets the main roof. Every drop off both planes funnels through here, which is why valleys leak before fields do.",
    view: { theta: 0.42, phi: 1.2, dist: 7 } },
  { id: "rake", p: [-EX + 0.1, (WH + RH) / 2, EZ / 2], label: "Rake edge",
    body: "The sloped edge over a gable end. Wind gets under shingles here first. That is what the starter course along the rake is for.",
    view: { theta: 1.1, phi: 1.3, dist: 11 } },
  { id: "eave", p: [2.2, WH - 0.1, EZ + 0.2], label: "Eave, fascia &amp; drip edge",
    body: "The low edge that overhangs the wall. Fascia closes the rafter tails, the drip edge throws water clear of it, and the gutter catches what comes off.",
    view: { theta: 0.3, phi: 1.45, dist: 6 } },
  { id: "gutter", p: [-1.0, WH - 0.2, EZ + 0.24], label: "Gutter &amp; downspout",
    body: "A 5 inch K-style gutter: 5 inch opening, three and a half inches deep, rolled from a twelve inch strip. The face leans out and breaks twice; that rake and those breaks are what let it shed and keep it stiff.",
    view: { theta: 0.3, phi: 1.5, dist: 5 } },
  { id: "soffit", p: [-2.4, WH - 0.34, EZ + 0.1], label: "Soffit &amp; intake vents",
    body: "The underside of the overhang. The vents in it are the intake half of the attic; block them with insulation and the ridge vent does nothing.",
    view: { theta: 0.3, phi: 1.85, dist: 6 } },
  { id: "field", p: [2.6, 8.4, slopeZ(8.4)], label: "Field shingles, 3-tab",
    body: "12 by 36 inch shingles, three tabs each, about 5 inches of exposure. Each course is offset 6 inches from the one below so the cutouts never line up.",
    view: { theta: 0.42, phi: 1.0, dist: 6 } },
  { id: "dormer", p: [-3.5, WH + 1.3, slopeZ(WH + 1.3)], label: "Dormer cheek &amp; valley",
    body: "The side wall of the dormer and the valley it creates against the main slope. Both get flashed rather than sealed, and both are classic leak points.",
    view: { theta: 0.5, phi: 1.15, dist: 7 } },
  { id: "chimney", p: [4.15, 12.6, -0.85], label: "Chimney crown &amp; flue",
    body: "The crown sheds water off the top of the brick and the flue liner carries the exhaust. Cracked crowns soak the stack and push the mortar apart.",
    view: { theta: 0.6, phi: 1.0, dist: 7 } },
  { id: "gable", p: [MX + 0.1, 8.4, 0], label: "Gable end &amp; vent",
    body: "The triangle of wall under the rake. The louvre in it vents the attic on roofs with no ridge vent, and it needs a screen behind it.",
    view: { theta: -0.2, phi: 1.2, dist: 12 } },
  { id: "siding", p: [-3.0, 2.6, MZ + 0.05], label: "Lap siding",
    body: "Horizontal lap siding, the common choice on houses like this. It laps so water runs out over the course below rather than behind it.",
    view: { theta: 0.34, phi: 1.5, dist: 7 } },
  { id: "garage", p: [-7.85, 1.7, WZ1 + 0.1], label: "Garage doors",
    body: "Sixteen feet of opening in four sections. The horizontal joints between sections are the strongest lines on the elevation, and they are evenly spaced.",
    view: { theta: 0.55, phi: 1.5, dist: 9 } },
  { id: "porch", p: [0, 3.3, GZ + 1.9], label: "Entry porch",
    body: "Posts, a beam and a shallow roof, flashed into the wall. It lands below the upper windows and above the door head.",
    view: { theta: 0.2, phi: 1.4, dist: 7 } }
];

/* --------------------------------------------------------------- the view */
class RoofModel {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.panelTitle = root.querySelector("[data-r3d-title]");
    this.panelBody = root.querySelector("[data-r3d-body]");
    this.focused = null;
    this.reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 300);
    this.target = new THREE.Vector3(-2.6, 4.6, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    // 2x on a retina panel is four times the fragments for a model that is
    // already antialiased by MSAA; 1.75 is the better trade here.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Neither the house nor the light ever moves, so the shadow map is the same
    // every frame. Draw it once instead of re-rendering 44k triangles from the
    // light's point of view sixty times a second.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.7;

    // two lights only, per the skill's guidance, with a tight shadow frustum
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(-14, 20, 13);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -14; key.shadow.camera.right = 9;
    key.shadow.camera.top = 16;   key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;   key.shadow.camera.far = 60;
    key.shadow.bias = -0.0004;
    // the eave overhang sits only a few shadow texels off the roof plane, so
    // without a normal bias the shadow map stitches a sawtooth along it
    key.shadow.normalBias = 0.055;
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xe4ebf3, 0x2a2f36, 2.0));

    this.house = buildHouse();
    this.scene.add(this.house);

    // a ground plane that only takes the shadow, so the house is grounded
    // without a visible box around it
    const ground = new THREE.Mesh(
      track(new THREE.PlaneGeometry(90, 90)),
      new THREE.ShadowMaterial({ opacity: 0.5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // the interactivity pulse: a ring travelling out across the ground
    this.rings = [0, 0.5].map((phase) => {
      const g = track(new THREE.RingGeometry(0.86, 1.0, 128));
      const m = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(-2.6, 0.02, 0);
      this.scene.add(mesh);
      return { mesh, phase };
    });

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.copy(this.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = false;          // stationary, by request
    this.controls.enablePan = false;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 60;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.52;        // never below the ground plane

    this.ray = new THREE.Raycaster();
    this.buildPins();
    this.bind();
    this.resize();
    this.frameHouse();

    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  buildPins() {
    this.pins = PARTS.map((spec) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "r3d-pin";
      el.innerHTML = '<span class="r3d-pin__dot"></span><span class="r3d-pin__txt">' + spec.label + "</span>";
      el.setAttribute("data-part", spec.id);
      el.addEventListener("click", (e) => { e.stopPropagation(); this.focus(spec); });
      this.root.appendChild(el);
      return { spec, el, v: new THREE.Vector3(...spec.p) };
    });
  }

  bind() {
    const back = this.root.querySelector("[data-r3d-back]");
    if (back) back.addEventListener("click", () => this.unfocus());
    this.root.querySelectorAll("[data-r3d-zoom]").forEach((b) => {
      b.addEventListener("click", () => {
        const dir = parseFloat(b.getAttribute("data-r3d-zoom"));
        const d = this.camera.position.distanceTo(this.controls.target);
        this.flyTo(this.controls.target.clone(), Math.max(5, Math.min(60, d + dir)), null);
      });
    });
    window.addEventListener("resize", () => this.resize());
  }

  // frame the whole house so nothing is ever clipped at the edges
  frameHouse() {
    const box = new THREE.Box3().setFromObject(this.house);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitH = sphere.radius / Math.sin(fov / 2);
    const fitW = sphere.radius / Math.sin(Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    // The bounding sphere is a conservative fit, so on a big figure it can be
    // pulled in a little without losing anything. On a small one that same crop
    // visibly clips the chimney and the porch steps, so there it sits back.
    const small = Math.min(this.w, this.h) < 430;
    this.homeDist = Math.max(fitH, fitW) * (small ? 1.04 : 0.93);
    this.homeTarget = sphere.center.clone();
    this.controls.target.copy(this.homeTarget);
    this.setOrbit(0.62, 1.30, this.homeDist);
    this.controls.update();
  }

  setOrbit(theta, phi, dist) {
    const t = this.controls.target;
    this.camera.position.set(
      t.x + dist * Math.sin(phi) * Math.sin(theta),
      t.y + dist * Math.cos(phi),
      t.z + dist * Math.sin(phi) * Math.cos(theta)
    );
  }

  flyTo(target, dist, orbit) {
    this.fly = {
      t0: performance.now(), dur: 620,
      fromPos: this.camera.position.clone(),
      fromTgt: this.controls.target.clone(),
      toTgt: target,
      toPos: (() => {
        const save = this.camera.position.clone(), saveT = this.controls.target.clone();
        this.controls.target.copy(target);
        if (orbit) this.setOrbit(orbit.theta, orbit.phi, dist);
        else this.camera.position.copy(save).sub(saveT).setLength(dist).add(target);
        const p = this.camera.position.clone();
        this.camera.position.copy(save); this.controls.target.copy(saveT);
        return p;
      })()
    };
  }

  focus(spec) {
    this.focused = spec;
    this.root.setAttribute("data-focus", "1");
    if (this.panelTitle) this.panelTitle.innerHTML = spec.label;
    if (this.panelBody) this.panelBody.textContent = spec.body;
    this.pins.forEach((p) => p.el.setAttribute("data-active", p.spec.id === spec.id ? "1" : "0"));
    // The per-part distances were written for a tighter lens; at face value they
    // put the camera inside the geometry. Scaled and floored, they land at a
    // detail shot of the part rather than against its surface.
    const d = Math.max(8, Math.min(24, spec.view.dist * 1.75));
    this.flyTo(new THREE.Vector3(...spec.p), d, spec.view);
  }

  unfocus() {
    this.focused = null;
    this.root.setAttribute("data-focus", "0");
    this.pins.forEach((p) => p.el.setAttribute("data-active", "0"));
    this.flyTo(this.homeTarget.clone(), this.homeDist, { theta: 0.62, phi: 1.30 });
  }

  resize() {
    const r = this.root.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();

    // The regions the figure's own captions, buttons and hint occupy, measured
    // off the real elements rather than guessed from the width. CSS moves this
    // furniture around between breakpoints, so reading it back is the only way
    // the keep-outs stay true without being kept in step by hand.
    this.chrome = [];
    this.root.querySelectorAll(".roof3d__corner, .roof3d__zoom, .roof3d__hint")
      .forEach((el) => {
        const c = el.getBoundingClientRect();
        if (!c.width || !c.height) return;
        this.chrome.push({
          x0: c.left - r.left - 6, y0: c.top - r.top - 6,
          x1: c.right - r.left + 6, y1: c.bottom - r.top + 6
        });
      });
    this._pinSig = null;          // the keep-outs moved, so re-place the labels

    if (this.homeDist) {
      const keep = this.focused;
      this.frameHouse();
      if (keep) this.focus(keep);
    }
  }

  tick(t) {
    if (this.fly) {
      const k = Math.min(1, (t - this.fly.t0) / this.fly.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // ease in out
      this.camera.position.lerpVectors(this.fly.fromPos, this.fly.toPos, e);
      this.controls.target.lerpVectors(this.fly.fromTgt, this.fly.toTgt, e);
      if (k >= 1) this.fly = null;
    }
    this.controls.update();

    // pulse: scale and fade the rings outward; the house itself never moves
    if (!this.reduced && !this.focused) {
      const span = Math.max(6, this.homeDist * 0.30);
      this.rings.forEach((r) => {
        const ph = ((t / 3400) + r.phase) % 1;
        const s = span * (0.18 + ph * 0.9);
        r.mesh.scale.set(s, s, 1);
        r.mesh.material.opacity = Math.sin(Math.PI * ph) * 0.26;
        r.mesh.visible = true;
      });
    } else {
      this.rings.forEach((r) => { r.mesh.visible = false; });
    }

    this.placePins();
    this.renderer.render(this.scene, this.camera);
  }

  // A label sits on its part, and a raycast decides whether anything stands in
  // front of it. That is exact, where the old depth-buffer sampling was not.
  placePins() {
    // The model is stationary, so where the labels sit, and what hides them,
    // only change when the camera moves. Recompute on that rather than every
    // frame: in the steady state this does no work at all.
    const sig = this.camera.position.toArray().concat(this.controls.target.toArray())
      .map((n) => n.toFixed(3)).join(",") +
      "|" + this.w + "x" + this.h + "|" + (this.focused ? this.focused.id : "");
    if (sig === this._pinSig) return;
    this._pinSig = sig;

    const cam = this.camera.position;
    const shown = [];
    this.pins.forEach((p) => {
      const v = p.v.clone();
      const dist = v.distanceTo(cam);
      const dir = v.clone().sub(cam).normalize();
      this.ray.set(cam, dir);
      this.ray.far = dist - 0.12;
      const hit = this.ray.intersectObject(this.house, true).length > 0;

      const s = v.clone().project(this.camera);
      const x = (s.x * 0.5 + 0.5) * this.w;
      const y = (-s.y * 0.5 + 0.5) * this.h;
      // The figure's own furniture owns parts of the frame: the captions across
      // the top, the zoom column at the top right, the hint along the bottom. A
      // label landing in any of them gets drawn behind a button, which on a
      // phone is most of them, so treat those regions as out of frame.
      const pad = this.w < 520 ? 12 : 40;
      let inFrame = s.z < 1 && x > pad && x < this.w - pad && y > 26 && y < this.h - 26;
      if (inFrame) {
        const bw = (p.el.offsetWidth || 120) / 2, bh = (p.el.offsetHeight || 20) / 2;
        inFrame = !this.chrome.some((c) =>
          x + bw > c.x0 && x - bw < c.x1 && y + bh > c.y0 && y - bh < c.y1);
      }

      let on = !hit && inFrame;
      if (this.focused) on = this.focused.id === p.spec.id && inFrame;
      if (!on) { p.el.setAttribute("data-on", "0"); return; }
      shown.push({ p, x, y, dist });
    });

    shown.sort((a, b) => a.dist - b.dist);
    const kept = [];
    // Overlap is tested against each label's real measured box, not a guessed
    // gap: the labels vary in width from "Valley" to "Eave, fascia & drip edge",
    // so a single fudge factor let the long ones collide.
    shown.forEach((s) => {
      s.bw = (s.p.el.offsetWidth || 120) + 10;
      s.bh = (s.p.el.offsetHeight || 20) + 6;
      const clash = kept.some((k) =>
        Math.abs(k.x - s.x) < (k.bw + s.bw) / 2 && Math.abs(k.y - s.y) < (k.bh + s.bh) / 2);
      if (!this.focused && clash) {
        s.p.el.setAttribute("data-on", "0");
        return;
      }
      kept.push(s);
      s.p.el.style.left = Math.round(s.x) + "px";
      s.p.el.style.top = Math.round(s.y) + "px";
      s.p.el.setAttribute("data-on", "1");
    });
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    disposables.forEach((g) => g.dispose());
    Object.values(MATS).forEach((m) => m.dispose());
    this.renderer.dispose();
  }
}

/* ------------------------------------------------------------------- boot */
const el = document.querySelector("[data-roof3d]");
if (el) {
  const cv = el.querySelector("canvas");
  const ok = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; } })();
  if (cv && ok) {
    const fb = el.querySelector(".roof3d__fallback");
    if (fb) fb.remove();
    new RoofModel(el);
  }
}
