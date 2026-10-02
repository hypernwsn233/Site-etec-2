/* ==========================================================================
   ESTUDIO.JS — a tela de desenho.
   Como funciona:
     • Cada CAMADA é um canvas invisível do tamanho da obra (1200 x 900).
     • A tela que você vê (#tela) mostra todas as camadas empilhadas (função juntarCamadas).
     • Qualquer ferramenta desenha na camada ATIVA (a variável "ctx").
     • Desfazer guarda uma cópia da camada antes de cada traço.
   ========================================================================== */

const tela = $('#tela');
const telaCtx = tela.getContext('2d');          // contexto da tela visível
const LARG = 1200, ALT = 900;                   // tamanho da obra em pixels

// Ferramentas que pintam arrastando o mouse (traço contínuo)
const FERRAMENTAS_DE_TRACO = ['pincel', 'lapis', 'aero', 'marcador', 'caneta', 'borracha', 'spray'];

let camadas = [];       // lista de camadas, da de baixo para a de cima: { canvas, nome, visivel, opacidade, mistura }
let ativa = 0;          // índice da camada onde estamos desenhando
let ctx = null;         // contexto 2D da camada ativa
let ferramenta = 'pincel';
let desenhando = false; // true enquanto o botão do mouse está apertado
let inicioX = 0, inicioY = 0;      // onde o traço/forma começou
let suaveX = 0, suaveY = 0;        // posição "suavizada" do cursor (estabilização)
let ultimosPontos = [];            // últimos pontos do traço (vários, se a simetria estiver ligada)
let fotoDaCamada = null;           // cópia da camada no início do traço (para pré-visualizar formas)
let historico = [], refeitos = [];  // pilhas de desfazer / refazer
let pedidoDeQuadro = 0;

// ---------- Camadas ----------
function novaCamada(nome, branca) {
  const canvas = criarCanvas(LARG, ALT);
  if (branca) { const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, LARG, ALT); }
  return { canvas, nome, visivel: true, opacidade: 1, mistura: 'source-over' };
}

// Empilha todas as camadas visíveis na tela que o usuário vê
function juntarCamadas() {
  pedidoDeQuadro = 0;
  telaCtx.globalCompositeOperation = 'source-over'; telaCtx.globalAlpha = 1;
  telaCtx.clearRect(0, 0, LARG, ALT);
  camadas.forEach((c) => {
    if (!c.visivel) return;
    telaCtx.globalAlpha = c.opacidade;
    telaCtx.globalCompositeOperation = c.mistura;
    telaCtx.drawImage(c.canvas, 0, 0);
  });
  telaCtx.globalAlpha = 1; telaCtx.globalCompositeOperation = 'source-over';
}
// Pede para redesenhar a tela no próximo quadro (evita redesenhar demais)
const redesenhar = () => { if (!pedidoDeQuadro) pedidoDeQuadro = requestAnimationFrame(juntarCamadas); };

function escolherCamada(i) {
  ativa = Math.max(0, Math.min(camadas.length - 1, i));
  ctx = camadas[ativa].canvas.getContext('2d', { willReadFrequently: true });
  mostrarListaDeCamadas();
}

function mostrarListaDeCamadas() {
  const lista = $('#lista-camadas');
  lista.textContent = '';
  camadas.map((c, i) => i).reverse().forEach((i) => {        // a camada de cima aparece primeiro
    const c = camadas[i], item = document.createElement('li');
    const olho = document.createElement('input'), nome = document.createElement('span');
    olho.type = 'checkbox'; olho.checked = c.visivel;
    olho.onclick = (e) => { e.stopPropagation(); c.visivel = olho.checked; redesenhar(); };   // mostrar/esconder
    nome.textContent = c.nome;
    item.append(olho, nome);
    item.className = i === ativa ? 'on' : '';
    item.onclick = () => escolherCamada(i);
    lista.append(item);
  });
  $('#cam-mistura').value = camadas[ativa].mistura;
  $('#cam-opac').value = camadas[ativa].opacidade * 100;
}

function recomecar() {                                       // uma folha nova: fundo branco + 1 camada
  camadas = [novaCamada('Fundo', true), novaCamada('Camada 1')];
  historico = []; refeitos = [];
  escolherCamada(1);
  redesenhar();
}

