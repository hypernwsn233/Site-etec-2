/* ==========================================================================
   GALERIA.JS — o corredor 3D onde ficam as obras.
   Blocos deste arquivo:
     1. Cena, câmera e luzes básicas
     2. A sala (piso, paredes, teto, banco)
     3. As molduras (uma por obra) e as plaquinhas
     4. A escultura da obra mais curtida (no fim do corredor)
     5. Navegação (mouse, teclado, toque) e clique nas obras
     6. Etiqueta da obra: curtir, comentar, remover
     7. O laço principal que desenha tudo a cada quadro
   ========================================================================== */

// ---------- 1. Cena, câmera e luzes ----------
const R = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.outputEncoding = THREE.sRGBEncoding;

const S = new THREE.Scene();
S.background = new THREE.Color(0xdcdee1);
S.fog = new THREE.Fog(0xdcdee1, 14, 46);
const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
S.add(new THREE.HemisphereLight(0xffffff, 0xb9a58c, 0.75));

const LARGURA = 4.5;
const ALTURA = 4.4;
const COMPRIMENTO = 120;
const FIM_DO_CHAO = 12;
const centroZ = -COMPRIMENTO / 2 + FIM_DO_CHAO;

(function criarPiso() {
  const c = criarCanvas(512, 512), g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `hsl(32, ${32 + Math.random() * 8}%, ${58 + Math.random() * 10}%)`;
    g.fillRect(i * 64, 0, 64, 512);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `hsla(30, 30%, 30%, ${Math.random() * 0.06})`;
      g.fillRect(i * 64 + Math.random() * 64, 0, 1, 512);
    }
    g.fillStyle = '#0003'; g.fillRect(i * 64, 0, 1.5, 512);
    g.fillRect(i * 64, Math.random() * 512, 64, 1.5);
  }
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGURA * 2, COMPRIMENTO),
    new THREE.MeshStandardMaterial({ map: paraTextura(c, [2, COMPRIMENTO / 8]), roughness: 0.45, metalness: 0.05 })
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.z = centroZ;
  S.add(piso);
})();

const materialParede = new THREE.MeshStandardMaterial({ color: 0xe8e9eb, roughness: 0.95 });
const materialRodape = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.6 });
const teto = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA * 2, COMPRIMENTO), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }));
teto.rotation.x = Math.PI / 2; teto.position.set(0, ALTURA, centroZ); S.add(teto);

[-1, 1].forEach((lado) => {
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(COMPRIMENTO, ALTURA), materialParede);
  parede.rotation.y = -lado * Math.PI / 2;
  parede.position.set(lado * LARGURA, ALTURA / 2, centroZ);
  S.add(parede);
  const rodape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, COMPRIMENTO), materialRodape);
  rodape.position.set(lado * (LARGURA - 0.03), 0.1, centroZ);
  S.add(rodape);
});

const paredeFundo = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA * 2, ALTURA), materialParede);
paredeFundo.position.set(0, ALTURA / 2, -COMPRIMENTO + FIM_DO_CHAO);
S.add(paredeFundo);

const bancoBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 3), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 }));
const bancoAssento = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 3.1), new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.6 }));
bancoBase.position.set(0, 0.22, -16); bancoAssento.position.set(0, 0.48, -16);
S.add(bancoBase, bancoAssento);

const holofotes = [];
for (let i = 0; i < 6; i++) {
  const luz = new THREE.SpotLight(0xfff1dc, 1.5, 16, 0.55, 0.7, 1.4);
  luz.target = new THREE.Object3D();
  S.add(luz, luz.target);
  holofotes.push(luz);
}

const texturaSombra = (function () {
  const c = criarCanvas(128, 128), g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.34)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return paraTextura(c);
})();

// ---------- 3. As molduras ----------
// Cores/material de cada estilo: [cor, rugosidade, metal]
// (a moldura "pink" usa o material de glitter, criado mais abaixo)
const MOLDURAS = {
  oak:   [0x8a6238, 0.7, 0],
  black: [0x18191b, 0.5, 0.2],
  white: [0xf3f3f1, 0.6, 0],
  brass: [0xb08d4a, 0.35, 0.85],
  pink:  [0xff5fb8, 0.3, 0.55],
};

