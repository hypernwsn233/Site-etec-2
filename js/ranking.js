/* ==========================================================================
   RANKING.JS — a "Sala do Ranking": uma cena 3D separada da galeria.

   Como funciona, em resumo:
     • O visitante é levado (com uma tela preta de transição) para uma sala escura.
     • A câmera anda sozinha pelo salão. Rolar o mouse (ou arrastar) acelera.
     • Cada pódio passa por 4 estados, na ordem 3º → 2º → 1º lugar:
           'dormindo' -> 'rachando' -> 'subindo' -> 'pronto'
       - dormindo: nada acontece ainda
       - rachando: desenha-se uma rachadura brilhante no chão que vai crescendo e o chão treme
       - subindo : o chão explode (pedaços voam, faíscas, onda de choque, flash)
                   e o pódio sobe por baixo da terra
       - pronto  : a obra flutua em cima do pódio, a luz acende, aparece a legenda
     • "p" é o progresso da caminhada (0 a 1). Cada pódio tem uma faixa de p
       em que começa a rachar e outra em que explode (veja ETAPAS).
   ========================================================================== */

// ---------- Configuração (mexa aqui para ajustar a cena) ----------
const CORES_PODIO = {                // aparência de cada colocação
  1: { metal: 0xd9ac2f, brilho: 0xffd36b, rugosidade: 0.22, metalico: 1.0 },    // ouro
  2: { metal: 0xc9ced6, brilho: 0xcfe0ff, rugosidade: 0.28, metalico: 1.0 },    // prata
  3: { metal: 0xb4693a, brilho: 0xff9a5c, rugosidade: 0.38, metalico: 0.9 },    // bronze
};
const ALTURA_PODIO = { 1: 3.4, 2: 2.4, 3: 1.6 };               // altura de cada pódio (m)
const POSICAO_PODIO = { 1: [0, -24], 2: [-4.8, -24], 3: [4.8, -24] };   // [x, z] de cada pódio
const ETAPAS = [                                                // quando cada pódio racha e sobe (em "p")
  { lugar: 3, rachar: 0.16, subir: 0.30 },
  { lugar: 2, rachar: 0.40, subir: 0.52 },
  { lugar: 1, rachar: 0.62, subir: 0.76 },
];
const CAMERA_Z_INICIO = 16;        // onde a câmera começa o passeio
const CAMERA_Z_FIM = -7;           // onde ela termina (de frente para os pódios)
const VELOCIDADE_AUTOMATICA = 0.04; // quanto "p" avança por segundo sozinho (0.04 = ~25 s no total)

// ---------- Estado da sala ----------
const RK = {
  ativo: false,         // true enquanto o visitante está na sala do ranking
  cena: null, cam: null,
  p: 0,                 // progresso da caminhada, de 0 a 1
  impulso: 0,           // empurrãozinho extra vindo da roda do mouse
  pausa: 0,             // segundos parados depois de uma explosão (para a cena "respirar")
  tremor: 0,            // força do tremor de câmera (decai sozinho)
  podios: [],           // os pódios criados, na ordem 3º, 2º, 1º
  proximo: 0,           // índice do próximo pódio que vai rachar/subir
  particulas: [], detritos: [], aneis: [],   // efeitos em andamento
  poeira: null,
  botoesTempo: 0,       // contagem para mostrar os botões finais
};

// ---------- Pequenas funções de "suavização" usadas nas animações ----------
const limitar = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const saiRapido = (k) => 1 - Math.pow(1 - k, 3);                       // começa rápido, termina devagar
const mola = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };  // passa um pouco do fim e volta
const suave = (k) => k * k * (3 - 2 * k);                              // começa e termina devagar
const entre = (a, b, k) => a + (b - a) * k;

// ==========================================================================
//  TEXTURAS DESENHADAS POR CÓDIGO
// ==========================================================================

// Piso de lajotas escuras com linhas de rejunte
function texturaPiso() {
  const c = criarCanvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#16181e'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  g.strokeStyle = '#2a2e38'; g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  return paraTextura(c, [4, 15]);
}

