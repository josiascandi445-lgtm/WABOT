# 🤖 WhatsApp Bot — Baileys + Express + Render

Bot de WhatsApp construído com Node.js, Baileys e Express, pronto para deploy no Render.

---

## 📁 Estrutura do Projeto

```
/
├── index.js              # Ponto de entrada
├── package.json
├── .env.example
├── .gitignore
├── lib/
│   └── whatsapp.js       # Lógica de conexão Baileys
├── commands/
│   ├── ping.js
│   ├── menu.js
│   ├── ban.js
│   ├── add.js
│   └── music.js
└── session/              # Gerado automaticamente (não commitar)
```

---

## ⚙️ Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
OWNER_NUMBER=244912345678   # Seu número (sem + ou espaços)
PAIRING_NUMBER=244912345678 # Número para autenticar o bot
PREFIX=.                    # Prefixo dos comandos
PORT=3000                   # Porta (Render define automaticamente)
```

---

## 🚀 Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/whatsapp-bot.git
cd whatsapp-bot

# 2. Instale as dependências
npm install

# 3. Configure o .env
cp .env.example .env
# Edite o .env com seus dados

# 4. Inicie o bot
npm start
```

---

## 📱 Como Conectar via Pairing Code

1. Defina `PAIRING_NUMBER` no `.env` com o número do WhatsApp a vincular
2. Execute `npm start`
3. O terminal exibirá um código de 8 dígitos, ex: `ABCD-EFGH`
4. No WhatsApp do celular:
   - Vá em **Configurações → Dispositivos vinculados**
   - Toque em **Vincular um dispositivo**
   - Toque em **Vincular com número de telefone**
   - Digite o código exibido no terminal
5. Pronto! O bot estará conectado ✅

---

## ☁️ Deploy no Render

### Pré-requisitos
- Conta no [Render](https://render.com)
- Repositório Git (GitHub, GitLab, etc.)

### Passo a passo

**1. Suba o código para o GitHub**
```bash
git init
git add .
git commit -m "feat: WhatsApp bot inicial"
git remote add origin https://github.com/seu-usuario/whatsapp-bot.git
git push -u origin main
```

**2. Crie um novo Web Service no Render**
- Acesse [render.com](https://render.com) → Dashboard → **New +** → **Web Service**
- Conecte seu repositório GitHub
- Configure:
  - **Name:** `whatsapp-bot`
  - **Region:** Frankfurt (EU) ou Oregon (US)
  - **Branch:** `main`
  - **Runtime:** `Node`
  - **Build Command:** `npm install`
  - **Start Command:** `node index.js`
  - **Instance Type:** Free (ou pago para persistência)

**3. Configure as variáveis de ambiente no Render**

Em **Environment → Add Environment Variable**, adicione:
| Chave | Valor |
|-------|-------|
| `OWNER_NUMBER` | seu número |
| `PAIRING_NUMBER` | número para vincular |
| `PREFIX` | `.` |

**4. Deploy**
- Clique em **Create Web Service**
- Aguarde o build finalizar
- Veja os logs para obter o Pairing Code
- Conecte o WhatsApp como descrito acima

### ⚠️ Importante sobre o Render Free

O plano gratuito do Render **hiberna o serviço após 15 minutos sem requisições**.
Para manter ativo, use um serviço de ping como [UptimeRobot](https://uptimerobot.com):
- URL: `https://seu-app.onrender.com/`
- Intervalo: 5 minutos

---

## 📋 Comandos Disponíveis

| Comando | Descrição | Restrição |
|---------|-----------|-----------|
| `.ping` | Testa o bot e mostra latência | — |
| `.menu` | Mostra todos os comandos | — |
| `.ban @user` | Remove participante do grupo | Admin |
| `.add número` | Adiciona participante ao grupo | Admin |
| `.music nome` | Pesquisa música no YouTube | — |

---

## 🛠️ Dependências

```json
{
  "@whiskeysockets/baileys": "^6.7.9",
  "axios": "^1.7.2",
  "dotenv": "^16.4.5",
  "express": "^4.19.2",
  "pino": "^9.3.1",
  "pino-pretty": "^11.2.1",
  "qrcode-terminal": "^0.12.0"
}
```

---

## 📝 Licença

MIT — use livremente.