// ---- Glitter rosa: textura de fundo rosa cheia de pontinhos que brilham ----
const glitter = {
  textura: (() => {
    const c = criarCanvas(256, 256), g = c.getContext('2d');
    const fundo = g.createLinearGradient(0, 0, 256, 256);
    fundo.addColorStop(0, '#ff8fd0'); fundo.addColorStop(0.5, '#ff3fa6'); fundo.addColorStop(1, '#ff7cc8');
    g.fillStyle = fundo; g.fillRect(0, 0, 256, 256);
    const cores = ['#ffffff', '#ffd6f1', '#ff2f9c', '#fff2a8', '#ffa6dc'];
    for (let i = 0; i < 1100; i++) {                 // grãos de glitter
      g.fillStyle = cores[(Math.random() * cores.length) | 0];
      g.globalAlpha = 0.5 + Math.random() * 0.5;
      const r = 0.6 + Math.random() * 1.5;
      g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, r, 0, 7); g.fill();
    }
    g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {                   // estrelinhas de 4 pontas
      const x = Math.random() * 256, y = Math.random() * 256, k = 2 + Math.random() * 3;
      g.beginPath(); g.moveTo(x - k, y); g.lineTo(x + k, y); g.moveTo(x, y - k); g.lineTo(x, y + k); g.stroke();
    }
    return c;
  })(),
  // Estrela suave usada nos brilhinhos que piscam ao redor da moldura
  estrela: (() => {
    const c = criarCanvas(64, 64), g = c.getContext('2d');
    const halo = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    halo.addColorStop(0, 'rgba(255,255,255,1)'); halo.addColorStop(0.25, 'rgba(255,214,241,.7)'); halo.addColorStop(1, 'rgba(255,214,241,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 62); g.moveTo(2, 32); g.lineTo(62, 32); g.stroke();
    return paraTextura(c);
  })(),
  materiais: [],   // um material por ripa (para o glitter não esticar)
  brilhos: [],     // as estrelinhas que piscam
};

function materialGlitter(largura, altura) {
  const m = new THREE.MeshStandardMaterial({
    map: paraTextura(glitter.textura, [Math.max(1, largura / 0.45), Math.max(1, altura / 0.45)]),
    color: 0xffffff, roughness: 0.3, metalness: 0.55,
    emissive: 0xff2f9c, emissiveIntensity: 0.12,
  });
  m.userData.fase = Math.random() * 6.28;
  glitter.materiais.push(m);
  return m;
}

let ARTES = [];
const molduraObjetos = [];
const areasClicaveis = [];

function desenharEspacoLivre() {
  const c = criarCanvas(600, 450), g = c.getContext('2d');
  g.fillStyle = '#f0f1f2'; g.fillRect(0, 0, 600, 450);
  g.strokeStyle = '#9aa0a7'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(300, 170); g.lineTo(300, 280); g.moveTo(245, 225); g.lineTo(355, 225); g.stroke();
  g.fillStyle = '#6c727a'; g.font = '500 30px Instrument Sans, sans-serif'; g.textAlign = 'center';
  g.fillText('Sua obra aqui', 300, 350);
  return c;
}

function desenharPlaquinha(obra) {
  const c = criarCanvas(300, 150), g = c.getContext('2d');
  g.fillStyle = '#fafafa'; g.fillRect(0, 0, 300, 150);
  g.fillStyle = '#1c1f24'; g.font = '500 26px Newsreader, Georgia, serif'; g.fillText(obra.titulo.slice(0, 22), 18, 62);
  g.fillStyle = '#6c727a'; g.font = '400 19px Instrument Sans, sans-serif'; g.fillText(obra.autor.slice(0, 26), 18, 98);
  return paraTextura(c);
}

