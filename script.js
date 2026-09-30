const $ = (s) => document.querySelector(s),
  KEY = "etec-galeria-v2";
const FR = {
  oak: [0x8a6238, 0.7, 0],
  black: [0x18191b, 0.5, 0.2],
  white: [0xf3f3f1, 0.6, 0],
  brass: [0xb08d4a, 0.35, 0.85],
};
const THEMES = [
  "Minha escola em cores",
  "Um lugar que me faz bem",
  "Futuro",
  "Máquinas e pessoas",
  "Silêncio",
  "Meu bairro",
  "Sonho",
  "Autorretrato sem rosto",
  "Movimento",
  "Noite",
];
const THEME = THEMES[Math.floor(Date.now() / 6048e5) % THEMES.length];
const LK = "etec-galeria-v3",
  D = { obras: [], likes: [], coms: [] };
let db = null,
  uid = "local",
  canMod = false,
  shared = false,
  sig = null,
  fa = null;
try {
  Object.assign(D, JSON.parse(localStorage.getItem(LK) || "{}"));
} catch (e) {}
let saveErr = null,
  warned = false;
const lsave = () => {
  try {
    localStorage.setItem(LK, JSON.stringify(D));
    saveErr = null;
    return true;
  } catch (e) {
    saveErr = e;
    return false;
  }
};
const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function put(k, o) {
  o.id = o.id || newId();
  if (db) {
    try {
      await db.collection(k).doc(o.id).set(o);
    } catch (e) {
      return false;
    }
  } else {
    D[k].push(o);
    if (!lsave() && !warned) {
      warned = true;
      alert(
        "Não foi possível gravar no armazenamento do navegador (" +
          ((saveErr && saveErr.name) || "erro") +
          "). Tudo continua funcionando, mas só até fechar esta página.",
      );
    }
    refresh();
  }
  return true;
}
async function del(k, id) {
  if (db) {
    try {
      await db.collection(k).doc(id).delete();
    } catch (e) {}
  } else {
    D[k] = D[k].filter((o) => o.id !== id);
    lsave();
    refresh();
  }
}
const likesOf = (a) => D.likes.filter((l) => l.obra === a.id).length;
const mode = () =>
  ($("#mode").textContent = shared
    ? "Obras, curtidas e comentários compartilhados"
    : "Tudo fica salvo neste computador");
function cvs(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function tex(c, rep) {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...rep);
  }
  return t;
}

// ---------- sala ----------
const R = new THREE.WebGLRenderer({ canvas: $("#c"), antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.outputEncoding = THREE.sRGBEncoding;
const S = new THREE.Scene();
S.background = new THREE.Color(0xdcdee1);
S.fog = new THREE.Fog(0xdcdee1, 14, 46);
const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
S.add(new THREE.HemisphereLight(0xffffff, 0xb9a58c, 0.75));
const W = 4.5,
  H = 4.4,
  LEN = 120;
// piso de tábuas
const fc = cvs(512, 512),
  fg = fc.getContext("2d");
for (let i = 0; i < 8; i++) {
  fg.fillStyle = `hsl(32,${32 + Math.random() * 8}%,${58 + Math.random() * 10}%)`;
  fg.fillRect(i * 64, 0, 64, 512);
  for (let k = 0; k < 40; k++) {
    fg.fillStyle = `hsla(30,30%,30%,${Math.random() * 0.06})`;
    fg.fillRect(i * 64 + Math.random() * 64, 0, 1, 512);
  }
  fg.fillStyle = "#0003";
  fg.fillRect(i * 64, 0, 1.5, 512);
  fg.fillRect(i * 64, Math.random() * 512, 64, 1.5);
}
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(W * 2, LEN),
  new THREE.MeshStandardMaterial({
    map: tex(fc, [2, LEN / 8]),
    roughness: 0.45,
    metalness: 0.05,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.z = -LEN / 2 + 12;
S.add(floor);
const ceil = new THREE.Mesh(
  new THREE.PlaneGeometry(W * 2, LEN),
  new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }),
);
ceil.rotation.x = Math.PI / 2;
ceil.position.set(0, H, -LEN / 2 + 12);
S.add(ceil);
const wm = new THREE.MeshStandardMaterial({ color: 0xe8e9eb, roughness: 0.95 });
const bm = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.6 });
[-1, 1].forEach((s) => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(LEN, H), wm);
  w.rotation.y = (-s * Math.PI) / 2;
  w.position.set(s * W, H / 2, -LEN / 2 + 12);
  S.add(w);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, LEN), bm);
  b.position.set(s * (W - 0.03), 0.1, -LEN / 2 + 12);
  S.add(b);
});
const endW = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), wm);
endW.position.set(0, H / 2, -LEN + 12);
S.add(endW);
// banco central
const bench = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.45, 3),
  new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 }),
);
const seatTop = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.08, 3.1),
  new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.6 }),
);
bench.position.set(0, 0.22, -16);
seatTop.position.set(0, 0.48, -16);
S.add(bench, seatTop);
// spots que acompanham a câmera
const spots = [];
for (let i = 0; i < 6; i++) {
  const sp = new THREE.SpotLight(0xfff1dc, 1.5, 16, 0.55, 0.7, 1.4);
  sp.target = new THREE.Object3D();
  S.add(sp, sp.target);
  spots.push(sp);
}
const fixt = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.07, 0.09, 0.16, 12),
  new THREE.MeshStandardMaterial({ color: 0x222 }),
  (LEN / 2.5) * 2,
);
// sombra suave sob cada moldura
const shc = cvs(128, 128),
  sg = shc.getContext("2d"),
  gr = sg.createRadialGradient(64, 64, 20, 64, 64, 64);
