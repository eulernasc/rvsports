# RV SPORTS — Site de votação e placar

Site estático compatível com GitHub Pages, com visual preto, branco e rosa baseado na identidade da RV SPORTS.

## O que já vem pronto

- Placar em destaque com atualização pelo painel administrativo.
- Situação do jogo: pré-jogo, ao vivo, intervalo, encerrado ou adiado.
- Votações ilimitadas e resultados em porcentagem.
- Cadastro, edição, publicação, ocultação, exclusão e zeragem das votações.
- Login administrativo.
- Layout responsivo para celular e computador.
- Modo demonstração sem banco de dados.
- Integração preparada para Firebase Realtime Database + Authentication.

## Testar agora, sem configurar nada

Abra o projeto por um servidor local. Exemplo com VS Code: extensão **Live Server**.

No modo demonstração, o painel usa:

- E-mail: `admin@rvsports.com`
- Senha: `123456`

Os dados ficam somente no navegador usado no teste. Para que todos vejam o mesmo placar e as mesmas votações, configure o Firebase.

## Configurar o Firebase

1. Crie um projeto no Firebase e registre um aplicativo Web.
2. Crie um **Realtime Database**.
3. Em **Authentication**, ative o login por e-mail e senha e crie o usuário administrador.
4. Abra `js/config.js` e substitua todos os campos `COLE_AQUI` pela configuração do seu aplicativo Web.
5. Abra `database.rules.json`, troque `TROQUE_PELO_SEU_EMAIL_ADMIN` pelo mesmo e-mail criado no Authentication.
6. Cole o conteúdo de `database.rules.json` nas regras do Realtime Database e publique.
7. Entre em `admin.html`, cadastre o jogo e as votações reais.

## Publicar no GitHub Pages

1. Crie um repositório e envie todos os arquivos mantendo as pastas.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch principal e a pasta raiz `/`.
5. Salve e aguarde a publicação.

## Observação importante

O projeto foi feito propositalmente para permitir votos ilimitados. Isso significa que uma pessoa pode clicar várias vezes e também automatizar votos. É adequado para brincadeira e resenha; não deve ser tratado como uma votação oficial ou auditável.
