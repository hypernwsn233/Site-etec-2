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
const R = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true });   // R = o "pintor" do 3D
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.outputEncoding = THREE.sRGBEncoding;

const S = new THREE.Scene();                                 // S = a cena da galeria
S.background = new THREE.Color(0xdcdee1);
S.fog = new THREE.Fog(0xdcdee1, 14, 46);                     // névoa: objetos longe vão sumindo
const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 80);     // cam = os "olhos" do visitante
S.add(new THREE.HemisphereLight(0xffffff, 0xb9a58c, 0.75));  // luz geral suave

// Medidas da sala (em metros do mundo 3D)
const LARGURA = 4.5;       // metade da largura do corredor (parede fica em x = ±4.5)
const ALTURA = 4.4;        // altura do teto
const COMPRIMENTO = 120;   // comprimento total do corredor
const FIM_DO_CHAO = 12;    // onde o corredor começa (z = 12, de onde o visitante parte)
const centroZ = -COMPRIMENTO / 2 + FIM_DO_CHAO;

// ---------- 2. A sala ----------
// Piso de tábuas: desenhamos as tábuas num canvas e repetimos como textura.
(function criarPiso() {
  const c = criarCanvas(512, 512), g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {                               // 8 tábuas lado a lado
    g.fillStyle = `hsl(32, ${32 + Math.random() * 8}%, ${58 + Math.random() * 10}%)`;
    g.fillRect(i * 64, 0, 64, 512);
    for (let k = 0; k < 40; k++) {                            // veios da madeira
      g.fillStyle = `hsla(30, 30%, 30%, ${Math.random() * 0.06})`;
      g.fillRect(i * 64 + Math.random() * 64, 0, 1, 512);
    }
    g.fillStyle = '#0003'; g.fillRect(i * 64, 0, 1.5, 512);   // frestas entre as tábuas
    g.fillRect(i * 64, Math.random() * 512, 64, 1.5);         // emendas
  }
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGURA * 2, COMPRIMENTO),
    new THREE.MeshStandardMaterial({ map: paraTextura(c, [2, COMPRIMENTO / 8]), roughness: 0.45, metalness: 0.05 })
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.z = centroZ;
  S.add(piso);
})();

// Teto, paredes laterais, rodapé e parede do fundo
const materialParede = new THREE.MeshStandardMaterial({ color: 0xe8e9eb, roughness: 0.95 });
const materialRodape = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.6 });

const teto = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA * 2, COMPRIMENTO), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }));
teto.rotation.x = Math.PI / 2; teto.position.set(0, ALTURA, centroZ); S.add(teto);

[-1, 1].forEach((lado) => {                                   // -1 = parede esquerda, 1 = direita
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(COMPRIMENTO, ALTURA), materialParede);
  parede.rotation.y = -lado * Math.PI / 2;
  parede.position.set(lado * LARGURA, ALTURA / 2, centroZ);
  S.add(parede);
  const rodape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, COMPRIMENTO), materialRodape);
  rodape.position.set(lado * (LARGURA - 0.03), 0.1, centroZ);
  S.add(rodape);
});

// Parede do fundo: é reposicionada para ficar logo depois da escultura.
const paredeFundo = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA * 2, ALTURA), materialParede);
paredeFundo.position.set(0, ALTURA / 2, -COMPRIMENTO + FIM_DO_CHAO);
S.add(paredeFundo);

// Banco no meio do corredor (para dar escala e vida à sala)
const bancoBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 3), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 }));
const bancoAssento = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 3.1), new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.6 }));
bancoBase.position.set(0, 0.22, -16); bancoAssento.position.set(0, 0.48, -16);
S.add(bancoBase, bancoAssento);

// Holofotes: 6 luzes que andam junto com o visitante e iluminam os quadros por perto.
const holofotes = [];
for (let i = 0; i < 6; i++) {
  const luz = new THREE.SpotLight(0xfff1dc, 1.5, 16, 0.55, 0.7, 1.4);
  luz.target = new THREE.Object3D();
  S.add(luz, luz.target);
  holofotes.push(luz);
}

// Sombra suave que fica atrás de cada moldura (dá a impressão de quadro "descolado" da parede)
const texturaSombra = (function () {
  const c = criarCanvas(128, 128), g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.34)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return paraTextura(c);
})();

// ---------- 3. As molduras ----------
// Cores/material de cada estilo de moldura: [cor, rugosidade, metal]
const MOLDURAS = {
  oak:   [0x8a6238, 0.7, 0],     // carvalho
  black: [0x18191b, 0.5, 0.2],   // preta
  white: [0xf3f3f1, 0.6, 0],     // branca
  brass: [0xb08d4a, 0.35, 0.85], // latão
};