// Rachadura: linhas tortas que saem do centro, com um brilho laranja por dentro
function texturaRachadura() {
  const c = criarCanvas(512, 512), g = c.getContext('2d');
  g.translate(256, 256);
  g.lineCap = g.lineJoin = 'round';

  // desenha um caminho em 3 camadas: halo largo, contorno escuro, fio brilhante
  function tracar(pontos, espessura) {
    [[espessura * 4, 'rgba(255,110,30,.16)'], [espessura * 1.6, '#08080a'], [espessura * 0.55, '#ff9a3a']].forEach(([w, cor]) => {
      g.lineWidth = w; g.strokeStyle = cor; g.beginPath();
      pontos.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    });
  }
  // cria uma rachadura que vai se entortando; às vezes solta um galho menor
  function rachadura(x, y, angulo, passos, espessura, profundidade) {
    const pontos = [[x, y]];
    for (let s = 0; s < passos; s++) {
      angulo += (Math.random() - 0.5) * 0.95;
      const d = 14 + Math.random() * 22;
      x += Math.cos(angulo) * d; y += Math.sin(angulo) * d;
      pontos.push([x, y]);
      if (profundidade < 1 && Math.random() < 0.4) rachadura(x, y, angulo + (Math.random() < 0.5 ? 1 : -1) * 0.9, 3, espessura * 0.6, profundidade + 1);
    }
    tracar(pontos, espessura);
  }
  const ramos = 9;
  for (let i = 0; i < ramos; i++) rachadura(0, 0, i / ramos * Math.PI * 2 + Math.random() * 0.4, 7, 3.2, 0);
  return paraTextura(c);
}

// Mancha de luz circular (usada no brilho do chão e no halo dourado)
function texturaBrilho(corCentro) {
  const c = criarCanvas(256, 256), g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, corCentro); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return paraTextura(c);
}

// Placa na frente do pódio: número grande, título e autor
function texturaPlaca(lugar, obra, corMetal) {
  const c = criarCanvas(440, 280), g = c.getContext('2d');
  const cor = '#' + corMetal.toString(16).padStart(6, '0');
  const grad = g.createLinearGradient(0, 0, 440, 280);
  grad.addColorStop(0, cor); grad.addColorStop(1, '#0006');
  g.fillStyle = cor; g.fillRect(0, 0, 440, 280);
  g.fillStyle = grad; g.fillRect(0, 0, 440, 280);
  g.textAlign = 'center'; g.fillStyle = '#17120a';
  g.font = '500 150px Newsreader, Georgia, serif'; g.fillText(String(lugar), 220, 135);
  g.font = '500 32px Newsreader, Georgia, serif'; g.fillText(obra.titulo.slice(0, 20), 220, 195);
  g.font = '400 24px Instrument Sans, sans-serif'; g.fillText(obra.autor.slice(0, 24), 220, 235);
  return paraTextura(c);
}

// ==========================================================================
//  MONTAGEM DA CENA
// ==========================================================================

// Cria a sala toda e os pódios. "top" = lista de até 3 { obra, curtidas } da mais para a menos curtida.
function montarCenaRanking(top) {
  RK.cena = new THREE.Scene();
  RK.cena.background = new THREE.Color(0x07080c);
  RK.cena.fog = new THREE.FogExp2(0x07080c, 0.03);
  RK.cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 100);
  Object.assign(RK, { p: 0, impulso: 0, pausa: 0, tremor: 0, proximo: 0, botoesTempo: 0, podios: [], particulas: [], detritos: [], aneis: [] });

  RK.cena.add(new THREE.AmbientLight(0x8890a8, 0.38));

  // Piso
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(16, 64), new THREE.MeshStandardMaterial({ map: texturaPiso(), roughness: 0.35, metalness: 0.35 }));
  piso.rotation.x = -Math.PI / 2; piso.position.z = -12;
  RK.cena.add(piso);

  // Colunas dos dois lados, com uma faixa de luz quente, e luzes pontuais para iluminar o chão
  const materialColuna = new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.8 });
  const materialFaixa = new THREE.MeshBasicMaterial({ color: 0xffc36b });
  for (let i = 0; i < 8; i++) {
    const z = 18 - i * 6.5;
    [-1, 1].forEach((lado) => {
      const coluna = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7, 0.9), materialColuna);
      coluna.position.set(lado * 7.6, 3.5, z);
      const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.07, 5.6, 0.07), materialFaixa);
      faixa.position.set(lado * 7.12, 3.5, z);
      RK.cena.add(coluna, faixa);
    });
    if (i % 2 === 0) { const l = new THREE.PointLight(0xffb86b, 0.7, 16); l.position.set(0, 5, z); RK.cena.add(l); }
  }
  // Parede do fundo e teto escuros
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ color: 0x0d0f14, roughness: 1 }));
  fundo.position.set(0, 4, -34); RK.cena.add(fundo);
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(16, 64), new THREE.MeshBasicMaterial({ color: 0x050609 }));
  teto.rotation.x = Math.PI / 2; teto.position.set(0, 7, -12); RK.cena.add(teto);

  // Poeira flutuando no ar (dá profundidade)
  const pos = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i++) { pos[i * 3] = (Math.random() - 0.5) * 15; pos[i * 3 + 1] = Math.random() * 6.5; pos[i * 3 + 2] = 18 - Math.random() * 50; }
  const geoPoeira = new THREE.BufferGeometry();
  geoPoeira.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  RK.poeira = new THREE.Points(geoPoeira, new THREE.PointsMaterial({ size: 0.045, color: 0xffe2b0, transparent: true, opacity: 0.5, depthWrite: false }));
  RK.cena.add(RK.poeira);

  // Pódios: criamos só os que têm obra (se houver apenas 2 obras, não existe o 3º)
  ETAPAS.forEach((etapa) => {
    const item = top[etapa.lugar - 1];
    if (item) RK.podios.push(criarPodio(etapa, item));
  });
}

