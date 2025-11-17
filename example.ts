import { open } from './src/index';

async function main() {
  try {
    console.log('🚀 Iniciando FluxDesktop Demo...');

    const window = await open('https://www.example.com', {
      windowSize: [1200, 800],
      onLoad: () => {
        console.log('📱 Página carregada!');
        // Modifica a página automaticamente
        document.body.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        document.body.style.color = 'white';

        // Adiciona um título personalizado
        const title = document.createElement('h1');
        title.textContent = '🎉 Powered by FluxDesktop + TypeScript + Bun!';
        title.style.textAlign = 'center';
        title.style.marginTop = '50px';
        document.body.appendChild(title);

        // Adiciona informações sobre o runtime
        const info = document.createElement('div');
        info.innerHTML = `
          <p>Runtime: Bun ${Bun?.version || 'N/A'}</p>
          <p>FluxDesktop: ${process.versions.fluxdesktop}</p>
          <p>Framework: FluxStack</p>
          <p>Browser: ${window.navigator.userAgent}</p>
        `;
        info.style.textAlign = 'center';
        info.style.marginTop = '20px';
        document.body.appendChild(info);
      }
    });

    console.log('✅ Janela aberta com sucesso!');

    // Exemplo de IPC bidirecional
    window.ipc.on('greet', (name) => {
      console.log(`👋 Recebido pedido de cumprimento para: ${name}`);
      return `Olá ${name}! Mensagem do FluxStack via Bun! 🚀`;
    });

    // Exemplo de interações automatizadas
    setTimeout(async () => {
      try {
        // Obter título da página
        const title = await window.window.eval('document.title');
        console.log('📄 Título da página:', title);

        // Injetar um botão interativo
        await window.window.eval(`
          const button = document.createElement('button');
          button.textContent = '🔗 Testar IPC';
          button.style.cssText = 'padding: 10px 20px; margin: 20px; font-size: 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;';
          button.onclick = async () => {
            try {
              const response = await FluxDesktop.ipc.send('greet', 'Usuário do FluxDesktop');
              alert('Resposta do FluxStack: ' + response);
            } catch (error) {
              alert('Erro: ' + error.message);
            }
          };
          document.body.appendChild(button);
        `);

        console.log('🎮 Botão interativo adicionado!');

      } catch (error) {
        console.error('❌ Erro na interação:', error);
      }
    }, 2000);

    // CDP is validated automatically in core - no need for manual testing here

  } catch (error) {
    console.error('❌ Erro ao iniciar FluxDesktop:', error);
  }
}

main();