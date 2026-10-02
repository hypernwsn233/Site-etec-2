/* ==========================================================================
   INICIO.JS — liga tudo e dá a partida. É o último arquivo a carregar.
   ========================================================================== */

// Botão "Entrar": some a tela de entrada e libera a navegação
$('#btn-entrar').onclick = () => {
  entrou = true;
  document.body.classList.add('dentro');
};

// Tema da semana aparece no painel do estúdio
$('#tema-semana').textContent = 'Tema da semana: ' + TEMA;

// Ajusta o tamanho do 3D à janela
redimensionar();

// Monta as molduras com as obras salvas e começa a desenhar
atualizarGaleria();
requestAnimationFrame(quadro);