gr.addColorStop(0, "rgba(0,0,0,.34)");
gr.addColorStop(1, "rgba(0,0,0,0)");
sg.fillStyle = gr;
sg.fillRect(0, 0, 128, 128);
const shTex = tex(shc);

// ---------- obras ----------
function paint(seed) {
  const c = cvs(600, 450),
    g = c.getContext("2d");
  let r = seed * 7919;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const pal = [
    [0.58, 0.55, 0.32],
    [0.06, 0.7, 0.5],
    [0.1, 0.05, 0.9],
    [0.62, 0.6, 0.18],
    [0.02, 0.65, 0.45],
    [0.13, 0.7, 0.6],
  ][seed % 6];
  const hs = (dh, s, l) =>
    `hsl(${(pal[0] * 360 + dh) % 360},${s * 100}%,${l * 100}%)`;
  g.fillStyle = hs(0, 0.12, 0.92);
  g.fillRect(0, 0, 600, 450);
  const t = seed % 4;
  if (t === 0) {
    const n = 3 + ((rnd() * 2) | 0);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const h = (450 / n) * (0.7 + rnd() * 0.6);
      g.fillStyle = hs(i * 25, pal[1], 0.3 + rnd() * 0.35);
      g.fillRect(40, 40 + y, 520, Math.min(h, 410 - y));
      y += h;
    }
  } else if (t === 1) {
    for (let i = 0; i < 7; i++) {
      g.fillStyle = hs(rnd() * 60, pal[1], 0.25 + rnd() * 0.5);
      const s = 60 + rnd() * 160;
      g.fillRect(rnd() * 440, rnd() * 300, s, s * (0.4 + rnd()));
    }
    g.fillStyle = "#1c1f24";
    g.fillRect(rnd() * 400, 0, 5, 450);
  } else if (t === 2) {
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = hs(i * 12, pal[1], 0.3 + i * 0.05);
      g.lineWidth = 18 + rnd() * 20;
      g.beginPath();
      g.arc(300, 520, 80 + i * 46, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  } else {
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = hs(rnd() * 50, pal[1], 0.2 + rnd() * 0.6);
      g.lineWidth = 4 + rnd() * 26;
      g.globalAlpha = 0.7;
      g.beginPath();
      const y = rnd() * 450;
      g.moveTo(-20, y);
      g.bezierCurveTo(
        200,
        y + rnd() * 90 - 45,
        400,
        y + rnd() * 90 - 45,
        620,
        y + rnd() * 60 - 30,
      );
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const im = g.getImageData(0, 0, 600, 450);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    im.data[i] += n;
    im.data[i + 1] += n;
    im.data[i + 2] += n;
  }
  g.putImageData(im, 0, 0);
  return c;
}
function emptyArt() {
  const c = cvs(600, 450),
    g = c.getContext("2d");
  g.fillStyle = "#f0f1f2";
  g.fillRect(0, 0, 600, 450);
  g.strokeStyle = "#9aa0a7";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(300, 170);
  g.lineTo(300, 280);
  g.moveTo(245, 225);
  g.lineTo(355, 225);
  g.stroke();
  g.fillStyle = "#6c727a";
  g.font = "500 30px Instrument Sans, sans-serif";
  g.textAlign = "center";
  g.fillText("Sua obra aqui", 300, 350);
  return c;
}
function plaque(a) {
  const c = cvs(300, 150),
    g = c.getContext("2d");
  g.fillStyle = "#fafafa";
  g.fillRect(0, 0, 300, 150);
  g.fillStyle = "#1c1f24";
  g.font = "500 26px Newsreader, Georgia, serif";
  g.fillText(a.title.slice(0, 22), 18, 62);
  g.fillStyle = "#6c727a";
  g.font = "400 19px Instrument Sans, sans-serif";
  g.fillText(a.author.slice(0, 26), 18, 98);
  return tex(c);
}
const frameOf = new WeakMap(),
  frames = [],
  pick = [];