function criarMoldura(entrada, posicao) {
  const lado = posicao % 2 ? 1 : -1;
  const z = -5 - Math.floor(posicao / 2) * 6;
  const grupo = new THREE.Group();
  const ehRosa = entrada.obra.moldura === 'pink';
  const [cor, rugosidade, metal] = MOLDURAS[entrada.obra.moldura] || MOLDURAS.oak;
  const materialMoldura = ehRosa ? null : new THREE.MeshStandardMaterial({ color: cor, roughness: rugosidade, metalness: metal });

  const espessura = 0.14, largura = 3.3, altura = 2.6;
  [[0, altura / 2 - espessura / 2, largura, espessura], [0, -altura / 2 + espessura / 2, largura, espessura],
   [-largura / 2 + espessura / 2, 0, espessura, altura], [largura / 2 - espessura / 2, 0, espessura, altura]]
    .forEach(([px, py, w, h]) => {
      const ripa = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), ehRosa ? materialGlitter(w, h) : materialMoldura);
      ripa.position.set(px, py, 0.07);
      grupo.add(ripa);
    });

  if (ehRosa) {                       // brilhinhos que piscam em volta da moldura
    for (let i = 0; i < 16; i++) {
      const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: glitter.estrela, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const lado = (Math.random() * 4) | 0, u = Math.random() - 0.5;
      brilho.position.set(lado < 2 ? u * largura : (lado === 2 ? -1 : 1) * largura / 2, lado < 2 ? (lado ? -1 : 1) * altura / 2 : u * altura, 0.17);
      brilho.userData = { fase: Math.random() * 6.28, vel: 1.5 + Math.random() * 2.5, tam: 0.1 + Math.random() * 0.12 };
      grupo.add(brilho);
      glitter.brilhos.push(brilho);
    }
  }

  const passepartout = new THREE.Mesh(new THREE.PlaneGeometry(largura - 2 * espessura, altura - 2 * espessura),
    new THREE.MeshStandardMaterial({ color: 0xfbfbf9, roughness: 1 }));
  passepartout.position.z = 0.03;
  grupo.add(passepartout);

  const tela = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  tela.position.z = 0.035;
  grupo.add(tela);
  if (entrada.vazio) {
    tela.material = new THREE.MeshBasicMaterial({ map: paraTextura(desenharEspacoLivre()) });
  } else {
    new THREE.TextureLoader().load(entrada.obra.img, (t) => {
      t.encoding = THREE.sRGBEncoding;
      tela.material = new THREE.MeshBasicMaterial({ map: t });
    });
  }

  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.7), new THREE.MeshBasicMaterial({ map: texturaSombra, transparent: true, depthWrite: false }));
  sombra.position.set(0.05, -0.12, -0.02);
  grupo.add(sombra);

  const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: desenharPlaquinha(entrada.obra) }));
  placa.position.set(-lado * 2.15, -0.55, 0.02);
  grupo.add(placa);

  grupo.position.set(lado * (LARGURA - 0.01), 2.35, z);
  grupo.rotation.y = -lado * Math.PI / 2;
  S.add(grupo);

  tela.userData = { entrada };
  areasClicaveis.push(tela);
  grupo.userData = { lado, z, escala: 1 };
  molduraObjetos.push(grupo);
  entrada.grupo = grupo;
}

let assinaturaObras = null;
let entradaAberta = null;

function atualizarGaleria() {
  const obras = [...dados.obras].sort((a, b) => a.hora - b.hora);
  const assinatura = obras.map((o) => o.id).join();

  if (assinatura !== assinaturaObras) {
    assinaturaObras = assinatura;
    const idAberto = entradaAberta && entradaAberta.obra.id;

    molduraObjetos.splice(0).forEach((m) => S.remove(m));
    glitter.materiais.length = 0; glitter.brilhos.length = 0;
    areasClicaveis.length = 0;

    const livre = () => ({ vazio: true, obra: { id: '', titulo: 'Espaço livre', autor: 'Clique para criar', moldura: 'white' } });
    ARTES = [...obras.map((obra) => ({ obra, vazio: false })), livre(), livre()];
    ARTES.forEach(criarMoldura);

    escultura.chave = null;
    entradaAberta = idAberto ? ARTES.find((a) => a.obra.id === idAberto) || null : null;
    if (entradaAberta) abrirObra(entradaAberta); else if (obraEmFoco) voltarAoCorredor();
  }
  atualizarEscultura();
  atualizarEtiqueta();
}