$('#cam-nova').onclick = () => { camadas.splice(ativa + 1, 0, novaCamada('Camada ' + camadas.length)); escolherCamada(ativa + 1); redesenhar(); };
$('#cam-dup').onclick = () => {
  const copia = novaCamada(camadas[ativa].nome + ' cópia');
  copia.canvas.getContext('2d').drawImage(camadas[ativa].canvas, 0, 0);
  copia.opacidade = camadas[ativa].opacidade; copia.mistura = camadas[ativa].mistura;
  camadas.splice(ativa + 1, 0, copia); escolherCamada(ativa + 1); redesenhar();
};
$('#cam-del').onclick = () => { if (camadas.length < 2) return; camadas.splice(ativa, 1); escolherCamada(Math.max(0, ativa - 1)); redesenhar(); };
$('#cam-sobe').onclick = () => { if (ativa < camadas.length - 1) { [camadas[ativa], camadas[ativa + 1]] = [camadas[ativa + 1], camadas[ativa]]; escolherCamada(ativa + 1); redesenhar(); } };
$('#cam-desce').onclick = () => { if (ativa > 0) { [camadas[ativa], camadas[ativa - 1]] = [camadas[ativa - 1], camadas[ativa]]; escolherCamada(ativa - 1); redesenhar(); } };
$('#cam-mistura').onchange = () => { camadas[ativa].mistura = $('#cam-mistura').value; redesenhar(); };
$('#cam-opac').oninput = () => { camadas[ativa].opacidade = $('#cam-opac').value / 100; redesenhar(); };

// ---------- Lista de ferramentas e paleta de cores ----------
const LISTA_FERRAMENTAS = [
  ['pincel', 'Pincel'], ['lapis', 'Lápis'], ['aero', 'Aerógrafo'], ['marcador', 'Marcador'], ['caneta', 'Caneta caligráfica'],
  ['spray', 'Spray'], ['borracha', 'Borracha'], ['balde', 'Balde de tinta'], ['gotas', 'Conta-gotas'],
  ['linha', 'Linha'], ['ret', 'Retângulo'], ['elipse', 'Elipse'], ['grad', 'Gradiente'], ['texto', 'Texto'],
];
function escolherFerramenta(nome) {
  ferramenta = nome;
  document.querySelectorAll('#est-ferramentas button').forEach((b) => b.classList.toggle('on', b.dataset.k === nome));
}
LISTA_FERRAMENTAS.forEach(([nome, rotulo]) => {
  const botao = document.createElement('button');
  botao.textContent = rotulo; botao.dataset.k = nome;
  botao.onclick = () => escolherFerramenta(nome);
  $('#est-ferramentas').append(botao);
});
escolherFerramenta('pincel');

['#1c1f24', '#ffffff', '#b3202a', '#e2661f', '#f0b429', '#2f8f4e', '#1d3fa8', '#7a3d8c',
 '#8a6238', '#8d949c', '#f2a7b5', '#9ad0e8', '#c8d96f', '#0e5a5a', '#5b3a1e', '#e9dcc4'].forEach((cor) => {
  const botao = document.createElement('button');
  botao.style.background = cor; botao.title = cor;
  botao.onclick = () => { $('#cor1').value = cor; };
  $('#paleta').append(botao);
});

// ---------- Utilidades de desenho ----------
// Posição do mouse dentro da obra (converte pixels da tela para pixels de 1200x900)
function posicaoNaTela(e) {
  const r = tela.getBoundingClientRect();
  return [(e.clientX - r.left) * LARG / r.width, (e.clientY - r.top) * ALT / r.height];
}
const corComAlpha = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

// Simetria: devolve o ponto e seus "espelhos". O modo vem do menu (0 nenhuma, 1 vertical, 2 horizontal, 3 ambos).
function comEspelhos(x, y) {
  const lista = [[x, y]], modo = +$('#simetria').value;
  if (modo & 1) lista.push([LARG - x, y]);
  if (modo & 2) lista.push([x, ALT - y]);
  if (modo === 3) lista.push([LARG - x, ALT - y]);
  return lista;
}

