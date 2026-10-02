/* ==========================================================================
   DADOS.JS — o que o site guarda e funções pequenas usadas em todo lugar.
   Tudo fica salvo no navegador DESTE computador (localStorage), então
   a apresentação precisa rodar sempre no mesmo computador/navegador.
   ========================================================================== */

// Atalho: $('#id') devolve o elemento da página com aquele id.
const $ = (seletor) => document.querySelector(seletor);

// ---------- Tema da semana (troca sozinho a cada 7 dias) ----------
const TEMAS = ['Minha escola em cores', 'Um lugar que me faz bem', 'Futuro', 'Máquinas e pessoas', 'Silêncio',
               'Meu bairro', 'Sonho', 'Autorretrato sem rosto', 'Movimento', 'Noite'];
const UMA_SEMANA_MS = 7 * 24 * 3600 * 1000;
const TEMA = TEMAS[Math.floor(Date.now() / UMA_SEMANA_MS) % TEMAS.length];

// ---------- O que fica salvo ----------
//  obras: { id, titulo, autor, moldura, img (foto da obra), hora }
//  likes: uma linha por clique em "Curtir" { id, obra (id da obra) }
//  coms : comentários { id, obra, nome, texto, hora }
const CHAVE_STORAGE = 'etec-galeria-v3';
const dados = { obras: [], likes: [], coms: [] };

try { Object.assign(dados, JSON.parse(localStorage.getItem(CHAVE_STORAGE) || '{}')); } catch (e) {}

// Versões antigas do site gravaram lixo (uma propriedade "g") dentro das obras. Limpa isso.
// Também converte os nomes antigos (title/author/style/ts) para os novos.
dados.obras = dados.obras.map((o) => ({
  id: o.id, img: o.img,
  titulo: o.titulo || o.title || 'Sem título',
  autor: o.autor || o.author || 'Autor anônimo',
  moldura: o.moldura || o.style || 'oak',
  hora: o.hora || o.ts || 0,
}));

function salvarDados() {
  try { localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados)); return true; }
  catch (e) { return false; }   // acontece quando o armazenamento do navegador enche
}

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Adiciona um item numa das listas ('obras', 'likes' ou 'coms') e salva.
// Devolve false se não deu para salvar.
function adicionar(lista, item) {
  item.id = item.id || novoId();
  dados[lista].push(item);
  if (!salvarDados()) { dados[lista].pop(); return false; }
  atualizarGaleria();
  return true;
}

function remover(lista, id) {
  dados[lista] = dados[lista].filter((i) => i.id !== id);
  salvarDados();
  atualizarGaleria();
}

// Quantas curtidas uma obra tem.
const curtidasDe = (obra) => dados.likes.filter((l) => l.obra === obra.id).length;

// Lista de obras da mais curtida para a menos curtida (empate: a mais antiga ganha).
function obrasMaisCurtidas() {
  return [...dados.obras]
    .map((obra) => ({ obra, curtidas: curtidasDe(obra) }))
    .sort((a, b) => b.curtidas - a.curtidas || a.obra.hora - b.obra.hora);
}

// ---------- Funções de desenho usadas pelo 3D ----------
function criarCanvas(largura, altura) {
  const c = document.createElement('canvas');
  c.width = largura; c.height = altura;
  return c;
}

// Transforma um canvas 2D numa textura que o Three.js consegue colar num objeto 3D.
function paraTextura(canvas, repeticoes) {
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = 8;
  t.encoding = THREE.sRGBEncoding;
  if (repeticoes) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeticoes[0], repeticoes[1]); }
  return t;
}

// Aviso rápido na parte de baixo da tela (some sozinho).
function avisar(texto) {
  const el = $('#aviso');
  el.textContent = texto;
  el.classList.add('mostra');
  clearTimeout(avisar.timer);
  avisar.timer = setTimeout(() => el.classList.remove('mostra'), 2800);
}
