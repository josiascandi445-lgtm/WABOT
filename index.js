/**
 * index.js
 * Ponto de entrada do WhatsApp Bot.
 * - Inicia servidor Express (Render)
 * - Conecta ao WhatsApp via Baileys
 * - Carrega comandos
 */

require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const { startWhatsApp } = require("./lib/whatsapp");

// ─── Configurações ─────────────────────────────────────────────
const PORT = process.env.PORT;

if (!PORT) {
  console.log("❌ PORT não definida pelo Render");
  process.exit(1);
}

const PREFIX = process.env.PREFIX || ".";
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";

// ─── Servidor Express ──────────────────────────────────────────
const app = express();

app.get("/", (req, res) => {
  res.send("🤖 Bot Online");
});

app.get("/status", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// IMPORTANTE: Render precisa bind em 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
});

// ─── Carregamento de Comandos ──────────────────────────────────
const commands = new Map();
const commandsDir = path.join(__dirname, "commands");

if (!fs.existsSync(commandsDir)) {
  console.log("❌ Pasta /commands não encontrada");
  process.exit(1);
}

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

// ─── Handler de Mensagens ──────────────────────────────────────
async function onMessage(sock, msg) {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!body.startsWith(PREFIX)) return;

  const [rawCommand, ...args] = body
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const commandName = rawCommand.toLowerCase();

  if (!commands.has(commandName)) return;

  const command = commands.get(commandName);

  const sender = msg.key.participant || msg.key.remoteJid;

  const context = {
    prefix: PREFIX,
    ownerNumber: OWNER_NUMBER,
    ownerJid: OWNER_NUMBER ? `${OWNER_NUMBER}@s.whatsapp.net` : null,
    isOwner: OWNER_NUMBER && sender?.startsWith(OWNER_NUMBER),
  };

  console.log(
    `📨 Comando: ${PREFIX}${commandName} | De: ${sender}`
  );

  try {
    await command.execute(sock, msg, args, context);
  } catch (err) {
    console.error("❌ Erro ao executar comando:", err);
  }
}

// ─── Inicialização do Bot ──────────────────────────────────────
(async () => {
  console.log("🚀 Iniciando WhatsApp Bot...\n");

  try {
    await startWhatsApp(onMessage);
  } catch (err) {
    console.error("❌ Erro no WhatsApp:", err);
  }
})();
