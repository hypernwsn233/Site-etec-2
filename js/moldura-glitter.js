/* Moldura rosa com glitter para as obras do Paint Mode. */
(() => {
  const seletor = document.querySelector('#moldura');
  const botaoSalvar = document.querySelector('#btn-salvar');
  const tela = document.querySelector('#tela');
  if (!seletor || !botaoSalvar || !tela) return;

  const opcao = document.createElement('option');
  opcao.value = 'pink-glitter';
  opcao.textContent = 'Rosa com glitter ✨';
  seletor.append(opcao);

  // Captura o clique antes do salvamento normal para incorporar a moldura
  // à imagem exportada. O estúdio é reiniciado pelo fluxo de salvamento atual.
  botaoSalvar.addEventListener('click', () => {
    if (seletor.value !== 'pink-glitter') return;
    const ctx = tela.getContext('2d');
    const w = tela.width, h = tela.height;
    const faixa = Math.round(Math.min(w, h) * 0.055);
    ctx.save();

    // Base rosa perolada e filetes brilhantes.
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffb8e5');
    grad.addColorStop(.28, '#ff4fb6');
    grad.addColorStop(.55, '#ffe0f4');
    grad.addColorStop(.78, '#f05ab8');
    grad.addColorStop(1, '#ffb8e5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, faixa);
    ctx.fillRect(0, h - faixa, w, faixa);
    ctx.fillRect(0, faixa, faixa, h - faixa);
    ctx.fillRect(w - faixa, faixa, faixa, h - faixa);

    ctx.strokeStyle = '#fff4fc';
    ctx.lineWidth = Math.max(3, faixa * .09);
    ctx.strokeRect(faixa * .18, faixa * .18, w - faixa * .36, h - faixa * .36);
    ctx.strokeStyle = '#c92788';
    ctx.lineWidth = Math.max(2, faixa * .045);
    ctx.strokeRect(faixa * .42, faixa * .42, w - faixa * .84, h - faixa * .84);

    // Glitter determinístico: pequenas estrelas e pontos para não piscar a cada clique.
    let seed = 92831;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pontos = Math.round((w + h) * .42);
    for (let i = 0; i < pontos; i++) {
      const lado = i % 4;
      let x, y;
      if (lado === 0) { x = rand() * w; y = rand() * faixa; }
      else if (lado === 1) { x = rand() * w; y = h - rand() * faixa; }
      else if (lado === 2) { x = rand() * faixa; y = rand() * h; }
      else { x = w - rand() * faixa; y = rand() * h; }
      const r = rand() < .12 ? 3.5 : 1 + rand() * 1.8;
      ctx.fillStyle = rand() < .55 ? '#fffaff' : (rand() < .5 ? '#ffd45e' : '#ffecfa');
      ctx.beginPath();
      if (r > 3) {
        ctx.moveTo(x, y-r*1.8); ctx.lineTo(x+r*.45, y-r*.45);
        ctx.lineTo(x+r*1.8, y); ctx.lineTo(x+r*.45, y+r*.45);
        ctx.lineTo(x, y+r*1.8); ctx.lineTo(x-r*.45, y+r*.45);
        ctx.lineTo(x-r*1.8, y); ctx.lineTo(x-r*.45, y-r*.45); ctx.closePath();
      } else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, { capture: true });
})();