// Cria UM pódio (ainda enterrado) com todas as suas peças.
function criarPodio(etapa, item) {
  const lugar = etapa.lugar, cor = CORES_PODIO[lugar], altura = ALTURA_PODIO[lugar];
  const [px, pz] = POSICAO_PODIO[lugar];
  const material = new THREE.MeshStandardMaterial({
    color: cor.metal, metalness: cor.metalico, roughness: cor.rugosidade,
    emissive: cor.metal, emissiveIntensity: lugar === 1 ? 0.14 : 0.05,
  });

  // O grupo guarda o corpo do pódio e começa ENTERRADO (abaixo do chão, y negativo)
  const grupo = new THREE.Group();
  grupo.position.set(px, -altura - 0.3, pz);
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(2.6, altura, 2.6), material);
  corpo.position.y = altura / 2;
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshStandardMaterial({ map: texturaPlaca(lugar, item.obra, cor.metal), roughness: 0.4, metalness: 0.5 }));
  placa.position.set(0, Math.min(altura / 2, 0.85), 1.31);
  grupo.add(corpo, placa);
  RK.cena.add(grupo);

  // Quadro com a obra, flutuando em cima do pódio (fica separado do grupo para flutuar à parte)
  const quadro = new THREE.Group();
  quadro.add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.95, 0.14), material));
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 1.6), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  tela.position.z = 0.08;
  quadro.add(tela);
  new THREE.TextureLoader().load(item.obra.img, (t) => { t.encoding = THREE.sRGBEncoding; tela.material = new THREE.MeshBasicMaterial({ map: t }); });
  quadro.position.set(px, altura + 1.5, pz);
  quadro.scale.setScalar(0.001);            // invisível até o pódio terminar de subir
  RK.cena.add(quadro);

  // Rachadura no chão (imagem) e brilho laranja que vem de baixo
  const rachadura = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), new THREE.MeshBasicMaterial({ map: texturaRachadura(), transparent: true, opacity: 0, depthWrite: false }));
  rachadura.rotation.x = -Math.PI / 2; rachadura.position.set(px, 0.015, pz); rachadura.scale.setScalar(0.1);
  const brilhoChao = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: texturaBrilho('rgba(255,120,30,1)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  brilhoChao.rotation.x = -Math.PI / 2; brilhoChao.position.set(px, 0.012, pz); brilhoChao.scale.setScalar(0.1);
  RK.cena.add(rachadura, brilhoChao);

  // Holofote (começa apagado) e feixe de luz vindo do teto (começa invisível)
  const luz = new THREE.SpotLight(cor.brilho, 0, 24, 0.45, 0.6, 1);
  luz.position.set(px, 11, pz + 3); luz.target.position.set(px, altura + 1, pz);
  const feixe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.1, 9, 28, 1, true),
    new THREE.MeshBasicMaterial({ color: cor.brilho, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  feixe.position.set(px, 4.6, pz);
  RK.cena.add(luz, luz.target, feixe);

  // O campeão ganha também um halo dourado atrás da obra
  let halo = null;
  if (lugar === 1) {
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaBrilho('rgba(255,210,100,1)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(8); halo.position.set(px, altura + 1.5, pz - 0.6);
    RK.cena.add(halo);
  }

  return { lugar, etapa, cor, altura, px, pz, item, estado: 'dormindo', t: 0,
           grupo, quadro, rachadura, brilhoChao, luz, feixe, halo, emissor: 0 };
}

// ==========================================================================
//  EFEITOS ESPECIAIS
// ==========================================================================

// Sistema de partículas genérico (faíscas, confete...). pos e vel são listas [x,y,z, x,y,z, ...]
function criarSistema(pos, vel, { cor, tamanho, gravidade, vida, aditivo, cores, repousaNoChao }) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (cores) geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  const mat = new THREE.PointsMaterial({
    size: tamanho, color: cores ? 0xffffff : cor, vertexColors: !!cores, transparent: true, depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pontos = new THREE.Points(geo, mat);
  RK.cena.add(pontos);
  RK.particulas.push({ pontos, pos, vel, gravidade, vida, idade: 0, repousaNoChao });
}

// Pedaços de chão que voam quando o pódio estoura
const GEO_PEDACO = new THREE.BoxGeometry(1, 1, 1);
const MAT_PEDACO = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.85, emissive: 0x3a1500, emissiveIntensity: 0.5 });
function lancarPedacos(px, pz, quantidade) {
  for (let i = 0; i < quantidade; i++) {
    const m = new THREE.Mesh(GEO_PEDACO, MAT_PEDACO);
    const tam = 0.12 + Math.random() * 0.38;
    m.scale.set(tam, tam * (0.4 + Math.random() * 0.6), tam * (0.6 + Math.random()));
    m.position.set(px + (Math.random() - 0.5) * 2.6, 0.3, pz + (Math.random() - 0.5) * 2.6);
    const ang = Math.random() * 6.28, forca = 2 + Math.random() * 5;
    RK.cena.add(m);
    RK.detritos.push({ m, vx: Math.cos(ang) * forca, vy: 5 + Math.random() * 9, vz: Math.sin(ang) * forca,
                       giroX: (Math.random() - 0.5) * 12, giroZ: (Math.random() - 0.5) * 12, idade: 0 });
  }
}

// Faíscas que saltam do buraco (cor do metal do pódio)
function lancarFaiscas(pd) {
  const n = pd.lugar === 1 ? 170 : 90, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos.set([pd.px + (Math.random() - 0.5) * 2.4, 0.2, pd.pz + (Math.random() - 0.5) * 2.4], i * 3);
    const ang = Math.random() * 6.28, forca = 1.5 + Math.random() * 6;
    vel.set([Math.cos(ang) * forca, 5 + Math.random() * 9, Math.sin(ang) * forca], i * 3);
  }
  criarSistema(pos, vel, { cor: pd.cor.brilho, tamanho: 0.17, gravidade: -14, vida: 2.2, aditivo: true });
}

