/**
 * commands/music.js
 * Pesquisa uma música no YouTube e retorna o primeiro resultado.
 * Usa a API pública de busca do YouTube (sem precisar de API Key).
 * Uso: .music nome da música
 */

const axios = require("axios");

module.exports = {
  name: "music",
  description: "Pesquisa uma música no YouTube",
  usage: ".music nome da música",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prefix = process.env.PREFIX ?? ".";

    if (args.length === 0) {
      return sock.sendMessage(
        jid,
        { text: `❌ Informe o nome da música!\nUso: *${prefix}music Nome da Música*` },
        { quoted: msg }
      );
    }

    const query = args.join(" ");

    // Avisa que está pesquisando
    await sock.sendMessage(
      jid,
      { text: `🔍 Pesquisando: *${query}*...` },
      { quoted: msg }
    );

    try {
      // Faz a busca na página de resultados do YouTube (sem API Key)
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const { data } = await axios.get(searchUrl, {
        headers: {
          // User-Agent de browser para receber a página completa
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        timeout: 10000,
      });

      // Extrai o videoId do primeiro resultado via regex no HTML
      const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);

      if (!match) {
        return sock.sendMessage(
          jid,
          { text: "❌ Nenhum resultado encontrado para: *" + query + "*" },
          { quoted: msg }
        );
      }

      const videoId = match[1];
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Tenta extrair o título do vídeo
      const titleMatch = data.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : query;

      // Tenta extrair o canal
      const channelMatch = data.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
      const channel = channelMatch ? channelMatch[1] : "Desconhecido";

      const response =
        `🎵 *Resultado encontrado!*\n\n` +
        `📌 *Título:* ${title}\n` +
        `👤 *Canal:* ${channel}\n` +
        `🔗 *Link:* ${videoUrl}`;

      await sock.sendMessage(jid, { text: response }, { quoted: msg });
    } catch (err) {
      console.error("Erro na busca de música:", err.message);
      await sock.sendMessage(
        jid,
        { text: "❌ Erro ao pesquisar a música. Tente novamente mais tarde." },
        { quoted: msg }
      );
    }
  },
};
