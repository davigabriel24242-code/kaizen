# Portal Kaizen

Sistema de gestão de melhorias contínuas (Kaizen) com Firebase e React.

## 🚀 Deploy no GitHub Pages

### Pré-requisitos

1. Conta no GitHub
2. Projeto Firebase configurado
3. (Opcional) Chave de API do Gemini

### Passo a passo

#### 1. Criar o repositório no GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/kaizen.git
git push -u origin main
```

#### 2. Configurar o nome do repositório no Vite

No arquivo `vite.config.ts`, a linha `base: '/kaizen/'` deve corresponder ao nome do seu repositório. Se o repo se chama `meu-kaizen`, mude para `base: '/meu-kaizen/'`.

#### 3. Configurar o Secret do Gemini (se usar IA)

No GitHub: **Settings → Secrets and variables → Actions → New repository secret**
- Nome: `GEMINI_API_KEY`
- Valor: sua chave da API do Gemini

#### 4. Ativar o GitHub Pages

No GitHub: **Settings → Pages**
- Source: **GitHub Actions**

#### 5. Configurar o Firebase

No [Firebase Console](https://console.firebase.google.com), adicione o domínio do GitHub Pages aos domínios autorizados:
- **Authentication → Settings → Authorized domains**
- Adicionar: `SEU_USUARIO.github.io`

Após o primeiro push, o deploy roda automaticamente e o app estará em:
`https://SEU_USUARIO.github.io/kaizen/`

## 💻 Rodar localmente

```bash
npm install
cp .env.example .env.local
# Edite .env.local com sua GEMINI_API_KEY
npm run dev
```

## 🛠 Tecnologias

- React 19 + TypeScript
- Vite 6
- Firebase (Auth + Firestore)
- Tailwind CSS v4
- React Router v7