// ARTES = tudo que ocupa uma moldura na parede: as obras salvas + 2 "espaços livres" no final.
// Cada item: { obra, vazio, grupo (o objeto 3D da moldura) }
let ARTES = [];
const molduraObjetos = [];    // todos os grupos 3D das molduras (para remover ao reconstruir)
const areasClicaveis = [];    // as "telas" das obras, usadas para detectar clique do mouse

// Desenho do "Sua obra aqui +" para os espaços livres
function desenharEspacoLivre() {
  const c = criarCanvas(600, 450), g = c.getContext('2d');
  g.fillStyle = '#f0f1f2'; g.fillRect(0, 0, 600, 450);
  g.strokeStyle = '#9aa0a7'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(300, 170); g.lineTo(300, 280); g.moveTo(245, 225); g.lineTo(355, 225); g.stroke();   // o sinal de "+"
  g.fillStyle = '#6c727a'; g.font = '500 30px Instrument Sans, sans-serif'; g.textAlign = 'center';
  g.fillText('Sua obra aqui', 300, 350);
  return c;
}

// Plaquinha ao lado do quadro: título e autor
function desenharPlaquinha(obra) {
  const c = criarCanvas(300, 150), g = c.getContext('2d');
  g.fillStyle = '#fafafa'; g.fillRect(0, 0, 300, 150);
  g.fillStyle = '#1c1f24'; g.font = '500 26px Newsreader, Georgia, serif'; g.fillText(obra.titulo.slice(0, 22), 18, 62);
  g.fillStyle = '#6c727a'; g.font = '400 19px Instrument Sans, sans-serif'; g.fillText(obra.autor.slice(0, 26), 18, 98);
  return paraTextura(c);
}

// Constrói a moldura de UMA obra. "posicao" é o número dela na fila (0, 1, 2...).
// Obras pares ficam na parede esquerda, ímpares na direita, a cada 6 m.
function criarMoldura(entrada, posicao) {
  const lado = posicao % 2 ? 1 : -1;
  const z = -5 - Math.floor(posicao / 2) * 6;
  const grupo = new THREE.Group();
  const [cor, rugosidade, metal] = MOLDURAS[entrada.obra.moldura] || MOLDURAS.oak;
  const materialMoldura = new THREE.MeshStandardMaterial({ color: cor, roughness: rugosidade, metalness: metal });

  // Quatro ripas formando a borda da moldura
  const espessura = 0.14, largura = 3.3, altura = 2.6;
  [[0, altura / 2 - espessura / 2, largura, espessura], [0, -altura / 2 + espessura / 2, largura, espessura],
   [-largura / 2 + espessura / 2, 0, espessura, altura], [largura / 2 - espessura / 2, 0, espessura, altura]]
    .forEach(([px, py, w, h]) => {
      const ripa = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), materialMoldura);
      ripa.position.set(px, py, 0.07);
      grupo.add(ripa);
    });

  // Passe-partout (a margem branca entre a moldura e a obra)
  const passepartout = new THREE.Mesh(new THREE.PlaneGeometry(largura - 2 * espessura, altura - 2 * espessura),
    new THREE.MeshStandardMaterial({ color: 0xfbfbf9, roughness: 1 }));
  passepartout.position.z = 0.03;
  grupo.add(passepartout);

  // A obra em si
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  tela.position.z = 0.035;
  grupo.add(tela);
  if (entrada.vazio) {
    tela.material = new THREE.MeshBasicMaterial({ map: paraTextura(desenharEspacoLivre()) });
  } else {
    new THREE.TextureLoader().load(entrada.obra.img, (t) => {   // carrega a imagem desenhada no estúdio
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

  // Cola o grupo na parede, virado para dentro do corredor
  grupo.position.set(lado * (LARGURA - 0.01), 2.35, z);
  grupo.rotation.y = -lado * Math.PI / 2;
  S.add(grupo);

  tela.userData = { entrada };           // guarda de quem é essa tela (para o clique)
  areasClicaveis.push(tela);
  grupo.userData = { lado, z, escala: 1 };
  molduraObjetos.push(grupo);
  entrada.grupo = grupo;
}

// Reconstrói as molduras sempre que as obras mudam (nova obra, obra removida...)
let assinaturaObras = null;   // lembra a lista atual para só reconstruir quando mudar
let entradaAberta = null;     // a obra que está aberta na etiqueta agora (ou null)

function atualizarGaleria() {
  const obras = [...dados.obras].sort((a, b) => a.hora - b.hora);
  const assinatura = obras.map((o) => o.id).join();

  if (assinatura !== assinaturaObras) {
    assinaturaObras = assinatura;
    const idAberto = entradaAberta && entradaAberta.obra.id;

    molduraObjetos.splice(0).forEach((m) => S.remove(m));      // tira as molduras antigas
    areasClicaveis.length = 0;

    const livre = () => ({ vazio: true, obra: { id: '', titulo: 'Espaço livre', autor: 'Clique para criar', moldura: 'white' } });
    ARTES = [...obras.map((obra) => ({ obra, vazio: false })), livre(), livre()];
    ARTES.forEach(criarMoldura);

    escultura.chave = null;                                    // força refazer a escultura
    entradaAberta = idAberto ? ARTES.find((a) => a.obra.id === idAberto) || null : null;
    if (entradaAberta) abrirObra(entradaAberta); else if (obraEmFoco) voltarAoCorredor();
  }
  atualizarEscultura();
  atualizarEtiqueta();
}

// ---------- 4. A escultura da obra mais curtida ----------
// Fica no fim do corredor, girando e flutuando sobre um pedestal.
// Se ninguém curtiu nada ainda, mostra só um anel dourado esperando.
const escultura = { grupo: new THREE.Group(), girante: null, anel: null, chave: null };
const holofoteEscultura = new THREE.SpotLight(0xfff1dc, 2.8, 14, 0.6, 0.5, 1);
S.add(escultura.grupo, holofoteEscultura, holofoteEscultura.target);

const materialOuro = new THREE.MeshStandardMaterial({ color: 0xd4a72c, metalness: 1, roughness: 0.25 });
const materialPedestal = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.6 });

