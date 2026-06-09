/**
 * lib/whatsapp.js
 * Núcleo da conexão WhatsApp com Baileys (estável para Render)
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const path = require("path");
const fs = require("fs");

const SESSION_DIR = path.join(process.cwd(), "session");

// Garante que a pasta session existe
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const logger = pino({ level: "silent" });

async function startWhatsApp(onMessage) {
  // Auth state (sessão persistente em ficheiros)
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  const { version } = await fetchLatestBaileysVersion();
  console.log(`📦 Baileys versão: ${version.join(".")}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    browser: ["WhatsApp Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  // 🔐 salvar credenciais (OBRIGATÓRIO)
  sock.ev.on("creds.update", saveCreds);

  // 📱 Pairing Code
  if (!state.creds.registered) {
    const pairingNumber = process.env.PAIRING_NUMBER;

    if (!pairingNumber) {
      console.error("❌ PAIRING_NUMBER não definido no .env");
      process.exit(1);
    }

    console.log("⏳ Gerando pairing code...");

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(pairingNumber.trim());

        const formatted = code.match(/.{1,4}/g)?.join("-") ?? code;

        console.log("\n╔════════════════════════════╗");
        console.log("║   PAIRING CODE WHATSAPP   ║");
        console.log(`║     ${formatted.padEnd(20)}║`);
        console.log("╚════════════════════════════╝");
      } catch (err) {
        console.error("❌ Erro pairing code:", err.message);
      }
    }, 5000);
  }

  // 🔁 conexão
sock.ev.on("connection.update", (update) => {
  console.log(
    "📡 connection.update:",
    JSON.stringify(update, null, 2)
  );

  const { connection, lastDisconnect } = update;

  if (connection === "open") {
    console.log(`✅ Conectado: ${sock.user?.id}`);
  }

  if (connection === "close") {
    const statusCode =
      lastDisconnect?.error?.output?.statusCode;

    const isLoggedOut =
      statusCode === DisconnectReason.loggedOut;

    console.log(`🔌 Conexão fechada (código: ${statusCode})`);

    console.error(
      "❌ lastDisconnect:",
      lastDisconnect?.error
    );

    if (isLoggedOut) {
      console.log("❌ Sessão inválida. Resetando...");

      fs.rmSync(SESSION_DIR, {
        recursive: true,
        force: true,
      });

      fs.mkdirSync(SESSION_DIR, {
        recursive: true,
      });

      process.exit(1);
    } else {
      console.log("🔄 Reconectando...");

      setTimeout(() => {
        startWhatsApp(onMessage);
      }, 5000);
    }
  }
});

  // 📩 mensagens
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;

      try {
        await onMessage(sock, msg);
      } catch (err) {
        console.error("❌ Erro mensagem:", err);
      }
    }
  });

  return sock;
}

module.exports = { startWhatsApp };