function addFrame(a, i) {
  const side = i % 2 ? 1 : -1,
    z = -5 - Math.floor(i / 2) * 6,
    g = new THREE.Group(),
    f = FR[a.style] || FR.oak;
  const fm = new THREE.MeshStandardMaterial({
    color: f[0],
    roughness: f[1],
    metalness: f[2],
  });
  const T = 0.14,
    fw = 3.3,
    fh = 2.6;
  [
    [0, fh / 2 - T / 2, fw, T],
    [0, -fh / 2 + T / 2, fw, T],
    [-fw / 2 + T / 2, 0, T, fh],
    [fw / 2 - T / 2, 0, T, fh],
  ].forEach(([x, y, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), fm);
    m.position.set(x, y, 0.07);
    g.add(m);
  });
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(fw - 2 * T, fh - 2 * T),
    new THREE.MeshStandardMaterial({ color: 0xfbfbf9, roughness: 1 }),
  );
  mat.position.z = 0.03;
  g.add(mat);
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.8),
    new THREE.MeshBasicMaterial({ color: 0xddd }),
  );
  p.position.z = 0.035;
  g.add(p);
  if (a.img) {
    new THREE.TextureLoader().load(a.img, (t) => {
      t.encoding = THREE.sRGBEncoding;
      p.material = new THREE.MeshBasicMaterial({ map: t });
    });
  } else {
    const t = tex(a.empty ? emptyArt() : paint(a.seed || 1));
    t.encoding = THREE.sRGBEncoding;
    p.material = new THREE.MeshBasicMaterial({ map: t });
  }
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 3.7),
    new THREE.MeshBasicMaterial({
      map: shTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  sh.position.set(0.05, -0.12, -0.02);
  g.add(sh);
  const pl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.25),
    new THREE.MeshBasicMaterial({ map: plaque(a) }),
  );
  pl.position.set(-side * 2.15, -0.55, 0.02);
  g.add(pl);
  g.position.set(side * (W - 0.01), 2.35, z);
  g.rotation.y = (-side * Math.PI) / 2;
  S.add(g);
  p.userData = { a, g };
  pick.push(p);
  g.userData = { side, z, s: 1 };
  frames.push(g);
  frameOf.set(a, g);
}
let arts = [];
function refresh() {
  const os = [...D.obras].sort((a, b) => a.ts - b.ts),
    s = os.map((o) => o.id).join();
  if (s !== sig) {
    sig = s;
    const keep = fa && fa.id;
    frames.splice(0).forEach((f) => S.remove(f));
    pick.length = 0;
    const em = () => ({
      empty: 1,
      title: "Espaço livre",
      author: "Clique para criar",
      style: "white",
    });
    scId = null;
    arts = [...os, em(), em()];
    arts.forEach(addFrame);
    fa = (keep && arts.find((a) => a.id === keep)) || null;
    if (fa) openArt(fa);
    else if (focus) unfocus();
  }
  sculpt();
  updateLabel();
  if ($("#rk").classList.contains("open")) rank();
}
const minZ = () => -5 - Math.floor((arts.length - 1) / 2) * 6 - 4;
const scG = new THREE.Group(),
  scSp = new THREE.SpotLight(0xfff1dc, 2.8, 14, 0.6, 0.5, 1);
S.add(scG, scSp, scSp.target);
const goldM = new THREE.MeshStandardMaterial({
    color: 0xd4a72c,
    metalness: 1,
    roughness: 0.25,
  }),
  pedM = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.6 });
let scId = null,
  scM = null,
  ring = null;
