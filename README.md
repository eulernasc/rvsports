# RV SPORTS — placares finais e votações

Site estático preparado para GitHub Pages e integração com Firebase Realtime Database + Authentication.

## O que esta versão faz

- Mostra vários placares finais, inclusive vários jogos no mesmo dia.
- Permite cadastrar, editar e excluir cada resultado pelo painel administrativo.
- Permite adicionar escudo para os dois times; sem imagem, aparecem as iniciais.
- Exibe as votações como cartões com o tema/pergunta da votação.
- Ao clicar em uma votação, abre um modal com as opções.
- O visitante escolhe somente uma opção por envio.
- Depois de votar em uma enquete, precisa recarregar a página para votar nela novamente.
- Permite criar, editar, ocultar, publicar, zerar e excluir votações.
- Funciona em modo demonstração antes da configuração do Firebase.

## Teste em modo demonstração

Painel: `admin.html`

- E-mail: `admin@rvsports.com`
- Senha: `123456`

No modo demonstração, os dados ficam apenas no navegador.

## Publicar no GitHub Pages

1. Envie as pastas `assets`, `css` e `js` para a raiz do repositório.
2. Envie também `index.html`, `admin.html`, `database.rules.json`, `README.md` e `.gitignore`.
3. No GitHub, abra **Settings → Pages**.
4. Use **Deploy from a branch**, branch `main` e pasta `/(root)`.

## Configurar o Firebase depois

1. Crie um projeto e registre um aplicativo Web.
2. Crie o Realtime Database.
3. Ative Authentication por e-mail e senha.
4. Crie o usuário administrador.
5. Cole a configuração do aplicativo em `js/config.js`.
6. Troque `TROQUE_PELO_SEU_EMAIL_ADMIN` em `database.rules.json` pelo e-mail do administrador.
7. Publique essas regras no Realtime Database.

## Estrutura usada no banco

- `games`: coleção com todos os placares finais.
- `polls`: coleção com as votações e contadores de votos.