// ---------- 4. A escultura da obra mais curtida ----------
const escultura = { grupo: new THREE.Group(), girante: null, anel: null, chave: null };
const holofoteEscultura = new THREE.SpotLight(0xfff1dc, 2.8, 14, 0.6, 0.5, 1);
S.add(escultura.grupo, holofoteEscultura, holofoteEscultura.target);

const materialOuro = new THREE.MeshStandardMaterial({ color: 0xd4a72c, metalness: 1, roughness: 0.25 });
const materialPedestal = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.6 });
const zMinimo = () => -5 - Math.floor((ARTES.length - 1) / 2) * 6 - 4;

function desenharPlacaEscultura(obra) {
  const c = criarCanvas(300, 125), g = c.getContext('2d');
  g.fillStyle = '#fafafa'; g.fillRect(0, 0, 300, 125);
  g.fillStyle = '#1c1f24'; g.font = '500 24px Newsreader, Georgia, serif';
  g.fillText(obra ? obra.titulo.slice(0, 22) : 'Aguardando', 16, 48);
  g.fillStyle = '#6c727a'; g.font = '400 17px Instrument Sans, sans-serif';
  g.fillText(obra ? 'Mais curtida · ' + curtidasDe(obra) + ' curtidas' : 'a obra mais curtida', 16, 80);
  if (obra) g.fillText('por ' + obra.autor.slice(0, 24), 16, 105);
  return paraTextura(c);
}

function atualizarEscultura() {
  const campeao = obrasMaisCurtidas()[0];
  const obra = campeao && campeao.curtidas > 0 ? campeao.obra : null;
  const chave = obra ? obra.id + ':' + campeao.curtidas : '-';
  const z = zMinimo() - 4;
  escultura.grupo.position.set(0, 0, z);
  paredeFundo.position.z = z - 6;
  holofoteEscultura.position.set(0, ALTURA - 0.2, z + 2);
  holofoteEscultura.target.position.set(0, 2, z);

  if (chave === escultura.chave) return;
  escultura.chave = chave;
  while (escultura.grupo.children.length) escultura.grupo.remove(escultura.grupo.children[0]);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), materialPedestal);
  pedestal.position.y = 0.55;
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: desenharPlacaEscultura(obra) }));
  placa.position.set(0, 0.55, 0.76);
  escultura.grupo.add(pedestal, placa);

  escultura.girante = new THREE.Group();
  escultura.girante.position.y = 2.35;
  escultura.grupo.add(escultura.girante);
  escultura.anel = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.035, 12, 90), materialOuro);
  escultura.anel.rotation.x = 1.1;
  escultura.girante.add(escultura.anel);
  if (!obra) return;

  escultura.girante.add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.9, 0.2), materialOuro));
  const entrada = ARTES.find((a) => a.obra.id === obra.id);
  [1, -1].forEach((face) => {
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.65), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
    tela.position.z = 0.11 * face;
    tela.rotation.y = face < 0 ? Math.PI : 0;
    tela.userData = { entrada };
    escultura.girante.add(tela);
    areasClicaveis.push(tela);
    new THREE.TextureLoader().load(obra.img, (t) => { t.encoding = THREE.sRGBEncoding; tela.material = new THREE.MeshBasicMaterial({ map: t }); });
  });
}

// ---------- 5. Navegação ----------
const PONTO_INICIAL = 6;
let alvoZ = PONTO_INICIAL;
let zAtual = PONTO_INICIAL;
let mouseX = 0, mouseY = 0;
let entrou = false;
let obraEmFoco = null;
let sobMouse = null;
const olhar = new THREE.Vector3(0, 2.2, -30);
const olharAlvo = olhar.clone();
const posicaoAlvo = new THREE.Vector3();