// Quão longe o visitante consegue andar (z mínimo): até o último quadro.
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

  // Posição: logo depois do último quadro; a parede do fundo vem junto
  const z = zMinimo() - 4;
  escultura.grupo.position.set(0, 0, z);
  paredeFundo.position.z = z - 6;
  holofoteEscultura.position.set(0, ALTURA - 0.2, z + 2);
  holofoteEscultura.target.position.set(0, 2, z);

  if (chave === escultura.chave) return;      // nada mudou, não precisa refazer
  escultura.chave = chave;
  while (escultura.grupo.children.length) escultura.grupo.remove(escultura.grupo.children[0]);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), materialPedestal);
  pedestal.position.y = 0.55;
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: desenharPlacaEscultura(obra) }));
  placa.position.set(0, 0.55, 0.76);
  escultura.grupo.add(pedestal, placa);

  escultura.girante = new THREE.Group();      // tudo que gira junto
  escultura.girante.position.y = 2.35;
  escultura.grupo.add(escultura.girante);
  escultura.anel = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.035, 12, 90), materialOuro);
  escultura.anel.rotation.x = 1.1;
  escultura.girante.add(escultura.anel);
  if (!obra) return;

  // Placa de ouro com a obra nas duas faces
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
const PONTO_INICIAL = 6;          // onde o visitante começa no corredor (z)
let alvoZ = PONTO_INICIAL;        // para onde ele quer ir
let zAtual = PONTO_INICIAL;       // onde a câmera está (vai suavemente até o alvo)
let mouseX = 0, mouseY = 0;       // posição do mouse (-0.5 a 0.5) para o efeito de olhar em volta
let entrou = false;               // true depois de clicar em "Entrar"
let obraEmFoco = null;            // grupo 3D da moldura que a câmera está olhando de perto
let sobMouse = null;              // moldura sob o mouse (cresce um pouquinho)
const olhar = new THREE.Vector3(0, 2.2, -30);        // para onde a câmera olha agora
const olharAlvo = olhar.clone();                     // para onde ela quer olhar (ao focar uma obra)
const posicaoAlvo = new THREE.Vector3();             // onde ela quer estar (ao focar uma obra)

// Roda do mouse anda pelo corredor
addEventListener('wheel', (e) => {
  if (RK.ativo || !entrou || obraEmFoco) return;
  alvoZ = Math.max(zMinimo(), Math.min(PONTO_INICIAL, alvoZ - e.deltaY * 0.012));
}, { passive: true });

// Setas / W S andam, Esc volta do zoom numa obra
addEventListener('keydown', (e) => {
  if (RK.ativo || !entrou || $('#estudio').classList.contains('aberto') || e.target.tagName === 'INPUT') return;
  if (['ArrowUp', 'w'].includes(e.key)) alvoZ = Math.max(zMinimo(), alvoZ - 2.5);
  if (['ArrowDown', 's'].includes(e.key)) alvoZ = Math.min(PONTO_INICIAL, alvoZ + 2.5);
  if (e.key === 'Escape') voltarAoCorredor();
});