// Confete caindo do teto (só para o 1º lugar)
function lancarConfete(pd) {
  const n = 260, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), cores = new Float32Array(n * 3);
  const paleta = [0xffd36b, 0xffffff, 0xe8483d, 0x4a7bff, 0xf3a712].map((h) => new THREE.Color(h));
  for (let i = 0; i < n; i++) {
    pos.set([pd.px + (Math.random() - 0.5) * 13, 8 + Math.random() * 3, pd.pz + (Math.random() - 0.5) * 7], i * 3);
    vel.set([(Math.random() - 0.5) * 1.6, -1 - Math.random() * 2, (Math.random() - 0.5) * 1.6], i * 3);
    const c = paleta[Math.floor(Math.random() * paleta.length)];
    cores.set([c.r, c.g, c.b], i * 3);
  }
  criarSistema(pos, vel, { tamanho: 0.14, gravidade: -0.35, vida: 9, aditivo: false, cores, repousaNoChao: true });
}

// Onda de choque: um anel de luz que se espalha pelo chão. "atraso" = segundos até começar.
function criarAnel(px, pz, cor, atraso) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64),
    new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(px, 0.06, pz); m.scale.setScalar(0.001);
  RK.cena.add(m);
  RK.aneis.push({ m, atraso, idade: 0 });
}