addEventListener('wheel', (e) => {
  if (RK.ativo || !entrou || obraEmFoco) return;
  alvoZ = Math.max(zMinimo(), Math.min(PONTO_INICIAL, alvoZ - e.deltaY * 0.012));
}, { passive: true });

addEventListener('keydown', (e) => {
  if (RK.ativo || !entrou || $('#estudio').classList.contains('aberto') || e.target.tagName === 'INPUT') return;
  if (['ArrowUp', 'w'].includes(e.key)) alvoZ = Math.max(zMinimo(), alvoZ - 2.5);
  if (['ArrowDown', 's'].includes(e.key)) alvoZ = Math.min(PONTO_INICIAL, alvoZ + 2.5);
  if (e.key === 'Escape') voltarAoCorredor();
});

let arrasteY = null;
addEventListener('pointerdown', (e) => { arrasteY = e.clientY; });
addEventListener('pointerup', () => { arrasteY = null; });
addEventListener('pointermove', (e) => {
  mouseX = e.clientX / innerWidth - 0.5;
  mouseY = e.clientY / innerHeight - 0.5;
  if (arrasteY !== null && entrou && !obraEmFoco && !RK.ativo && e.pointerType === 'touch') {
    alvoZ = Math.max(zMinimo(), Math.min(PONTO_INICIAL, alvoZ + (e.clientY - arrasteY) * 0.04));
    arrasteY = e.clientY;
  }
  const acerto = obraSobOPonteiro(e);
  sobMouse = acerto ? acerto.object.userData.entrada : null;
  document.body.style.cursor = sobMouse ? 'pointer' : 'default';
});

const raio = new THREE.Raycaster();
const pontoDoMouse = new THREE.Vector2();
function obraSobOPonteiro(e) {
  if (!entrou || RK.ativo) return null;
  pontoDoMouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
  raio.setFromCamera(pontoDoMouse, cam);
  return raio.intersectObjects(areasClicaveis)[0];
}

$('#c').addEventListener('click', (e) => {
  const acerto = obraSobOPonteiro(e);
  if (acerto) abrirObra(acerto.object.userData.entrada); else voltarAoCorredor();
});

function abrirObra(entrada) {
  if (entrada.vazio) { abrirEstudio(); return; }
  entradaAberta = entrada;
  obraEmFoco = entrada.grupo;
  const lado = entrada.grupo.userData.lado;
  posicaoAlvo.set(entrada.grupo.position.x - lado * 4.1, 2.35, entrada.grupo.position.z);
  olharAlvo.set(entrada.grupo.position.x, 2.35, entrada.grupo.position.z);
  $('#etiqueta').classList.add('mostra');
  atualizarEtiqueta();
}

function voltarAoCorredor() {
  obraEmFoco = null; entradaAberta = null;
  $('#etiqueta').classList.remove('mostra');
}

function irAte(entrada) {
  alvoZ = Math.max(zMinimo(), entrada.grupo.userData.z + PONTO_INICIAL - 1);
  setTimeout(() => abrirObra(entrada), 750);
}

// ---------- 6. Etiqueta da obra ----------
function atualizarEtiqueta() {
  if (!entradaAberta) return;
  const obra = entradaAberta.obra;
  $('#et-titulo').textContent = obra.titulo;
  $('#et-autor').textContent = 'por ' + obra.autor;
  $('#btn-curtir').textContent = 'Curtir · ' + curtidasDe(obra);

  const lista = $('#et-comentarios');
  lista.textContent = '';
  dados.coms.filter((c) => c.obra === obra.id).sort((a, b) => a.hora - b.hora).forEach((c) => {
    const item = document.createElement('li'), nome = document.createElement('b');
    nome.textContent = c.nome + ': ';
    item.append(nome, document.createTextNode(c.texto));
    lista.append(item);
  });
  lista.scrollTop = 1e5;
}

