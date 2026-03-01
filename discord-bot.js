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

    // /new command — reset conversation
    if (content.toLowerCase() === '/new') {
      await message.reply('✅ Conversation reset. How can I help you?');
      return;
    }

    const userId = message.author.id;
    const botId = client.user?.id;
    const conversationHistory = [];
    try {
      const fetched = await message.channel.messages.fetch({ limit: 30 });
      const sorted = Array.from(fetched.values())
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      // Find the most recent /new command before the current message
      const currentIndex = sorted.findIndex((m) => m.id === message.id);
      const beforeCurrent = currentIndex >= 0 ? sorted.slice(0, currentIndex) : sorted;

      // Find last /new reset point
      let resetIndex = -1;
      for (let i = beforeCurrent.length - 1; i >= 0; i--) {
        if ((beforeCurrent[i].content || '').trim().toLowerCase() === '/new') {
          resetIndex = i;
          break;
        }
      }

      // Only use messages after the last /new
      const relevantMessages = resetIndex >= 0
        ? beforeCurrent.slice(resetIndex + 1)
        : beforeCurrent;

      for (const m of relevantMessages) {
        if (m.author.id === userId || m.author.id === botId) {
          conversationHistory.push({
            role: m.author.bot ? 'assistant' : 'user',
            content: (m.content || '').trim(),
          });
        }
      }
      // Keep only last 10 messages to reduce token usage and latency
      if (conversationHistory.length > 10) {
        conversationHistory.splice(0, conversationHistory.length - 10);
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