// Arrastar o dedo (celular) anda pelo corredor; o mouse move o "olhar"
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

// Descobre qual obra está debaixo do mouse (lançando um "raio" da câmera até a tela)
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

// Aproxima a câmera de uma obra e mostra a etiqueta
function abrirObra(entrada) {
  if (entrada.vazio) { abrirEstudio(); return; }          // espaço livre = abre o estúdio
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

// Anda até uma obra distante (usado pelo ranking) e então abre ela
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
  lista.textContent = '';                                  // limpa e refaz a lista de comentários
  dados.coms.filter((c) => c.obra === obra.id).sort((a, b) => a.hora - b.hora).forEach((c) => {
    const item = document.createElement('li'), nome = document.createElement('b');
    nome.textContent = c.nome + ': ';
    item.append(nome, document.createTextNode(c.texto));   // textContent/TextNode: evita injetar HTML
    lista.append(item);
  });
  lista.scrollTop = 1e5;
}

// Cada clique em "Curtir" soma 1 (pode curtir quantas vezes quiser)
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
  try { localStorage.setItem('etec-nome', nome); } catch (e) {}   // lembra o nome para a próxima vez
  $('#com-texto').value = '';
  adicionar('coms', { obra: entradaAberta.obra.id, nome, texto, hora: Date.now() });
}
$('#btn-comentar').onclick = enviarComentario;
$('#com-texto').onkeydown = (e) => { if (e.key === 'Enter') enviarComentario(); };
try { $('#com-nome').value = localStorage.getItem('etec-nome') || ''; } catch (e) {}

// ---------- 7. O laço principal ----------
// Roda ~60 vezes por segundo. Decide qual cena desenhar: o ranking ou a galeria.
let tempoAnterior = 0;
function quadro(t) {
  t *= 0.001;                                            // milissegundos -> segundos
  const dt = Math.min(0.05, t - tempoAnterior);          // tempo desde o quadro anterior
  tempoAnterior = t;

  if (RK.ativo) { atualizarRanking(dt, t); R.render(RK.cena, RK.cam); }
  else { atualizarCorredor(t); R.render(S, cam); }
  requestAnimationFrame(quadro);
}

function atualizarCorredor(t) {
  zAtual += (alvoZ - zAtual) * 0.045;                    // anda suavemente até o alvo

  if (obraEmFoco) {                                      // de perto numa obra
    cam.position.lerp(posicaoAlvo, 0.07);
    olhar.lerp(olharAlvo, 0.07);
  } else if (!entrou) {                                  // antes de entrar: balança de leve
    cam.position.set(Math.sin(t * 0.15) * 0.6, 2.3, zAtual);
    olhar.set(0, 2.1, zAtual - 14);
  } else {                                               // andando: o mouse move o olhar um pouco
    cam.position.lerp(new THREE.Vector3(mouseX * 1.2, 2.2 - mouseY * 0.25, zAtual), 0.08);
    olhar.lerp(new THREE.Vector3(mouseX * 4, 2.2 - mouseY * 0.8, zAtual - 12), 0.08);
  }
  cam.lookAt(olhar);

  // Holofotes acompanham: ficam em volta da câmera, alternando as paredes
  holofotes.forEach((luz, i) => {
    const lado = i % 2 ? 1 : -1;
    const z = Math.round((zAtual - 3) / 6) * 6 - Math.floor(i / 2) * 6 + 3;
    luz.position.set(lado * 1.2, ALTURA - 0.1, z);
    luz.target.position.set(lado * LARGURA, 2.3, z - 2);
  });

  // Moldura sob o mouse (ou em foco) cresce 3%
  ARTES.forEach((a) => {
    if (!a.grupo) return;
    const alvo = (a === sobMouse || a.grupo === obraEmFoco) ? 1.03 : 1;
    a.grupo.userData.escala += (alvo - a.grupo.userData.escala) * 0.1;
    a.grupo.scale.setScalar(a.grupo.userData.escala);
  });

  // Escultura gira e flutua
  if (escultura.girante) {
    escultura.girante.rotation.y = t * 0.45;
    escultura.girante.position.y = 2.35 + Math.sin(t * 1.3) * 0.07;
  }
  if (escultura.anel) escultura.anel.rotation.z = t * 0.8;

  // Barra de progresso embaixo à direita
  const andado = (PONTO_INICIAL - zAtual) / (PONTO_INICIAL - zMinimo());
  $('#progresso i').style.width = Math.max(0, Math.min(1, andado)) * 100 + '%';
}

function redimensionar() {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  if (RK.cam) { RK.cam.aspect = innerWidth / innerHeight; RK.cam.updateProjectionMatrix(); }
}
addEventListener('resize', redimensionar);
