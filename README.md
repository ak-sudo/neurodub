
# 🌐 NeuroDub – Real-Time AI Video Translation Platform

**NeuroDub** is an AI-powered web application (and upcoming Chrome extension) that allows users to translate the speech from any video — such as YouTube content, uploaded movies, or lectures — into any target language in real-time, with synchronized audio playback.

---

## 🚀 Features

- 🎙️ **Real-Time Speech Recognition (ASR)**  
  Automatically detects and transcribes the spoken language in videos.

- 🌐 **Multi-Language Neural Translation (NMT)**  
  Converts transcribed speech into a target language using AI-powered translation.

- 🔊 **Text-to-Speech Synthesis (TTS)**  
  Generates natural-sounding translated audio for seamless user experience.

- 🕓 **Live Synchronized Playback**  
  Translated audio syncs with the original video in real-time.

- 📼 **YouTube & Local Video Support**  
  Users can either upload videos or enter a YouTube URL.

- 🧠 **Built with State-of-the-Art AI Models**  
  Integration of powerful open-source/paid APIs (e.g., Whisper, Google Translate, ElevenLabs, or similar TTS/ASR models).

---

## 🌍 Real-World Impact

NeuroDub breaks down language barriers across:

- **Global Education:** Students can learn from videos in any language.
- **Content Accessibility:** Unlocks regional reach for creators.
- **Entertainment Localization:** Enjoy movies/documentaries in your native tongue instantly.
- **Enterprise Use:** Train international teams with translated instructional videos.

---

## 🧩 Tech Stack

| Layer             | Technology Used                          |
|------------------|-------------------------------------------|
| **Frontend**     | React.js, Tailwind CSS                    |
| **Backend**      | Node.js, Express                          |
| **Database**     | MongoDB (optional for history/favorites)  |
| **Streaming**    | WebSockets / Socket.IO                    |
| **ASR**          | OpenAI Whisper / Google Speech-to-Text    |
| **Translation**  | Google Translate API / LibreTranslate     |
| **TTS**          | ElevenLabs / Amazon Polly / Coqui TTS     |
| **Hosting**      | Netlify (Frontend), Render/Vercel/Heroku  |
| **Browser Ext**  | Chrome Extension (Planned)                |

---

## 🧪 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/neurodub.git
cd neurodub
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 3. Backend Setup
```bash
cd server
npm install
npm run start
```

### 4. Environment Variables
Create a `.env` file in `server/` with:

```
PORT=5000
TTS_API_KEY=your_tts_api_key
TRANSLATION_API_KEY=your_translation_api_key
ASR_API_KEY=your_asr_api_key
```

---

## 🧠 Architecture

```
User
 │
 ▼
Frontend (React)
 │
 ▼
Backend (Node.js + Express)
 │      ┌──────────────┐
 ├────▶│  ASR Module   │ ◀──── Uploaded/Streamed Audio
 │      └──────────────┘
 │      ┌──────────────┐
 ├────▶│ Translator    │ ◀──── ASR Output
 │      └──────────────┘
 │      ┌──────────────┐
 └────▶│ TTS Module    │ ───▶ Translated Voice
        └──────────────┘
```

---

## 🌐 Chrome Extension (Coming Soon)

We plan to launch a Chrome Extension that will:
- Auto-detect video speech on webpages (e.g. YouTube)
- Translate and dub in real-time while you browse
- Act as a floating language assistant for videos

---

## 📦 Future Enhancements

- 🔁 Subtitle overlay option
- 🔉 Voice style cloning (preserve speaker tone)
- 📲 Mobile app integration (React Native)
- 🧾 Saved translation history
- 🎤 Multi-speaker separation support

---

## 💡 Inspiration

NeuroDub was created to solve a common frustration: *Why can't we instantly watch any video in our language — with voice — instead of reading subtitles or waiting for dubs?* This project aims to solve that with smart, scalable AI.

---

## 🤝 Contributing

We welcome collaborators!  
Please fork the repo, create a feature branch, and submit a PR.

---

## 📄 License

MIT License © 2025 NeuroDub.ai

---

## 🔗 Useful Links

- [Official Site](https://neurodub.netlify.app) *(Under Development)*
- [Project Poster]*(Coming Soon)*
- [Logo Pack]()*(Coming Soon)*
- [Demo Video]()*(Coming Soon)*

---

### 💬 Questions? Feedback?

Reach out on [LinkedIn](https://linkedin.com/in/akshat706) or open an issue.  
Let's break language barriers, one video at a time!
