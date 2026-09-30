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
        easing: "cubic-bezier(.2,.9,.3,1.15)",
        fill: "forwards",
      },
    );
    c.cap.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      delay: 350,
      fill: "forwards",
    });
    count(c.num, c.n);
    if (i === 0) {
      c.fr.animate(
        [{ boxShadow: "0 0 0 #d9ac2f00" }, { boxShadow: "0 0 70px #d9ac2fbb" }],
        {
          duration: 1400,
          delay: 500,
          fill: "forwards",
        },
      );
      c.sh.animate(
        [{ transform: "translateX(-130%)" }, { transform: "translateX(130%)" }],
        {
          duration: 1700,
          delay: 900,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
    }
    await sleep(i === 1 ? 1800 : 1100);
  }
}
function rank() {
  const box = $("#rk");
  box.textContent = "";
  const l = arts
    .filter((a) => !a.empty)
    .map((a) => [a, likesOf(a)])
    .sort((p, q) => q[1] - p[1])
    .slice(0, 5);
  if (!l.length) {
    box.textContent = "Nenhuma obra ainda. Seja a primeira pessoa a expor.";
    return;
  }
  const h = document.createElement("div");
  h.textContent = "Mais curtidas";
  h.style.cssText = "font:500 17px var(--serif);margin-bottom:6px";
  box.append(h);
  l.forEach(([a, n]) => {
    const b = document.createElement("button"),
      t = document.createElement("span"),
      c = document.createElement("span");
    t.textContent = a.title;
    c.textContent = n;
    b.append(t, c);
    b.onclick = () => {
      $("#rk").classList.remove("open");
      goTo(a);
    };
    box.append(b);
  });
}
const ease = (k) => 1 - Math.pow(1 - k, 3);
function loop(t) {
  t *= 0.001;
  const dz = entered ? 0.045 : 0.02;
  cz += (tz - cz) * dz;
  if (focus) {
    cam.position.lerp(camT, 0.07);
    look.lerp(lookT, 0.07);
  } else if (!entered) {
    cam.position.set(Math.sin(t * 0.15) * 0.6, 2.3, cz);
    look.set(0, 2.1, cz - 14);
  } else {
    cam.position.lerp(new THREE.Vector3(mx * 1.2, 2.2 - my * 0.25, cz), 0.08);
    look.lerp(new THREE.Vector3(mx * 4, 2.2 - my * 0.8, cz - 12), 0.08);
  }
  cam.lookAt(look);
  spots.forEach((sp, i) => {
    const side = i % 2 ? 1 : -1,
      z = Math.round((cz - 3) / 6) * 6 - Math.floor(i / 2) * 6 + 3;
    sp.position.set(side * 1.2, H - 0.1, z);
    sp.target.position.set(side * W, 2.3, z - 2);
  });
  frames.forEach((f) => {
    const s = f === hov || f === focus ? 1.03 : 1;
    f.userData.s += (s - f.userData.s) * 0.1;
    f.scale.setScalar(f.userData.s);
  });
  if (scM) {
    scM.rotation.y = t * 0.45;
    scM.position.y = 2.35 + Math.sin(t * 1.3) * 0.07;
  }
  if (ring) ring.rotation.z = t * 0.8;
  $("#bar i").style.width =
    Math.max(0, Math.min(1, (HOME - cz) / (HOME - minZ()))) * 100 + "%";
  R.render(S, cam);
  requestAnimationFrame(loop);
}
function rs() {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
}
addEventListener("resize", rs);
rs();
requestAnimationFrame(loop);

// ---------- estúdio ----------
const cv = $("#cv"),
  vx = cv.getContext("2d"),
  CW = 1200,
  CH = 900,
  BR = ["pincel", "lapis", "aero", "marcador", "caneta", "borracha", "spray"];
let L = [],
  ai = 0,
  x = null,
  tool = "pincel",
  down = false,
  sx = 0,
  sy = 0,
  cx = 0,
  cy = 0,
  last = [],
  snap = null,
  undo = [],
  redo = [],
  raf = 0;