function plaqueSc(t) {
  const c = cvs(300, 125),
    g = c.getContext("2d");
  g.fillStyle = "#fafafa";
  g.fillRect(0, 0, 300, 125);
  g.fillStyle = "#1c1f24";
  g.font = "500 24px Newsreader, Georgia, serif";
  g.fillText(t ? t.title.slice(0, 22) : "Aguardando", 16, 48);
  g.fillStyle = "#6c727a";
  g.font = "400 17px Instrument Sans, sans-serif";
  g.fillText(
    t ? "Mais curtida · " + likesOf(t) + " curtidas" : "a obra mais curtida",
    16,
    80,
  );
  if (t) g.fillText("por " + t.author.slice(0, 24), 16, 105);
  return tex(c);
}
function sculpt() {
  const os = arts
      .filter((a) => !a.empty)
      .sort((p, q) => likesOf(q) - likesOf(p) || p.ts - q.ts),
    t = os[0] && likesOf(os[0]) > 0 ? os[0] : null,
    key = t ? t.id + ":" + likesOf(t) : "-";
  const z = minZ() - 4;
  scG.position.set(0, 0, z);
  endW.position.z = z - 6;
  scSp.position.set(0, H - 0.2, z + 2);
  scSp.target.position.set(0, 2, z);
  if (key === scId) return;
  scId = key;
  while (scG.children.length) scG.remove(scG.children[0]);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), pedM);
  ped.position.y = 0.55;
  scG.add(ped);
  const pl = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.5),
    new THREE.MeshBasicMaterial({ map: plaqueSc(t) }),
  );
  pl.position.set(0, 0.55, 0.76);
  scG.add(pl);
  scM = new THREE.Group();
  scM.position.y = 2.35;
  scG.add(scM);
  ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.035, 12, 90), goldM);
  ring.rotation.x = 1.1;
  scM.add(ring);
  if (!t) return;
  scM.add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.9, 0.2), goldM));
  [1, -1].forEach((sd) => {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.65),
      new THREE.MeshBasicMaterial({ color: 0xddd }),
    );
    p.position.z = 0.11 * sd;
    p.rotation.y = sd < 0 ? Math.PI : 0;
    scM.add(p);
    p.userData = { a: t, g: scM };
    pick.push(p);
    new THREE.TextureLoader().load(t.img, (tx) => {
      tx.encoding = THREE.sRGBEncoding;
      p.material = new THREE.MeshBasicMaterial({ map: tx });
    });
  });
}

// ---------- navegação ----------
const START = 26,
  HOME = 6;
let tz = START,
  cz = START,
  mx = 0,
  my = 0,
  focus = null,
  hov = null,
  entered = false;
const look = new THREE.Vector3(0, 2.2, -30),
  lookT = look.clone(),
  camT = new THREE.Vector3();
$("#enter").onclick = () => {
  entered = true;
  document.body.classList.add("in");
  tz = HOME;
};
addEventListener(
  "wheel",
  (e) => {
    if (entered && !focus)
      tz = Math.max(minZ(), Math.min(HOME, tz - e.deltaY * 0.012));
  },
  { passive: true },
);
addEventListener("keydown", (e) => {
  if (
    $("#studio").classList.contains("open") ||
    !entered ||
    e.target.tagName === "INPUT"
  )
    return;
  if (["ArrowUp", "w"].includes(e.key)) tz = Math.max(minZ(), tz - 2.5);
  if (["ArrowDown", "s"].includes(e.key)) tz = Math.min(HOME, tz + 2.5);
  if (e.key === "Escape") unfocus();
});
let dy = null;
addEventListener("pointerdown", (e) => (dy = e.clientY));
addEventListener("pointerup", () => (dy = null));
addEventListener("pointermove", (e) => {
  mx = e.clientX / innerWidth - 0.5;
  my = e.clientY / innerHeight - 0.5;
  if (dy !== null && entered && !focus && e.pointerType === "touch") {
    tz = Math.max(minZ(), Math.min(HOME, tz + (e.clientY - dy) * 0.04));
    dy = e.clientY;
  }
  const h = cast(e);
  hov = h ? h.object.userData.g : null;
  document.body.style.cursor = hov ? "pointer" : "default";
});
const ray = new THREE.Raycaster(),
  v2 = new THREE.Vector2();
