/**
 * lib/whatsapp.js
 * Núcleo da conexão WhatsApp com Baileys.
 * Gerencia autenticação via Pairing Code, reconexão automática
 * e roteamento de mensagens para os comandos.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidGroup,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const path = require("path");
const fs = require("fs");

// Diretório onde a sessão é salva
const SESSION_DIR = path.join(process.cwd(), "session");

// Garante que a pasta session existe
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Logger silencioso para o Baileys (evita flood no terminal)
const logger = pino({ level: "silent" });

/**
 * Inicia a conexão com o WhatsApp.
 * @param {Function} onMessage - Callback chamado a cada mensagem recebida.
 * @returns {Promise<object>} Instância do socket Baileys.
 */
async function startWhatsApp(onMessage) {
  // Carrega (ou cria) o estado de autenticação multi-arquivo
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  // Busca a versão mais recente do Baileys compatível com o WA Web
  const { version } = await fetchLatestBaileysVersion();
  console.log(`📦 Usando Baileys versão WA: ${version.join(".")}`);

  // Cria o socket de conexão
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false, // Desabilita QR — usamos Pairing Code
    browser: ["WhatsApp Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  // ─── Autenticação via Pairing Code ─────────────────────────────────────────
  // Só solicita o código se ainda não estiver autenticado
  if (!state.creds.registered) {
    const pairingNumber = process.env.PAIRING_NUMBER;

    if (!pairingNumber) {
      console.error(
        "❌ Variável PAIRING_NUMBER não definida no .env!\n" +
          "   Defina o número no formato internacional (ex: 244912345678)."
      );
      process.exit(1);
    }

    // Aguarda o socket estar pronto antes de solicitar o código
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      console.log("📱 Pairing Number:", pairingNumber);
      const code = await sock.requestPairingCode(pairingNumber.trim());
      // Formata o código em grupos de 4 para facilitar leitura
      const formatted = code.match(/.{1,4}/g)?.join("-") ?? code;
      console.log("\n╔══════════════════════════════════════╗");
      console.log("║        CÓDIGO DE EMPARELHAMENTO       ║");
      console.log(`║            ${formatted.padEnd(24)}║`);
      console.log("╚══════════════════════════════════════╝");
      console.log(
        "👉 Abra o WhatsApp > Dispositivos vinculados > Vincular com número\n"
      );
    } catch (err) {
      console.error("❌ Erro ao solicitar Pairing Code:", err.message);
    }
  }

  // ─── Eventos do Socket ──────────────────────────────────────────────────────

  // Salva credenciais sempre que forem atualizadas
  sock.ev.on("creds.update", saveCreds);

  // Monitora o estado da conexão
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect =
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
