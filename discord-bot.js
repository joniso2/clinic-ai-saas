require("dotenv").config({ path: ".env.local" });
require('dotenv').config();
const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}

async function doFetch(url, options) {
  if (typeof fetch !== 'undefined') {
    return fetch(url, options);
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch(url, options);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) {
      return;
    }

    const content = (message.content || '').trim();
    if (!content) {
      return;
    }

    const userId = message.author.id;
    const botId = client.user?.id;
    const conversationHistory = [];
    try {
      const fetched = await message.channel.messages.fetch({ limit: 25 });
      const fromThisUserOrBot = fetched
        .filter((m) => m.author.id === userId || m.author.id === botId)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      const list = Array.from(fromThisUserOrBot.values());
      const currentIndex = list.findIndex((m) => m.id === message.id);
      const forHistory = currentIndex >= 0 ? list.slice(0, currentIndex) : list.slice(0, -1);
      for (const m of forHistory) {
        conversationHistory.push({
          role: m.author.bot ? 'assistant' : 'user',
          content: (m.content || '').trim(),
        });
      }
    } catch (e) {
      console.warn('Discord bot: could not fetch history', e.message);
    }

    const payload = {
      content,
      author_name: message.author.username,
      channel_id: message.channel.id,
      guild_id: message.guild ? message.guild.id : null,
      conversation_history: conversationHistory,
    };

    const webhookUrl = `${process.env.APP_URL}/api/webhook/discord`;
    if (!process.env.APP_URL) {
      console.error('Discord bot: APP_URL is not set in .env.local');
      return;
    }
    const response = await doFetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `Discord bot: webhook failed ${response.status}`,
        text.slice(0, 200),
      );
      return;
    }

    const data = await response.json();
    const reply =
      data && typeof data.reply === 'string' ? data.reply.trim() : '';

    if (reply) {
      await message.reply(reply);
    } else {
      console.log('Discord bot: API returned empty reply');
    }
  } catch (error) {
    console.error('Discord bot: error handling messageCreate:', error);
  }
});

client
  .login(token)
  .catch((error) => {
    console.error('Discord bot: failed to login:', error);
    process.exit(1);
  });

