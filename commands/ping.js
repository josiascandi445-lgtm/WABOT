/**
 * commands/ping.js
 * Comando simples de teste: responde "pong" com latência.
 */

module.exports = {
  name: "ping",
  description: "Verifica se o bot está online",
  usage: ".ping",

  /**
   * @param {object} sock   - Socket do Baileys
   * @param {object} msg    - Objeto da mensagem
   * @param {string[]} args - Argumentos do comando (não usados aqui)
   */
  async execute(sock, msg, args) {
    const inicio = Date.now();
    const jid = msg.key.remoteJid;

    // Envia a resposta e calcula a latência
    await sock.sendMessage(jid, { text: "🏓 Pong!" }, { quoted: msg });

    const latencia = Date.now() - inicio;
    await sock.sendMessage(
      jid,
      { text: `⚡ Latência: *${latencia}ms*` },
      { quoted: msg }
    );
  },
};
