async function onMessage(sock, msg) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  const from = msg.key.remoteJid;

  console.log("📩 Mensagem recebida:", text);

  if (!text) return;

  if (text.toLowerCase() === "ping") {
    await sock.sendMessage(from, { text: "pong 🏓" });
  }
}

module.exports = { onMessage };
