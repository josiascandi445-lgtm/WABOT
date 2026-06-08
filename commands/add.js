/**
 * commands/add.js
 * Adiciona um participante ao grupo pelo número.
 * Requer: bot e executor devem ser admins.
 * Uso: .add 244912345678
 */

const { isJidGroup } = require("@whiskeysockets/baileys");

module.exports = {
  name: "add",
  description: "Adiciona um participante ao grupo (apenas admins)",
  usage: ".add 244912345678",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prefix = process.env.PREFIX ?? ".";

    // Só funciona em grupos
    if (!isJidGroup(jid)) {
      return sock.sendMessage(
        jid,
        { text: "❌ Este comando só funciona em grupos!" },
        { quoted: msg }
      );
    }

    // Verifica se forneceu o número
    if (!args[0]) {
      return sock.sendMessage(
        jid,
        { text: `❌ Informe o número!\nUso: *${prefix}add 244912345678*` },
        { quoted: msg }
      );
    }

    // Sanitiza o número: remove +, espaços, traços e parênteses
    const numero = args[0].replace(/[\s+\-()]/g, "");

    // Validação básica: só dígitos, entre 7 e 15 caracteres
    if (!/^\d{7,15}$/.test(numero)) {
      return sock.sendMessage(
        jid,
        { text: "❌ Número inválido! Use apenas dígitos no formato internacional.\nEx: *244912345678*" },
        { quoted: msg }
      );
    }

    // Busca metadados do grupo
    const groupMeta = await sock.groupMetadata(jid);
    const participants = groupMeta.participants;

    const senderId = msg.key.participant ?? msg.key.remoteJid;
    const botId = sock.user.id.replace(/:.*@/, "@");

    // Verifica se executor é admin
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

    // Verifica se bot é admin
    const botIsAdmin = participants.some(
      (p) => p.id === botId && (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!botIsAdmin) {
      return sock.sendMessage(
        jid,
        { text: "❌ Preciso ser administrador para adicionar participantes!" },
        { quoted: msg }
      );
    }

    const targetJid = `${numero}@s.whatsapp.net`;

    // Verifica se já está no grupo
    const jaEsta = participants.some((p) => p.id === targetJid);
    if (jaEsta) {
      return sock.sendMessage(
        jid,
        { text: `⚠️ O número *${numero}* já está no grupo!` },
        { quoted: msg }
      );
    }

    // Tenta adicionar
    try {
      const result = await sock.groupParticipantsUpdate(jid, [targetJid], "add");

      // result é um array; verifica o status do primeiro item
      const status = result?.[0]?.status;

      if (status === "200" || status === 200) {
        await sock.sendMessage(
          jid,
          { text: `✅ *+${numero}* foi adicionado ao grupo!` },
          { quoted: msg }
        );
      } else if (status === "403") {
        await sock.sendMessage(
          jid,
          { text: `⚠️ *+${numero}* não permite ser adicionado por não-contatos.\nEnvie o link do grupo para ele entrar.` },
          { quoted: msg }
        );
      } else if (status === "408") {
        await sock.sendMessage(
          jid,
          { text: `❌ *+${numero}* não tem WhatsApp ou o número não existe.` },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          jid,
          { text: `⚠️ Resultado inesperado ao adicionar *+${numero}* (status: ${status}).` },
          { quoted: msg }
        );
      }
    } catch (err) {
      console.error("Erro ao adicionar:", err);
      await sock.sendMessage(
        jid,
        { text: "❌ Não foi possível adicionar o participante." },
        { quoted: msg }
      );
    }
  },
};
