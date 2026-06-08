/**
 * index.js
 * Ponto de entrada do WhatsApp Bot.
 * - Inicia o servidor Express (keep-alive para o Render)
 * - Conecta ao WhatsApp via Baileys com Pairing Code
 * - Carrega e executa os comandos da pasta /commands
 */

require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { startWhatsApp } = require("./lib/whatsapp");

// ─── Configurações ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const PREFIX = process.env.PREFIX || ".";
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";

// ─── Servidor Express ──────────────────────────────────────────────────────────
const app = express();

// Rota principal — usada pelo Render para verificar se o serviço está ativo
app.get("/", (req, res) => {
  res.send("🤖 Bot Online");
});

// Rota de status com informações básicas
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
});

// ─── Carregamento de Comandos ──────────────────────────────────────────────────
const commands = new Map();
const commandsDir = path.join(__dirname, "commands");

// Lê todos os arquivos .js da pasta commands e os registra no Map
fs.readdirSync(commandsDir)
  .filter((file) => file.endsWith(".js"))
  .forEach((file) => {
    const command = require(path.join(commandsDir, file));
    commands.set(command.name.toLowerCase(), command);
    console.log(`✅ Comando carregado: ${PREFIX}${command.name}`);
  });

console.log(`\n📌 Total de comandos: ${commands.size}`);
console.log(`📌 Prefixo: "${PREFIX}"`);
console.log(`📌 Owner: ${OWNER_NUMBER || "(não definido)"}\n`);

// ─── Handler de Mensagens ──────────────────────────────────────────────────────
/**
 * Chamado pelo lib/whatsapp.js para cada mensagem recebida.
 * @param {object} sock - Socket Baileys
 * @param {object} msg  - Objeto de mensagem
 */
async function onMessage(sock, msg) {
  // Extrai o texto da mensagem (suporta texto simples e estendido)
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  // Ignora mensagens que não começam com o prefixo
  if (!body.startsWith(PREFIX)) return;

  // Separa o nome do comando dos argumentos
  const [rawCommand, ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = rawCommand.toLowerCase();

  // Verifica se o comando existe
  if (!commands.has(commandName)) return;

  const command = commands.get(commandName);

  // Contexto extra passado para os comandos
  const context = {
    prefix: PREFIX,
    ownerNumber: OWNER_NUMBER,
    // JID do owner formatado para comparação
    ownerJid: OWNER_NUMBER ? `${OWNER_NUMBER}@s.whatsapp.net` : null,
    isOwner:
      OWNER_NUMBER &&
      (msg.key.participant ?? msg.key.remoteJid)?.includes(OWNER_NUMBER),
  };

  console.log(
    `📨 Comando: ${PREFIX}${commandName} | De: ${msg.key.participant ?? msg.key.remoteJid}`
  );

  // Executa o comando
  await command.execute(sock, msg, args, context);
}

// ─── Inicialização do Bot ──────────────────────────────────────────────────────
(async () => {
  console.log("🚀 Iniciando WhatsApp Bot...\n");
  await startWhatsApp(onMessage);
})();
