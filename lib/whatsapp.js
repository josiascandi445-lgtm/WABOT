/**
 * lib/whatsapp.js
 * Núcleo da conexão WhatsApp com Baileys.
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

// Garante pasta session SEM destruir dados existentes
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const logger = pino({ level: "silent" });

async function startWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`📦 Baileys WA version: ${version.join(".")}`);

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

  // 🔐 SALVAR SESSÃO (CRÍTICO)
  sock.ev.on("creds.update", saveCreds);

  // 📱 Pairing Code (só se não estiver registrado)
  if (!state.creds.registered) {
    const pairingNumber = process.env.PAIRING_NUMBER;

    if (!pairingNumber) {
      console.error("❌ PAIRING_NUMBER não definido no .env");
      process.exit(1);
    }

    console.log("⏳ Aguardando socket estabilizar...");

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(pairingNumber.trim());

        const formatted = code.match(/.{1,4}/g)?.join("-") ?? code;

        console.log("\n╔══════════════════════════╗");
        console.log("║   PAIRING CODE WHATSAPP  ║");
        console.log(`║     ${formatted.padEnd(18)}║`);
        console.log("╚══════════════════════════╝");
      } catch (err) {
        console.error("❌ Erro pairing code:", err.message);
      }
    }, 5000);
  }

  // 🔁 CONEXÃO
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`✅ Conectado como: ${sock.user?.id}`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`🔌 Conexão fechada. Código: ${statusCode}`);

      if (isLoggedOut) {
        console.log("❌ Sessão inválida. Limpando dados...");
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        process.exit(1);
      } else {
        console.log("🔄 Reconectando bot...");

        setTimeout(() => {
          startWhatsApp(onMessage);
        }, 4000);
      }
    }
  });

  // 📩 MENSAGENS
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

module.exports = { startWhatsApp };      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      console.log(
        `🔌 Conexão encerrada (código ${statusCode}). ` +
          (shouldReconnect ? "Reconectando..." : "Sessão encerrada.")
      );

      if (shouldReconnect) {
        // Reconexão com backoff simples de 5 segundos
        setTimeout(() => startWhatsApp(onMessage), 5000);
      } else {
        // Sessão inválida — limpa a pasta session para forçar novo login
        console.log("🗑️  Limpando sessão inválida...");
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        process.exit(0);
      }
    }

    if (connection === "open") {
      console.log(
        `✅ Bot conectado como: ${sock.user?.name ?? "Desconhecido"} (${sock.user?.id})`
      );
    }
  });

  // Processa mensagens recebidas
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // Ignora notificações e atualizações que não sejam mensagens novas
    if (type !== "notify") return;

    for (const msg of messages) {
      // Ignora mensagens próprias e de status
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