// Guarda uma cópia da camada para o "Desfazer"
function guardarParaDesfazer() {
  historico.push({ camada: camadas[ativa], pixels: ctx.getImageData(0, 0, LARG, ALT) });
  if (historico.length > 15) historico.shift();
  refeitos = [];
}

// Balde de tinta: pinta a região contínua de cor parecida a partir do ponto clicado
function baldeDeTinta(px, py, corHex) {
  const imagem = ctx.getImageData(0, 0, LARG, ALT), d = imagem.data;
  const inicio = ((py | 0) * LARG + (px | 0)) * 4;
  const alvo = [d[inicio], d[inicio + 1], d[inicio + 2], d[inicio + 3]];
  const n = parseInt(corHex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (alvo[0] === r && alvo[1] === g && alvo[2] === b && alvo[3] === 255) return;      // já está dessa cor
  const parecido = (i) => Math.abs(d[i] - alvo[0]) + Math.abs(d[i + 1] - alvo[1]) + Math.abs(d[i + 2] - alvo[2]) + Math.abs(d[i + 3] - alvo[3]) < 90;
  const fila = [[px | 0, py | 0]];
  while (fila.length) {
    const [x, y] = fila.pop();
    if (x < 0 || y < 0 || x >= LARG || y >= ALT) continue;
    const i = (y * LARG + x) * 4;
    if (!parecido(i)) continue;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    fila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  ctx.putImageData(imagem, 0, 0);
}

// Prepara o pincel antes de começar a pintar (cor, opacidade, modo da borracha)
function prepararPincel() {
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = ferramenta === 'borracha' ? 'destination-out' : 'source-over';   // borracha = apaga tinta
  ctx.globalAlpha = $('#opacidade').value / 100;
  ctx.strokeStyle = ctx.fillStyle = $('#cor1').value;
}

// Desenha um pedacinho de traço entre os pontos "de" e "ate" (listas, por causa da simetria)
function desenharSegmento(de, ate, tamanho, pressao) {
  const cor = $('#cor1').value, opacidade = $('#opacidade').value / 100;
  de.forEach((a, k) => {
    const b = ate[k];
    if (ferramenta === 'spray') {                            // pontinhos espalhados em volta
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * 6.28, dist = Math.random() * tamanho * 2.2;
        ctx.fillRect(b[0] + Math.cos(ang) * dist, b[1] + Math.sin(ang) * dist, 2, 2);
      }
    } else if (ferramenta === 'aero') {                      // manchas macias e transparentes
      const passo = Math.max(1, tamanho / 4 | 0), n = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / passo | 0);
      for (let i = 1; i <= n; i++) {
        const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, tamanho * 1.2);
        grad.addColorStop(0, corComAlpha(cor, 0.22 * opacidade)); grad.addColorStop(1, corComAlpha(cor, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = grad;
        ctx.fillRect(x - tamanho * 1.2, y - tamanho * 1.2, tamanho * 2.4, tamanho * 2.4);
      }
    } else if (ferramenta === 'caneta') {                    // ponta chata inclinada (caligrafia)
      const d = tamanho * 0.35;
      ctx.beginPath(); ctx.moveTo(a[0] - d, a[1] + d); ctx.lineTo(a[0] + d, a[1] - d);
      ctx.lineTo(b[0] + d, b[1] - d); ctx.lineTo(b[0] - d, b[1] + d); ctx.closePath(); ctx.fill();
    } else {                                                 // pincel, lápis, marcador e borracha: linha com espessura
      const fator = ferramenta === 'lapis' ? 0.35 : ferramenta === 'marcador' ? 1.3 : 1;
      ctx.lineWidth = tamanho * pressao * fator;
      ctx.lineCap = ferramenta === 'marcador' ? 'square' : 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (a === b) { ctx.beginPath(); ctx.arc(a[0], a[1], ctx.lineWidth / 2, 0, 7); ctx.fill(); }   // um clique = um ponto
    }
  });
}

// Formas (linha, retângulo, elipse, gradiente): desenhadas do ponto inicial até o ponto atual
function desenharForma(x, y) {
  const preencher = $('#chk-preencher').checked;
  ctx.beginPath();
  if (ferramenta === 'linha') { ctx.moveTo(inicioX, inicioY); ctx.lineTo(x, y); ctx.stroke(); }
  else if (ferramenta === 'ret') { preencher ? ctx.fillRect(inicioX, inicioY, x - inicioX, y - inicioY) : ctx.strokeRect(inicioX, inicioY, x - inicioX, y - inicioY); }
  else if (ferramenta === 'elipse') {
    ctx.ellipse((inicioX + x) / 2, (inicioY + y) / 2, Math.abs(x - inicioX) / 2, Math.abs(y - inicioY) / 2, 0, 0, 7);
    preencher ? ctx.fill() : ctx.stroke();
  } else if (ferramenta === 'grad') {                        // gradiente da cor 1 para a cor 2, na direção arrastada
    const g = ctx.createLinearGradient(inicioX, inicioY, x, y);
    g.addColorStop(0, $('#cor1').value); g.addColorStop(1, $('#cor2').value);
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARG, ALT);
  }
}

