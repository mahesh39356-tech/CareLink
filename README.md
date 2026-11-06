# CareLink Rural Health Telemedicine
**Hackathon Problem: TAH-013 – Low-Bandwidth Telemedicine for Rural Healthcare**

A mobile-first React 19 + TypeScript + Vite offline telemedicine application recreated from Figma Make, packaged with Capacitor for Android deployment.

---

## 📱 Features & Implemented Screens

1. **Top Prototype Tabs Navigation:** Switch instantly between all prototype screens (`Patient Register`, `Vitals Capt`, `Media Capture`, `Outbox`, `Success`, `Doctor`).
2. **Patient Register (`Rapid Offline Logging`):** Patient search, full name, age, gender dropdown, and low-data transfer sync toggle.
3. **Vitals Capture (Step 2 / 4):** 2G low-bandwidth indicator, patient ID banner, BP (`mmHg`), Temperature (`°C`), Heart Rate (`bpm`), and encrypted offline storage confirmation.
4. **Media Capture (Step 3 / 4):** Clinical photo camera capture / upload with real in-browser WebP canvas compression (`5 MB -> 45 KB`, `99% SMALLER`), voice note recorder with interactive waveform player (`0:18`), and language selector (Swahili).
5. **Outbox / Offline Sync:** Visualizes the 3 pending patient packets (`Amina Mwangi - 8.2 KB`, `Joseph Otieno - 9.7 KB`, `Fatima Khalid - 6.6 KB`), total payload badge (`24.5 KB total`), AES-grade encryption disclaimer, and `SYNC ALL (24.5 KB) >` CTA.
6. **Transmission Success:** Full-screen CareLink dark emerald branding (`#083830`), pulsing concentric checkmark animation, real payload metric breakdown, and return-to-home action.
7. **Doctor Triage Portal (`Doctor Dashboard`):** Tele-specialist inbox displaying decoded field telemetry, normal/alert thresholds, Opus voice note audio playback, and low-bandwidth digital prescription advice transmitter.

---

## 🚀 Getting Started

### 1. Run Local Development Server
```bash
cd C:\Users\VICKY\.gemini\antigravity\scratch\carelink-telemedicine-app
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production
```bash
npm run build
```

### 3. Open in Android Studio via Capacitor
```bash
npm run build:android
npm run cap:open:android
```
Or open the `android/` directory in Android Studio and run on an Android device or emulator.
