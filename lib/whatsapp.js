/**
 * lib/whatsapp.js
 * Núcleo do WhatsApp Bot com Baileys (versão mais robusta)
 */
const { onMessage } = require("../handlers/onMessage");

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

// garante pasta de sessão
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const logger = pino({ level: "silent" });

let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

function sanitizeNumber(input) {
  return String(input || "")
    .replace(/\D/g, "") // remove tudo que não é número
    .trim();
}

async function startWhatsApp(onMessage) {
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
    printQRInTerminal: true,
    browser: ["WhatsApp Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // ─── PAIRING CODE ─────────────────────────────
  if (!state.creds.registered) {
    const pairingNumber = sanitizeNumber(process.env.PAIRING_NUMBER);

    if (!pairingNumber || pairingNumber.length < 10) {
      console.error("❌ PAIRING_NUMBER inválido ou não definido:", pairingNumber);
      process.exit(1);
    }

    console.log("⏳ A preparar ligação...");
    console.log("📱 Número limpo:", pairingNumber);

    try {
      // pequena pausa para evitar race condition do Baileys
      await new Promise((r) => setTimeout(r, 8000));

      console.log("⏳ A gerar pairing code...");

      const code = await sock.requestPairingCode(pairingNumber);

      const formatted = code.match(/.{1,4}/g)?.join("-") ?? code;

      console.log("\n╔══════════════════════╗");
      console.log("║   PAIRING CODE       ║");
      console.log(`║ ${formatted.padEnd(18)}║`);
      console.log("╚══════════════════════╝");
    } catch (err) {
      console.error("❌ Erro ao gerar pairing code:", err?.message || err);
    }
  }

  // ─── CONEXÃO ────────────────────────────────
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      reconnectAttempts = 0;
      console.log(`✅ Conectado: ${sock.user?.id}`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`🔌 Conexão fechada (code: ${statusCode})`);

      if (isLoggedOut) {
        console.log("❌ Sessão inválida detectada. Vai tudo abaixo.");
        process.exit(1);
      }

      reconnectAttempts++;

      if (reconnectAttempts > MAX_RECONNECT) {
        console.log("❌ Muitas tentativas de reconnect. Encerrando processo.");
        process.exit(1);
      }

      console.log(
        `🔄 Reconectando... (${reconnectAttempts}/${MAX_RECONNECT})`
      );

      setTimeout(() => {
        startWhatsApp(onMessage);
      }, 5000);
    }
  });

  // ─── MENSAGENS ────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;

      try {
        await onMessage(sock, msg);
      } catch (err) {
        console.error("❌ Erro ao processar mensagem:", err);
      }
    }
  });

  return sock;
}

module.exports = { startWhatsApp };