// ---------- Eventos do mouse/caneta/dedo na tela ----------
tela.onpointerdown = (e) => {
  [inicioX, inicioY] = posicaoNaTela(e);

  if (ferramenta === 'gotas') {                              // pega a cor do ponto clicado (já com as camadas misturadas)
    juntarCamadas();
    const px = telaCtx.getImageData(inicioX | 0, inicioY | 0, 1, 1).data;
    $('#cor1').value = '#' + [...px].slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
    return;
  }
  if (ferramenta === 'texto') {
    const texto = prompt('Texto:');
    if (texto) {
      guardarParaDesfazer(); prepararPincel();
      ctx.font = '600 ' + (+$('#tamanho').value * 3 + 16) + 'px Instrument Sans, sans-serif';
      ctx.fillText(texto, inicioX, inicioY); redesenhar();
    }
    return;
  }
  guardarParaDesfazer();
  if (ferramenta === 'balde') { baldeDeTinta(inicioX, inicioY, $('#cor1').value); redesenhar(); return; }

  desenhando = true;
  tela.setPointerCapture(e.pointerId);
  fotoDaCamada = ctx.getImageData(0, 0, LARG, ALT);          // para as formas poderem ser "arrastadas"
  suaveX = inicioX; suaveY = inicioY;
  ultimosPontos = comEspelhos(inicioX, inicioY);
  prepararPincel();
  if (FERRAMENTAS_DE_TRACO.includes(ferramenta)) desenharSegmento(ultimosPontos, ultimosPontos, +$('#tamanho').value, 1);
  redesenhar();
};

tela.onpointermove = (e) => {
  if (!desenhando) return;
  const [x, y] = posicaoNaTela(e);
  const tamanho = +$('#tamanho').value;
  const pressao = e.pointerType === 'pen' ? Math.max(0.2, e.pressure * 1.6) : 1;      // caneta digital: força muda a espessura

  if (FERRAMENTAS_DE_TRACO.includes(ferramenta)) {
    const estab = $('#estab').value / 100;                   // estabilização: o traço "segue" o mouse com atraso, ficando mais liso
    suaveX += (x - suaveX) * (1 - estab); suaveY += (y - suaveY) * (1 - estab);
    const pontos = comEspelhos(suaveX, suaveY);
    desenharSegmento(ultimosPontos, pontos, tamanho, pressao);
    ultimosPontos = pontos;
  } else {                                                   // formas: volta a camada ao início e redesenha
    ctx.putImageData(fotoDaCamada, 0, 0);
    prepararPincel(); ctx.lineWidth = tamanho;
    desenharForma(x, y);
  }
  redesenhar();
};

tela.onpointerup = () => { desenhando = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; };

// ---------- Botões do topo e do painel ----------
function desfazerOuRefazer(deOnde, paraOnde) {
  const passo = deOnde.pop();
  if (!passo || !camadas.includes(passo.camada)) return;
  const c = passo.camada.canvas.getContext('2d');
  paraOnde.push({ camada: passo.camada, pixels: c.getImageData(0, 0, LARG, ALT) });
  c.putImageData(passo.pixels, 0, 0);
  redesenhar();
}
$('#btn-desfazer').onclick = () => desfazerOuRefazer(historico, refeitos);
$('#btn-refazer').onclick = () => desfazerOuRefazer(refeitos, historico);
$('#btn-limpar').onclick = () => {
  guardarParaDesfazer();
  ctx.clearRect(0, 0, LARG, ALT);
  if (ativa === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, LARG, ALT); }          // o "Fundo" volta a ser branco
  redesenhar();
};
$('#btn-trocar').onclick = () => { [$('#cor1').value, $('#cor2').value] = [$('#cor2').value, $('#cor1').value]; };
$('#zoom').oninput = () => $('#est-area').style.setProperty('--z', $('#zoom').value / 100);
$('#chk-grade').onchange = () => { $('#grade').style.display = $('#chk-grade').checked ? 'block' : 'none'; };