function cast(e) {
  if (!entered) return null;
  v2.set((e.clientX / innerWidth) * 2 - 1, (-e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(v2, cam);
  return ray.intersectObjects(pick)[0];
}
function openArt(a) {
  if (a.empty) {
    $("#studio").classList.add("open");
    return;
  }
  fa = a;
  focus = frameOf.get(a);
  const g = frameOf.get(a),
    sd = g.userData.side;
  camT.set(g.position.x - sd * 4.1, 2.35, g.position.z);
  lookT.set(g.position.x, 2.35, g.position.z);
  $("#lbl").classList.add("show");
  updateLabel();
}
function goTo(a) {
  tz = Math.max(minZ(), frameOf.get(a).userData.z + HOME - 1);
  setTimeout(() => openArt(a), 750);
}
$("#c").addEventListener("click", (e) => {
  const h = cast(e);
  if (!h) {
    unfocus();
    return;
  }
  openArt(h.object.userData.a);
});
function unfocus() {
  focus = null;
  fa = null;
  $("#lbl").classList.remove("show");
}
$("#back").onclick = unfocus;
function updateLabel() {
  if (!fa) return;
  $("#lbl h2").textContent = fa.title;
  $("#lbl p").textContent = "por " + fa.author;
  const me = D.likes.some((l) => l.id === fa.id + "_" + uid),
    b = $("#like");
  b.textContent = "Curtir" + " · " + likesOf(fa);
  b.classList.toggle("on", me);
  $("#del").hidden = !(fa.uid === uid || canMod);
  const ul = $("#cm");
  ul.textContent = "";
  D.coms
    .filter((c) => c.obra === fa.id)
    .sort((a, b) => a.ts - b.ts)
    .forEach((c) => {
      const li = document.createElement("li"),
        bn = document.createElement("b");
      bn.textContent = c.name + ": ";
      li.append(bn, document.createTextNode(c.text));
      ul.append(li);
    });
  ul.scrollTop = 1e5;
}
$("#like").onclick = () => {
  if (!fa) return;
  $("#like").animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.2)" },
      { transform: "scale(1)" },
    ],
    { duration: 260 },
  );
  put("likes", { obra: fa.id, uid, ts: Date.now() });
};
$("#del").onclick = () => {
  if (fa && confirm("Remover esta obra da galeria?")) {
    const id = fa.id;
    unfocus();
    del("obras", id);
  }
};
const sendC = async () => {
  const t = $("#ct").value.trim();
  if (!t || !fa) return;
  const n = $("#cn").value.trim() || "Visitante";
  try {
    localStorage.setItem("etec-nome", n);
  } catch (e) {}
  $("#ct").value = "";
  await put("coms", { obra: fa.id, text: t, name: n, ts: Date.now() });
};
$("#cs").onclick = sendC;
$("#ct").onkeydown = (e) => {
  if (e.key === "Enter") sendC();
};
try {
  $("#cn").value = localStorage.getItem("etec-nome") || "";
} catch (e) {}
$("#rkb").onclick = showPodium;
$("#pc").onclick = closePod;
addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePod();
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let podRun = 0;
function closePod() {
  podRun++;
  $("#pod").classList.remove("open");
}
function count(el, n) {
  const t0 = performance.now();
  (function f(t) {
    const k = Math.min(1, (t - t0) / 900);
    el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(f);
  })(t0);
}
async function showPodium() {
  const run = ++podRun,
    box = $("#pdm");
  box.textContent = "";
  $("#pod").classList.add("open");
  const top = arts
    .filter((a) => !a.empty)
    .map((a) => [a, likesOf(a)])
    .sort((p, q) => q[1] - p[1] || p[0].ts - q[0].ts)
    .slice(0, 3);
  if (!top.length) {
    box.textContent = "Nenhuma obra ainda. Seja a primeira pessoa a expor.";
    return;
  }
  const E = (t, c) => {
      const e = document.createElement(t);
      if (c) e.className = c;
      return e;
    },
    cols = [],
    ph = [22, 15, 10];
  [1, 0, 2].forEach((i) => {
    if (!top[i]) return;
    const [a, n] = top[i],
      c = E("div", "pc " + ["g", "s", "b"][i]),
      fr = E("div", "fr"),
      im = E("img"),
      sh = E("div", "sh"),
      cap = E("div", "cap"),
      b = E("b"),
      sp = E("span"),
      num = E("em"),
      ped = E("div", "ped");
    im.src = a.img;
    im.alt = a.title;
    b.textContent = a.title;
    num.textContent = "0";
    num.style.fontStyle = "normal";
    sp.append("por " + a.author + " · ", num, " curtidas");
    ped.textContent = i + 1 + "º";
    ped.style.height = ph[i] + "vh";
    fr.append(im, sh);
    cap.append(b, sp);
    c.append(fr, cap, ped);
    box.append(c);
    fr.onclick = () => {
      closePod();
      goTo(a);
    };
    cols[i] = { fr, cap, ped, sh, num, n };
  });
  for (const i of [2, 1, 0]) {
    const c = cols[i];
    if (!c) continue;
    if (run !== podRun) return;
    await c.ped.animate(
      [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
      {
        duration: 700,
        easing: "cubic-bezier(.2,.8,.2,1)",
        fill: "forwards",
      },
    ).finished;
    if (run !== podRun) return;
    c.fr.animate(
      [
        { opacity: 0, transform: "translateY(-70px) rotate(-3deg) scale(.9)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: i === 0 ? 900 : 650,
        easing: "cubic-bezie