// Clarão branco/dourado na tela inteira
function clarao(forte) {
  const el = $('#clarao');
  el.style.background = forte ? '#ffe9a8' : '#ffffff';
  el.animate([{ opacity: forte ? 0.9 : 0.5 }, { opacity: 0 }], { duration: forte ? 1100 : 650, easing: 'ease-out' });
}

// ==========================================================================
//  A EXPLOSÃO: junta todos os efeitos quando um pódio sobe
// ==========================================================================
function explodir(pd) {
  const campeao = pd.lugar === 1;
  pd.estado = 'subindo'; pd.t = 0;
  RK.tremor = campeao ? 1.7 : 1.0;
  RK.pausa = campeao ? 3.2 : 2.2;                  // a câmera para um pouco para você ver
  clarao(campeao);
  lancarPedacos(pd.px, pd.pz, campeao ? 42 : 28);
  lancarFaiscas(pd);
  criarAnel(pd.px, pd.pz, pd.cor.brilho, 0);
  if (campeao) { criarAnel(pd.px, pd.pz, 0xffffff, 0.25); criarAnel(pd.px, pd.pz, pd.cor.brilho, 0.55); lancarConfete(pd); }
}

// Legenda que aparece embaixo à esquerda quando um pódio fica pronto
function mostrarLegenda(pd) {
  const legenda = $('#rk-legenda');
  $('#rk-lugar').textContent = pd.lugar + 'º lugar';
  $('#rk-obra').textContent = pd.item.obra.titulo;
  $('#rk-autor').textContent = 'por ' + pd.item.obra.autor + ' · ';
  const numero = document.createElement('span');
  $('#rk-autor').append(numero, ' curtidas');
  legenda.classList.remove('mostra'); void legenda.offsetWidth; legenda.classList.add('mostra');
  const inicio = performance.now();          // contador subindo de 0 até o total de curtidas
  (function contar(agora) {
    const k = limitar((agora - inicio) / 1100);
    numero.textContent = Math.round(pd.item.curtidas * saiRapido(k));
    if (k < 1) requestAnimationFrame(contar);
  })(inicio);
}

// ==========================================================================
//  ATUALIZAÇÃO A CADA QUADRO
// ==========================================================================
function atualizarRanking(dt, t) {
  // 1) Avança a caminhada (parada durante a "pausa" depois de uma explosão)
  if (RK.pausa > 0) RK.pausa -= dt;
  else RK.p = Math.min(1, RK.p + dt * VELOCIDADE_AUTOMATICA + RK.impulso);
  RK.impulso = 0;

  // 2) Controla o pódio da vez: racha, espera as rachaduras crescerem, explode
  const pd = RK.podios[RK.proximo];
  if (pd) {
    const rachaduraCompleta = pd.estado === 'rachando' && pd.t >= 1.5;
    RK.p = Math.min(RK.p, rachaduraCompleta ? 1 : pd.etapa.subir - 0.002);   // não deixa passar da explosão antes da hora
    if (pd.estado === 'dormindo' && RK.p >= pd.etapa.rachar) { pd.estado = 'rachando'; pd.t = 0; }
    if (rachaduraCompleta && RK.p >= pd.etapa.subir) { explodir(pd); RK.proximo++; }
  }

  // 3) Câmera: anda pelo salão e, no fim, olha para os pódios
  const k = suave(RK.p);
  const camZ = entre(CAMERA_Z_INICIO, CAMERA_Z_FIM, k);
  RK.cam.position.set(Math.sin(t * 0.4) * 0.35, 2.2 + Math.sin(t * 0.8) * 0.04, camZ);
  RK.tremor *= Math.pow(0.03, dt);                                   // o tremor vai diminuindo
  RK.cam.position.x += (Math.random() - 0.5) * RK.tremor * 0.3;
  RK.cam.position.y += (Math.random() - 0.5) * RK.tremor * 0.3;
  RK.cam.lookAt(0, 1.7 + k * 1.1, entre(camZ - 14, -24, k));

  // 4) Anima cada pódio de acordo com o estado
  RK.podios.forEach((p) => atualizarPodio(p, dt, t));

  // 5) Anima os efeitos
  atualizarEfeitos(dt, t);

  // 6) Botões finais aparecem 2 s depois que o campeão ficou pronto
  const campeao = RK.podios.find((p) => p.lugar === 1);
  if (campeao && campeao.estado === 'pronto') {
    RK.botoesTempo += dt;
    if (RK.botoesTempo > 2) $('#rk-botoes').classList.add('mostra');
  }
}