// Filtro: copia a camada, apaga, e desenha de volta com o filtro do navegador aplicado
$('#btn-filtro').onclick = () => {
  guardarParaDesfazer();
  const copia = criarCanvas(LARG, ALT);
  copia.getContext('2d').drawImage(camadas[ativa].canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, LARG, ALT);
  ctx.filter = $('#filtro').value; ctx.drawImage(copia, 0, 0); ctx.filter = 'none';
  redesenhar();
};

// Importar uma imagem do computador como uma camada nova (ajustada para caber)
$('#arq-imagem').onchange = (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  const img = new Image();
  img.onload = () => {
    const escala = Math.min(LARG / img.width, ALT / img.height), camada = novaCamada('Imagem');
    camada.canvas.getContext('2d').drawImage(img, (LARG - img.width * escala) / 2, (ALT - img.height * escala) / 2, img.width * escala, img.height * escala);
    camadas.splice(ativa + 1, 0, camada); escolherCamada(ativa + 1); redesenhar();
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(arquivo);
  e.target.value = '';
};

// Atalhos de teclado (só funcionam com o estúdio aberto)
addEventListener('keydown', (e) => {
  if (!$('#estudio').classList.contains('aberto') || ['INPUT', 'SELECT'].includes(e.target.tagName)) return;
  const tecla = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (tecla === 'z' || tecla === 'y')) {
    e.preventDefault();
    (tecla === 'y' || e.shiftKey) ? $('#btn-refazer').click() : $('#btn-desfazer').click();
    return;
  }
  const atalhos = { b: 'pincel', p: 'lapis', a: 'aero', e: 'borracha', g: 'balde', i: 'gotas', l: 'linha', r: 'ret', o: 'elipse', t: 'texto' };
  if (atalhos[tecla] && !e.ctrlKey && !e.metaKey) escolherFerramenta(atalhos[tecla]);
  if (tecla === '[') $('#tamanho').value = +$('#tamanho').value - 4;      // [ e ] mudam o tamanho
  if (tecla === ']') $('#tamanho').value = +$('#tamanho').value + 4;
  if (tecla === 'x') $('#btn-trocar').click();                            // X troca as cores
});

// ---------- Abrir, fechar e salvar na galeria ----------
function abrirEstudio() { $('#estudio').classList.add('aberto'); }
function fecharEstudio() { $('#estudio').classList.remove('aberto'); }
$('#btn-criar').onclick = abrirEstudio;
$('#btn-fechar').onclick = fecharEstudio;

$('#btn-salvar').onclick = () => {
  juntarCamadas();
  // Junta tudo sobre um fundo branco (a borracha deixa partes transparentes) e reduz para 800x600
  const inteira = criarCanvas(LARG, ALT), g = inteira.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, LARG, ALT); g.drawImage(tela, 0, 0);
  const reduzida = criarCanvas(800, 600);
  reduzida.getContext('2d').drawImage(inteira, 0, 0, 800, 600);

  const obra = {
    titulo: $('#obra-titulo').value.trim() || 'Sem título',
    autor: $('#obra-autor').value.trim() || 'Autor anônimo',
    moldura: $('#moldura').value,
    img: reduzida.toDataURL('image/jpeg', 0.72),
    hora: Date.now(),
  };
  if (!adicionar('obras', obra)) { alert('Não foi possível salvar a obra. O armazenamento do navegador pode estar cheio.'); return; }

  fecharEstudio(); recomecar(); $('#obra-titulo').value = '';
  setTimeout(() => {                                         // leva o visitante até a obra nova
    const entrada = ARTES.find((a) => a.obra.id === obra.id);
    if (entrada) irAte(entrada);
  }, 900);
};

recomecar();
