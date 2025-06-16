# Telegram Support Client

This application provides customer support through Telegram as a standalone executable (.exe). When launched, it opens a window where you enter your Telegram bot token. After submitting the token, the app connects to the specified bot and starts a local Node.js server.

The backend listens for incoming messages from users who contact the bot, storing messages and user info in a local JSON database (lowdb). Meanwhile, a user-friendly interface built with Tauri is displayed, allowing you to:

- View the list of users currently chatting with the bot  
- See message history for each user  
- Send replies directly from the interface  

The connection stays active, polling Telegram’s servers for new messages and updating the UI in real time. This makes it easy to provide live customer support without needing to manage bot hosting or complex setups.

## 🚀 Features

- Telegram bot support via token
- Receiving messages from users
- Sending replies from the UI
- Viewing conversation and user history
- Local database using `lowdb` (JSON)

## 🧩 Tech Stack

- **Frontend/UI:** HTML + Tauri
- **Backend:** Node.js (Express, node-telegram-bot-api)
- **Data Storage:** lowdb (`db.json`)

## 📦 Installation and Running

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development mode

```bash
npm run tauri dev
```

### 3. Build `.exe`

```bash
cargo tauri build
```

## 🗂 Project Structure

```
telegram-support-client/
├── static/              # UI static files (frontendDist)
├── src-tauri/           # Tauri backend in Rust
│   └── main.rs          # Launches Node.js server
├── bot-server.js        # Telegram bot server
├── db.json              # Local lowdb database
├── tauri.conf.json      # Tauri config
```

## 📄 License

MIT License 
