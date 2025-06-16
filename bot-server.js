const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let bot = null;
let currentToken = '';

// Настройка lowdb с файлом db.json
const dbPath = path.join(process.cwd(), 'db.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { bots: {} });


// Инициализация базы (если пустая — создаём структуру с bots)
async function initDB() {
  await db.read();
  if (!db.data || Object.keys(db.data).length === 0) {
    db.data = { bots: {} };
    await db.write();
  }
  console.log('Database initialized');
}

(async () => {
  await initDB();

  app.post('/start-bot', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).send({ error: 'Token required' });

    try {
      if (bot) {
        bot.stopPolling();
      }

      bot = new TelegramBot(token, { polling: true });
      currentToken = token;

      await db.read();
      if (!db.data.bots[token]) {
        db.data.bots[token] = {
          chatMessages: {},
          chatUsers: {},
          chatIds: []
        };
        await db.write();
      }

      bot.on('message', async (msg) => {
        const { chat, text, from } = msg;
        if (!chat || !text) return;
        const chatId = chat.id.toString();

        const botData = db.data.bots[token];

        if (!botData.chatIds.includes(chatId)) {
          botData.chatIds.push(chatId);
        }

        if (!botData.chatMessages[chatId]) botData.chatMessages[chatId] = [];
        botData.chatMessages[chatId].push({ from: 'user', text });

        if (!botData.chatUsers[chatId]) {
          botData.chatUsers[chatId] = {
            first_name: from.first_name || '',
            last_name: from.last_name || '',
            username: from.username || '',
            photo_url: '',
          };

          try {
            const photos = await bot.getUserProfilePhotos(chatId, { offset: 0, limit: 1 });
            if (photos.total_count > 0) {
              const fileId = photos.photos[0][0].file_id;
              const file = await bot.getFile(fileId);
              const photoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
              botData.chatUsers[chatId].photo_url = photoUrl;
            }
          } catch (err) {
            console.error('Error getting profile photo:', err.message);
          }
        }

        await db.write();
        console.log(`Saved message and user data for chatId ${chatId} under token ${token}`);
      });

      res.send({ success: true });
      console.log('Bot started with token:', token);
    } catch (err) {
      console.error('Error starting bot:', err);
      res.status(500).send({ error: 'Invalid token or error starting bot' });
    }
  });

  app.get('/bot-info', async (req, res) => {
    if (!bot) return res.status(400).send({ error: 'Bot not initialized' });

    try {
      const me = await bot.getMe();
      res.send(me);
      console.log('Sent bot info');
    } catch (err) {
      console.error('Failed to get bot info:', err);
      res.status(500).send({ error: 'Failed to get bot info' });
    }
  });

  app.get('/chat_ids', async (req, res) => {
    await db.read();
    const botData = db.data.bots[currentToken];
    if (!botData) return res.status(400).send({ error: 'Bot not initialized' });
    res.json(botData.chatIds);
    console.log('Sent chat IDs:', botData.chatIds);
  });

  app.get('/messages', async (req, res) => {
    await db.read();
    const botData = db.data.bots[currentToken];
    if (!botData) return res.status(400).send({ error: 'Bot not initialized' });
    const chatId = req.query.chat_id;
    if (!chatId) return res.status(400).send([]);
    res.json(botData.chatMessages[chatId] || []);
    console.log(`Sent messages for chatId ${chatId}`);
  });

  app.post('/send', async (req, res) => {
    const { chat_id, text } = req.body;
    if (!bot || !chat_id || !text) return res.status(400).send({ error: 'Missing data' });

    try {
      await bot.sendMessage(chat_id, text);
      await db.read();
      const botData = db.data.bots[currentToken];
      if (!botData.chatMessages[chat_id]) botData.chatMessages[chat_id] = [];
      botData.chatMessages[chat_id].push({ from: 'support', text });
      await db.write();
      console.log(`Sent message to chatId ${chat_id}:`, text);
      res.send({ success: true });
    } catch (err) {
      console.error('Failed to send message:', err);
      res.status(500).send({ error: 'Failed to send message' });
    }
  });

  app.get('/user-info', async (req, res) => {
    await db.read();
    const botData = db.data.bots[currentToken];
    if (!botData) return res.status(400).send({ error: 'Bot not initialized' });
    const chatId = req.query.chat_id;
    if (!chatId || !botData.chatUsers[chatId]) return res.status(404).send({ error: 'User not found' });
    res.json(botData.chatUsers[chatId]);
    console.log(`Sent user info for chatId ${chatId}`);
  });

  app.get('/dialogs', async (req, res) => {
    await db.read();
    const botData = db.data.bots[currentToken];
    if (!botData) return res.status(400).send({ error: 'Bot not initialized' });
    res.json(botData.chatMessages);
    console.log('Sent all dialogs');
  });

  app.listen(3000, () => {
    console.log('Bot server running on http://localhost:3000');
  });
})();