$('#btn-curtir').onclick = () => {
  if (!entradaAberta) return;
  $('#btn-curtir').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 260 });
  adicionar('likes', { obra: entradaAberta.obra.id, hora: Date.now() });
};
$('#btn-voltar').onclick = voltarAoCorredor;
$('#btn-remover').onclick = () => {
  if (entradaAberta && confirm('Remover esta obra da galeria?')) {
    const id = entradaAberta.obra.id;
    voltarAoCorredor();
    remover('obras', id);
  }
};

function enviarComentario() {
  const texto = $('#com-texto').value.trim();
  if (!texto || !entradaAberta) return;
  const nome = $('#com-nome').value.trim() || 'Visitante';
  try { localStorage.setItem('etec-nome', nome); } catch (e) {}
  $('#com-texto').value = '';
  adicionar('coms', { obra: entradaAberta.obra.id, nome, texto, hora: Date.now() });
}
$('#btn-comentar').onclick = enviarComentario;
$('#com-texto').onkeydown = (e) => { if (e.key === 'Enter') enviarComentario(); };
try { $('#com-nome').value = localStorage.getItem('etec-nome') || ''; } catch (e) {}

// ---------- 7. O laço principal ----------
let tempoAnterior = 0;
function quadro(t) {
  t *= 0.001;
  const dt = Math.min(0.05, t - tempoAnterior);
  tempoAnterior = t;

  if (RK.ativo) { atualizarRanking(dt, t); R.render(RK.cena, RK.cam); }
  else { atualizarCorredor(t); R.render(S, cam); }
  requestAnimationFrame(quadro);
}

function atualizarCorredor(t) {
  zAtual += (alvoZ - zAtual) * 0.045;

  if (obraEmFoco) {
    cam.position.lerp(posicaoAlvo, 0.07);
    olhar.lerp(olharAlvo, 0.07);
  } else if (!entrou) {
    cam.position.set(Math.sin(t * 0.15) * 0.6, 2.3, zAtual);
    olhar.set(0, 2.1, zAtual - 14);
  } else {
    cam.position.lerp(new THREE.Vector3(mouseX * 1.2, 2.2 - mouseY * 0.25, zAtual), 0.08);
    olhar.lerp(new THREE.Vector3(mouseX * 4, 2.2 - mouseY * 0.8, zAtual - 12), 0.08);
  }
  cam.lookAt(olhar);

  holofotes.forEach((luz, i) => {
    const lado = i % 2 ? 1 : -1;
    const z = Math.round((zAtual - 3) / 6) * 6 - Math.floor(i / 2) * 6 + 3;
    luz.position.set(lado * 1.2, ALTURA - 0.1, z);
    luz.target.position.set(lado * LARGURA, 2.3, z - 2);
  });

  ARTES.forEach((a) => {
    if (!a.grupo) return;
    const alvo = (a === sobMouse || a.grupo === obraEmFoco) ? 1.03 : 1;
    a.grupo.userData.escala += (alvo - a.grupo.userData.escala) * 0.1;
    a.grupo.scale.setScalar(a.grupo.userData.escala);
  });

  glitter.materiais.forEach((m) => { m.emissiveIntensity = 0.14 + 0.1 * Math.sin(t * 3 + m.userData.fase); });
  glitter.brilhos.forEach((b) => {
    const k = Math.max(0, Math.sin(t * b.userData.vel + b.userData.fase));
    b.material.opacity = k; b.scale.setScalar(b.userData.tam * (0.5 + k));
  });

  if (escultura.girante) {
    escultura.girante.rotation.y = t * 0.45;
    escultura.girante.position.y = 2.35 + Math.sin(t * 1.3) * 0.07;
  }
  if (escultura.anel) escultura.anel.rotation.z = t * 0.8;

  const andado = (PONTO_INICIAL - zAtual) / (PONTO_INICIAL - zMinimo());
  $('#progresso i').style.width = Math.max(0, Math.min(1, andado)) * 100 + '%';
}

function redimensionar() {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  if (RK.cam) { RK.cam.aspect = innerWidth / innerHeight; RK.cam.updateProjectionMatrix(); }
}
addEventListener('resize', redimensionar);
