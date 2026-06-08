/**
 * commands/ban.js
 * Remove um participante do grupo.
 * Requer: bot e executor devem ser admins.
 * Uso: .ban @mention ou responder a mensagem de alguém
 */

const { isJidGroup } = require("@whiskeysockets/baileys");

module.exports = {
  name: "ban",
  description: "Remove um participante do grupo (apenas admins)",
  usage: ".ban @mention",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // Só funciona em grupos
    if (!isJidGroup(jid)) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando só funciona em grupos!" },
        { quoted: msg }
      );
    }

    // Busca metadados do grupo (lista de participantes e admins)
    const groupMeta = await sock.groupMetadata(jid);
    const participants = groupMeta.participants;

    // ID do remetente (quem usou o comando)
    const senderId = msg.key.participant ?? msg.key.remoteJid;

    // ID do bot
    const botId = sock.user.id.replace(/:.*@/, "@");

    // Verifica se o executor é admin
    const senderIsAdmin = participants.some(
      (p) => p.id === senderId && (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!senderIsAdmin) {
      return sock.sendMessage(
        jid,
        { text: "⚠️ Apenas administradores podem usar este comando!" },
        { quoted: msg }
      );
    }

    // Verifica se o bot é admin
    const botIsAdmin = participants.some(
      (p) => p.id === botId && (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!botIsAdmin) {
      return sock.sendMessage(
        jid,
        { text: "❌ Preciso ser administrador para remover participantes!" },
        { quoted: msg }
      );
    }

    // Determina o alvo: menção ou resposta a uma mensagem
    let targetJid = null;

    // 1. Verifica menções (@mention)
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentions && mentions.length > 0) {
      targetJid = mentions[0];
    }

    // 2. Verifica se é resposta a uma mensagem
    if (!targetJid) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (quoted) targetJid = quoted;
    }

    if (!targetJid) {
      return sock.sendMessage(
        jid,
        { text: `❌ Marque alguém para remover!\nUso: *${process.env.PREFIX ?? "."}ban @mention*` },
        { quoted: msg }
      );
    }

    // Não pode banir a si mesmo
    if (targetJid === botId) {
      return sock.sendMessage(
        jid,
        { text: "😅 Não posso me remover!" },
        { quoted: msg }
      );
    }

    // Remove o participante
    try {
      await sock.groupParticipantsUpdate(jid, [targetJid], "remove");
      const numero = targetJid.split("@")[0];
      await sock.sendMessage(
        jid,
        { text: `✅ @${numero} foi removido do grupo.`, mentions: [targetJid] },
        { quoted: msg }
      );
    } catch (err) {
      console.error("Erro ao banir:", err);
      await sock.sendMessage(
        jid,
        { text: "❌ Não foi possível remover o participante." },
        { quoted: msg }
      );
    }
  },
};