const rgba = (h, a) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function mkLayer(name, white) {
  const c = cvs(CW, CH);
  if (white) {
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, CW, CH);
  }
  return { c, name, vis: true, op: 1, bl: "source-over" };
}
function comp() {
  raf = 0;
  vx.globalCompositeOperation = "source-over";
  vx.globalAlpha = 1;
  vx.clearRect(0, 0, CW, CH);
  L.forEach((l) => {
    if (!l.vis) return;
    vx.globalAlpha = l.op;
    vx.globalCompositeOperation = l.bl;
    vx.drawImage(l.c, 0, 0);
  });
  vx.globalAlpha = 1;
  vx.globalCompositeOperation = "source-over";
}
const draw = () => raf || (raf = requestAnimationFrame(comp));
function setActive(i) {
  ai = Math.max(0, Math.min(L.length - 1, i));
  x = L[ai].c.getContext("2d", { willReadFrequently: true });
  layersUI();
}
function layersUI() {
  const ul = $("#ly");
  ul.textContent = "";
  L.map((l, i) => i)
    .reverse()
    .forEach((i) => {
      const l = L[i],
        li = document.createElement("li"),
        eye = document.createElement("input"),
        n = document.createElement("span");
      eye.type = "checkbox";
      eye.checked = l.vis;
      eye.onclick = (e) => {
        e.stopPropagation();
        l.vis = eye.checked;
        draw();
      };
      n.textContent = l.name;
      li.append(eye, n);
      li.className = i === ai ? "on" : "";
      li.onclick = () => setActive(i);
      ul.append(li);
    });
  $("#bl").value = L[ai].bl;
  $("#lo").value = L[ai].op * 100;
}
function resetLayers() {
  L = [mkLayer("Fundo", true), mkLayer("Camada 1")];
  undo = [];
  redo = [];
  setActive(1);
  draw();
}
$("#ladd").onclick = () => {
  L.splice(ai + 1, 0, mkLayer("Camada " + L.length));
  setActive(ai + 1);
  draw();
};
$("#ldup").onclick = () => {
  const n = mkLayer(L[ai].name + " cópia");
  n.c.getContext("2d").drawImage(L[ai].c, 0, 0);
  n.op = L[ai].op;
  n.bl = L[ai].bl;
  L.splice(ai + 1, 0, n);
  setActive(ai + 1);
  draw();
};
$("#ldel").onclick = () => {
  if (L.length < 2) return;
  L.splice(ai, 1);
  setActive(Math.max(0, ai - 1));
  draw();
};
$("#lup").onclick = () => {
  if (ai < L.length - 1) {
    [L[ai], L[ai + 1]] = [L[ai + 1], L[ai]];
    setActive(ai + 1);
    draw();
  }
};
$("#ldn").onclick = () => {
  if (ai > 0) {
    [L[ai], L[ai - 1]] = [L[ai - 1], L[ai]];
    setActive(ai - 1);
    draw();
  }
};
$("#bl").onchange = () => {
  L[ai].bl = $("#bl").value;
  draw();
};
$("#lo").oninput = () => {
  L[ai].op = $("#lo").value / 100;
  draw();
};
const TL = [
  ["pincel", "Pincel"],
  ["lapis", "Lápis"],
  ["aero", "Aerógrafo"],
  ["marcador", "Marcador"],
  ["caneta", "Caneta caligráfica"],
  ["spray", "Spray"],
  ["borracha", "Borracha"],
  ["balde", "Balde de tinta"],
  ["gotas", "Conta-gotas"],
  ["linha", "Linha"],
  ["ret", "Retângulo"],
  ["elipse", "Elipse"],
  ["grad", "Gradiente"],
  ["texto", "Texto"],
];
function selTool(k) {
  tool = k;
  document
    .querySelectorAll("#tl button")
    .forEach((n) => n.classList.toggle("on", n.dataset.k === k));
}
TL.forEach(([k, l]) => {
  const b = document.createElement("button");
  b.textContent = l;
  b.dataset.k = k;
  b.onclick = () => selTool(k);
  $("#tl").append(b);
});
selTool("pincel");
[
  "#1c1f24",
  "#ffffff",
  "#b3202a",
  "#e2661f",
  "#f0b429",
  "#2f8f4e",
  "#1d3fa8",
  "#7a3d8c",
  "#8a6238",
  "#8d949c",
  "#f2a7b5",
  "#9ad0e8",
  "#c8d96f",
  "#0e5a5a",
  "#5b3a1e",
  "#e9dcc4",
].forEach((c) => {
  const b = document.createElement("button");
  b.style.background = c;
  b.title = c;
  b.onclick = () => ($("#col").value = c);
  $("#sw").append(b);
});
const push = () => {
  undo.push({ l: L[ai], d: x.getImageData(0, 0, CW, CH) });
  if (undo.length > 15) undo.shift();
  redo = [];
};
const pos = (e) => {
  const r = cv.getBoundingClientRect();
  return [
    ((e.clientX - r.left) * CW) / r.width,
    ((e.clientY - r.top) * CH) / r.height,
  ];
};
const sp = (a, b) => {
  const r = [[a, b]],
    m = +$("#sy").value;
  if (m & 1) r.push([CW - a, b]);
  if (m & 2) r.push([a, CH - b]);
  if (m === 3) r.push([CW - a, CH - b]);
  return r;
};
function flood(px, py, hex) {
  const im = x.getImageData(0, 0, CW, CH),
    d = im.data,
    i0 = ((py | 0) * CW + (px | 0)) * 4,
    t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]],
    c = parseInt(hex.slice(1), 16),
    cr = c >> 16,
    cg = (c >> 8) & 255,
    cb = c & 255;
  if (t[0] === cr && t[1] === cg && t[2] === cb && t[3] === 255) return;
  const ok = (i) =>
    Math.abs(d[i] - t[0]) +
      Math.abs(d[i + 1] - t[1]) +
      Math.abs(d[i + 2] - t[2]) +
      Math.abs(d[i + 3] - t[3]) <
    90;
  const st = [[px | 0, py | 0]];
  while (st.length) {
    const [a, b] = st.pop();
    if (a < 0 || b < 0 || a >= CW || b >= CH) continue;
    const i = (b * CW + a) * 4;
    if (!ok(i)) continue;
    d[i] = cr;
    d[i + 1] = cg;
    d[i + 2] = cb;
    d[i + 3] = 255;
    st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
  }
  x.putImageData(im, 0, 0);
}
function setup() {
  x.lineCap = x.lineJoin = "round";
  x.globalCompositeOperation =
    tool === "borracha" ? "destination-out" : "source-over";
  x.globalAlpha = $("#op").value / 100;
  x.strokeStyle = x.fillStyle = $("#col").value;
}
function seg(A, B, w, pr) {
  const c = $("#col").value,
    op = $("#op").value / 100;
  A.forEach((a, k) => {
    const b = B[k];
    if (tool === "spray") {
      for (let i = 0; i < 24; i++) {
        const t = Math.random() * 6.28,
          r = Math.random() * w * 2.2;
        x.fillRect(b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r, 2, 2);
      }
    } else if (tool === "aero") {
      const st = Math.max(1, (w / 4) | 0),
        n = Math.max(1, (Math.hypot(b[0] - a[0], b[1] - a[1]) / st) | 0);
      for (let i = 1; i <= n; i++) {
        const X = a[0] + ((b[0] - a[0]) * i) / n,
          Y = a[1] + ((b[1] - a[1]) * i) / n,
          g = x.createRadialGradient(X, Y, 0, X, Y, w * 1.2);
        g.addColorStop(0, rgba(c, 0.22 * op));
        g.addColorStop(1, rgba(c, 0));
        x.globalAlpha = 1;
        x.fillStyle = g;
        x.fillRect(X - w * 1.2, Y - w * 1.2, w * 2.4, w * 2.4);
      }
    } else if (tool === "caneta") {
      const d = w * 0.35;
      x.beginPath();
      x.moveTo(a[0] - d, a[1] + d);
      x.lineTo(a[0] + d, a[1] - d);
      x.lineTo(b[0] + d, b[1] - d);
      x.lineTo(b[0] - d, b[1] + d);
      x.closePath();
      x.fill();
    } else {
      x.lineWidth =
        w * pr * (tool === "lapis" ? 0.35 : tool === "marcador" ? 1.3 : 1);
      x.lineCap = tool === "marcador" ? "square" : "round";
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
      if (a === b) {
        x.beginPath();
        x.arc(a[0], a[1], x.lineWidth / 2, 0, 7);
        x.fill();
      }
    }
  });
}
function shape(p, q) {
  const f = $("#fill").checked;
  x.beginPath();
  if (tool === "linha") {
    x.moveTo(sx, sy);
    x.lineTo(p, q);
    x.stroke();
  } else if (tool === "ret") {
    f
      ? x.fillRect(sx, sy, p - sx, q - sy)
      : x.strokeRect(sx, sy, p - sx, q - sy);
  } else if (tool === "elipse") {
    x.ellipse(
      (sx + p) / 2,
      (sy + q) / 2,
      Math.abs(p - sx) / 2,
      Math.abs(q - sy) / 2,
      0,
      0,
      7,
    );
    f ? x.fill() : x.stroke();
  } else if (tool === "grad") {
    const g = x.createLinearGradient(sx, sy, p, q);
    g.addColorStop(0, $("#col").value);
    g.addColorStop(1, $("#col2").value);
    x.fillStyle = g;
    x.fillRect(0, 0, CW, CH);
  }
}
cv.onpointerdown = (e) => {
  const p = pos(e);
  sx = p[0];
  sy = p[1];
  if (tool === "gotas") {
    comp();
    const d = vx.getImageData(sx | 0, sy | 0, 1, 1).data;
    $("#col").value =
      "#" +
      [...d]
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    return;
  }
  if (tool === "texto") {
    const t = prompt("Texto:");
    if (t) {
      push();
      setup();
      x.font =
        "600 " + (+$("#sz").value * 3 + 16) + "px Instrument Sans, sans-serif";
      x.fillText(t, sx, sy);
      draw();
    }
    return;
  }
  push();
  if (tool === "balde") {
    flood(sx, sy, $("#col").value);
    draw();
    return;
  }
  down = true;
  cv.setPointerCapture(e.pointerId);
  snap = x.getImageData(0, 0, CW, CH);
  cx = sx;
  cy = sy;
  last = sp(sx, sy);
  setup();
  if (BR.includes(tool)) seg(last, last, +$("#sz").value, 1);
  draw();
};
cv.onpointermove = (e) => {
  if (!down) return;
  const [p, q] = pos(e),
    s = $("#sm").value / 100,
    w = +$("#sz").value,
    pr = e.pointerType === "pen" ? Math.max(0.2, e.pressure * 1.6) : 1;
  if (BR.includes(tool)) {
    cx += (p - cx) * (1 - s);
    cy += (q - cy) * (1 - s);
    const c = sp(cx, cy);
    seg(last, c, w, pr);
    last = c;
  } else {
    x.putImageData(snap, 0, 0);
    setup();
    x.lineWidth = w;
    shape(p, q);
  }
  draw();
};
cv.onpointerup = () => {
  down = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
};
$("#undo").onclick = () => {
  const h = undo.pop();
  if (h && L.includes(h.l)) {
    const g = h.l.c.getContext("2d");
    redo.push({ l: h.l, d: g.getImageData(0, 0, CW, CH) });
    g.putImageData(h.d, 0, 0);
    draw();
  }
};
$("#redo").onclick = () => {
  const h = redo.pop();
  if (h && L.includes(h.l)) {
    const g = h.l.c.getContext("2d");
    undo.push({ l: h.l, d: g.getImageData(0, 0, CW, CH) });
    g.putImageData(h.d, 0, 0);
    draw();
  }
};
$("#clear").onclick = () => {
  push();
  x.clearRect(0, 0, CW, CH);
  if (ai === 0) {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, CW, CH);
  }
  draw();
};
$("#swap").onclick = () => {
  [$("#col").value, $("#col2").value] = [$("#col2").value, $("#col").value];
};
$("#zm").oninput = () =>
  $("#wrap").style.setProperty("--z", $("#zm").value / 100);