function atualizarPodio(pd, dt, t) {
  pd.t += dt;

  if (pd.estado === 'rachando') {
    const k = limitar(pd.t / 1.8);
    pd.rachadura.scale.setScalar(0.12 + 0.88 * saiRapido(k));                  // a rachadura se espalha
    pd.rachadura.material.opacity = Math.min(1, k * 2);
    pd.brilhoChao.scale.setScalar(0.12 + 0.88 * saiRapido(k));
    pd.brilhoChao.material.opacity = (0.15 + 0.5 * k) * (0.85 + 0.15 * Math.sin(t * 14));   // pulsando
    RK.tremor = Math.max(RK.tremor, 0.12 + 0.28 * k);                           // o chão treme cada vez mais
  }

  if (pd.estado === 'subindo') {
    const k = limitar(pd.t / 1.2);
    pd.grupo.position.y = -pd.altura - 0.3 + (pd.altura + 0.3) * mola(k);       // sobe passando um pouquinho e assentando
    pd.brilhoChao.material.opacity = 0.65 * (1 - k);
    if (k >= 1) { pd.estado = 'pronto'; pd.t = 0; pd.grupo.position.y = 0; mostrarLegenda(pd); }
  }

  if (pd.estado === 'pronto') {
    // a obra aparece crescendo e depois flutua girando de leve
    const aparecer = saiRapido(limitar(pd.t / 0.9));
    pd.quadro.scale.setScalar(Math.max(0.001, aparecer));
    pd.quadro.position.y = pd.altura + 1.5 + Math.sin(t * 1.4 + pd.lugar) * 0.08;
    pd.quadro.rotation.y = Math.sin(t * 0.7 + pd.lugar) * 0.35;
    // a luz e o feixe acendem
    const alvoLuz = pd.lugar === 1 ? 5 : 3.2;
    pd.luz.intensity += (alvoLuz - pd.luz.intensity) * Math.min(1, dt * 2.5);
    pd.feixe.material.opacity += ((pd.lugar === 1 ? 0.16 : 0.09) - pd.feixe.material.opacity) * Math.min(1, dt * 2);
    if (pd.halo) pd.halo.material.opacity += (0.55 - pd.halo.material.opacity) * Math.min(1, dt * 2);
    // o campeão solta faíscas pequenas o tempo todo
    if (pd.lugar === 1) {
      pd.emissor -= dt;
      if (pd.emissor <= 0) {
        pd.emissor = 0.12;
        const pos = new Float32Array(18), vel = new Float32Array(18);
        for (let i = 0; i < 6; i++) { pos.set([pd.px + (Math.random() - 0.5) * 2.6, pd.altura + 0.6 + Math.random() * 2, pd.pz + 0.3], i * 3); vel.set([(Math.random() - 0.5) * 0.6, 1 + Math.random(), 0], i * 3); }
        criarSistema(pos, vel, { cor: 0xffe08a, tamanho: 0.08, gravidade: 0, vida: 1.6, aditivo: true });
      }
    }
  }
}

