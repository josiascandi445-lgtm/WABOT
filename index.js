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
const { onMessage } = require("./handlers/onMessage");

// ─── Tratamento Global de Erros ─────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

// ─── Configurações ──────────────────────────────────────────────
const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT não definida pelo Render");
  process.exit(1);
}

const PREFIX = process.env.PREFIX || ".";
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";

// ─── Servidor Express ───────────────────────────────────────────
const app = express();

app.get("/", (req, res) => {
  res.send("🤖 Bot Online");
});

app.get("/status", (req, res) => {
  res.json({
    status: "online",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    commands: commands.size,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
});

// ─── Carregamento de Comandos ───────────────────────────────────
const commands = new Map();
const commandsDir = path.join(__dirname, "commands");

if (!fs.existsSync(commandsDir)) {
  console.error("❌ Pasta /commands não encontrada");
  process.exit(1);
}

fs.readdirSync(commandsDir)
  .filter((file) => file.endsWith(".js"))
  .forEach((file) => {
    try {
      const command = require(path.join(commandsDir, file));

      if (!command?.name || typeof command.execute !== "function") {
        console.warn(`⚠️ Comando inválido ignorado: ${file}`);
        return;
      }

      commands.set(command.name.toLowerCase(), command);
      console.log(`✅ Comando carregado: ${PREFIX}${command.name}`);
    } catch (err) {
      console.error(`❌ Erro ao carregar ${file}:`, err);
    }
  });

console.log(`\n📌 Total de comandos: ${commands.size}`);
console.log(`📌 Prefixo: "${PREFIX}"`);
console.log(`📌 Owner: ${OWNER_NUMBER || "(não definido)"}\n`);

// ─── Inicialização do WhatsApp ─────────────────────────────────
async function bootWhatsApp() {
  try {
    console.log("🚀 Iniciando WhatsApp Bot...\n");

    // ✅ FIX: agora usa o handler correto importado
    await startWhatsApp(onMessage);

  } catch (err) {
    console.error("❌ Falha ao iniciar WhatsApp:", err);

    console.log("🔄 Nova tentativa em 5 segundos...");

    setTimeout(bootWhatsApp, 5000);
  }
}

bootWhatsApp();
