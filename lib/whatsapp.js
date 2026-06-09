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

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const logger = pino({ level: "silent" });

let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

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
    const pairingNumber = process.env.PAIRING_NUMBER;

    if (!pairingNumber) {
      console.error("❌ PAIRING_NUMBER não definido");
      process.exit(1);
    }

    console.log("⏳ A gerar pairing code...");

    try {
      console.log("PAIRING_NUMBER:", process.env.PAIRING_NUMBER);
      const code = await sock.requestPairingCode(pairingNumber.trim());

      const formatted = code.match(/.{1,4}/g)?.join("-") ?? code;

      console.log("\n╔══════════════════════╗");
      console.log("║   PAIRING CODE       ║");
      console.log(`║ ${formatted}`);
      console.log("╚══════════════════════╝");
    } catch (err) {
      console.error("❌ Erro pairing code:", err?.message || err);
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
        console.log("❌ Sessão inválida detectada.");

        // ⚠️ NÃO entra em loop de delete + restart
        process.exit(1);
      }

      reconnectAttempts++;

      if (reconnectAttempts > MAX_RECONNECT) {
        console.log("❌ Muitas tentativas de reconnect. Encerrando.");
        process.exit(1);
      }

      console.log(`🔄 Reconectando... (${reconnectAttempts}/${MAX_RECONNECT})`);

      setTimeout(() => {
        startWhatsApp(onMessage);
      }, 5000);
    }
  });

  // ─── MENSAGENS ──────────────────────────────
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
