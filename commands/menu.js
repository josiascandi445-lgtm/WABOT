/**
 * commands/menu.js
 * Mostra o menu com todos os comandos disponíveis.
 */

module.exports = {
  name: "menu",
  description: "Exibe todos os comandos disponíveis",
  usage: ".menu",

  async execute(sock, msg, args, { prefix, ownerNumber }) {
    const jid = msg.key.remoteJid;
    const botName = "WhatsApp Bot";
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "Africa/Luanda",
    });

    const menuText =
      `╔══════════════════════════╗\n` +
      `║       ${botName}        ║\n` +
      `╚══════════════════════════╝\n\n` +
      `🕒 ${now}\n\n` +
      `━━━━━ ⚙️ GERAL ━━━━━\n` +
      `${prefix}ping  - Testa o bot\n` +
      `${prefix}menu  - Abre este menu\n\n` +
      `━━━━━ 👥 GRUPO (ADM) ━━━━━\n` +
      `${prefix}ban @user  - Remove do grupo\n` +
      `${prefix}add número - Adiciona ao grupo\n\n` +
      `━━━━━ 🎵 MÚSICA ━━━━━\n` +
      `${prefix}music nome - Pesquisa no YouTube\n\n` +
      `_Prefixo atual: *${prefix}*_`;

    await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
  },
};