function atualizarEfeitos(dt, t) {
  // Partículas: movem-se, sofrem gravidade, somem aos poucos
  for (let i = RK.particulas.length - 1; i >= 0; i--) {
    const s = RK.particulas[i];
    s.idade += dt;
    for (let j = 0; j < s.pos.length; j += 3) {
      s.pos[j] += s.vel[j] * dt; s.pos[j + 1] += s.vel[j + 1] * dt; s.pos[j + 2] += s.vel[j + 2] * dt;
      s.vel[j + 1] += s.gravidade * dt;
      if (s.repousaNoChao && s.pos[j + 1] < 0.04) { s.pos[j + 1] = 0.04; s.vel[j] = s.vel[j + 1] = s.vel[j + 2] = 0; }   // confete para no chão
    }
    s.pontos.geometry.attributes.position.needsUpdate = true;
    s.pontos.material.opacity = s.repousaNoChao ? limitar((s.vida - s.idade) / 2) : 1 - Math.pow(limitar(s.idade / s.vida), 2);
    if (s.idade > s.vida) { RK.cena.remove(s.pontos); s.pontos.geometry.dispose(); RK.particulas.splice(i, 1); }
  }

  // Pedaços de chão: gravidade, quicam no chão, depois encolhem e somem
  for (let i = RK.detritos.length - 1; i >= 0; i--) {
    const d = RK.detritos[i];
    d.idade += dt; d.vy -= 26 * dt;
    d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
    d.m.rotation.x += d.giroX * dt; d.m.rotation.z += d.giroZ * dt;
    const meiaAltura = d.m.scale.y / 2;
    if (d.m.position.y < meiaAltura) {          // bateu no chão: quica perdendo força
      d.m.position.y = meiaAltura; d.vy *= -0.32; d.vx *= 0.72; d.vz *= 0.72; d.giroX *= 0.7; d.giroZ *= 0.7;
    }
    if (d.idade > 6) d.m.scale.multiplyScalar(0.94);        // encolhe no final
    if (d.idade > 7) { RK.cena.remove(d.m); RK.detritos.splice(i, 1); }
  }

  // Ondas de choque: crescem e somem
  for (let i = RK.aneis.length - 1; i >= 0; i--) {
    const a = RK.aneis[i];
    a.idade += dt;
    const k = (a.idade - a.atraso) / 1.0;
    if (k < 0) continue;                                    // ainda não é a vez deste anel
    a.m.scale.setScalar(1 + saiRapido(k) * 11);
    a.m.material.opacity = Math.max(0, 1 - k) * 0.9;
    if (k > 1) { RK.cena.remove(a.m); RK.aneis.splice(i, 1); }
  }

  // Poeira sobe devagar e reaparece embaixo
  const p = RK.poeira.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { p.array[i * 3 + 1] += dt * 0.15; if (p.array[i * 3 + 1] > 6.5) p.array[i * 3 + 1] = 0; }
  p.needsUpdate = true;
}

// ==========================================================================
//  ENTRAR E SAIR DA SALA
// ==========================================================================

// Tela preta que escurece, executa algo no escuro, e clareia (a "viagem" para outro lugar)
function cortina(noEscuro) {
  const el = $('#cortina');
  el.style.display = 'block';
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 550, fill: 'forwards' }).finished
    .then(() => { noEscuro(); return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 300, fill: 'forwards' }).finished; })
    .then(() => { el.style.display = 'none'; });
}

function entrarNoRanking() {
  const top = obrasMaisCurtidas().slice(0, 3);
  if (!top.length) { avisar('Ainda não há obras no ranking. Crie a primeira!'); return; }
  voltarAoCorredor();
  cortina(() => {
    montarCenaRanking(top);
    RK.ativo = true;
    document.body.classList.add('rk');
    $('#rk-legenda').classList.remove('mostra');
    $('#rk-botoes').classList.remove('mostra');
    // o título "Sala do Ranking" aparece e some
    $('#rk-titulo').animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none', offset: 0.2 }, { opacity: 1, transform: 'none', offset: 0.75 }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 4200, delay: 700, fill: 'both' });
  });
}

function sairDoRanking(depois) {
  cortina(() => {
    RK.ativo = false; RK.cena = null; RK.cam = null;
    document.body.classList.remove('rk');
    if (depois) depois();
  });
}

// ---------- Controles do ranking ----------
$('#btn-ranking').onclick = entrarNoRanking;
$('#rk-sair').onclick = $('#rk-sair-topo').onclick = () => sairDoRanking();
$('#rk-ver').onclick = () => {
  const campeao = obrasMaisCurtidas()[0];
  sairDoRanking(() => {
    const entrada = ARTES.find((a) => campeao && a.obra.id === campeao.obra.id);
    if (entrada) irAte(entrada);
  });
};
addEventListener('wheel', (e) => { if (RK.ativo) RK.impulso += Math.abs(e.deltaY) * 0.00008; }, { passive: true });
addEventListener('pointermove', (e) => { if (RK.ativo && e.buttons) RK.impulso += Math.abs(e.movementY || 0) * 0.0004; });
addEventListener('keydown', (e) => {
  if (!RK.ativo) return;
  if (e.key === 'Escape') sairDoRanking();
  if (e.key === 'ArrowUp' || e.key === ' ') RK.impulso += 0.01;
});