$("#grid").onchange = () =>
  ($("#gd").style.display = $("#grid").checked ? "block" : "none");
$("#fa").onclick = () => {
  push();
  const t = cvs(CW, CH);
  t.getContext("2d").drawImage(L[ai].c, 0, 0);
  x.globalCompositeOperation = "source-over";
  x.globalAlpha = 1;
  x.clearRect(0, 0, CW, CH);
  x.filter = $("#fl").value;
  x.drawImage(t, 0, 0);
  x.filter = "none";
  draw();
};
$("#im").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const im = new Image();
  im.onload = () => {
    const k = Math.min(CW / im.width, CH / im.height),
      n = mkLayer("Imagem");
    n.c
      .getContext("2d")
      .drawImage(
        im,
        (CW - im.width * k) / 2,
        (CH - im.height * k) / 2,
        im.width * k,
        im.height * k,
      );
    L.splice(ai + 1, 0, n);
    setActive(ai + 1);
    draw();
    URL.revokeObjectURL(im.src);
  };
  im.src = URL.createObjectURL(f);
  e.target.value = "";
};
addEventListener("keydown", (e) => {
  if (
    !$("#studio").classList.contains("open") ||
    ["INPUT", "SELECT"].includes(e.target.tagName)
  )
    return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (k === "z" || k === "y")) {
    e.preventDefault();
    k === "y" || e.shiftKey ? $("#redo").click() : $("#undo").click();
    return;
  }
  const m = {
    b: "pincel",
    p: "lapis",
    a: "aero",
    e: "borracha",
    g: "balde",
    i: "gotas",
    l: "linha",
    r: "ret",
    o: "elipse",
    t: "texto",
  };
  if (m[k] && !e.ctrlKey && !e.metaKey) selTool(m[k]);
  if (k === "[") $("#sz").value = +$("#sz").value - 4;
  if (k === "]") $("#sz").value = +$("#sz").value + 4;
  if (k === "x") $("#swap").click();
});
$("#artist").onclick = () => $("#studio").classList.add("open");
$("#close").onclick = () => $("#studio").classList.remove("open");
$("#save").onclick = async () => {
  comp();
  const o = cvs(CW, CH),
    g = o.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, CW, CH);
  g.drawImage(cv, 0, 0);
  const im = cvs(640, 480);
  im.getContext("2d").drawImage(o, 0, 0, 640, 480);
  const a = {
    title: $("#tt").value.trim() || "Sem título",
    author: $("#au").value.trim() || "Autor anônimo",
    style: $("#fs").value,
    img: im.toDataURL("image/jpeg", 0.7),
    ts: Date.now(),
    uid,
    tema: THEME,
  };
  if (!(await put("obras", a))) {
    alert(
      "Não foi possível salvar a obra. O armazenamento do navegador pode estar cheio.",
    );
    return;
  }
  $("#studio").classList.remove("open");
  resetLayers();
  $("#tt").value = "";
  setTimeout(() => {
    const n = arts.find((o) => o.id === a.id);
    if (n) goTo(n);
  }, 900);
};
resetLayers();
$("#theme").textContent = "Tema desta semana: " + THEME + ".";
$("#th").textContent = "Tema da semana: " + THEME;
refresh();
mode();
(async () => {
  try {
    const c = await claude.use("db"),
      u = await claude.use("user");
    if (!c || !u) return;
    uid = await u.id();
    canMod = u.canEdit();
    db = c;
    shared = true;
    mode();
    ["obras", "likes", "coms"].forEach((k) =>
      db.collection(k).onSnapshot((sn) => {
        D[k] = sn.docs.map((d) => ({ ...d.data(), id: d.id }));
        refresh();
      }),
    );
  } catch (e) {
    db = null;
    shared = false;
  }
})();
