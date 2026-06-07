# 📳 WakeMe — Remote Alarm untuk Video Call

App buat nge-wake up pacar lo yang ketiduran, **bypass silent mode** di Android.

---

## 🔧 Stack

- **React Native + Expo** — cross platform
- **Firebase Firestore** — simpan token & pair data
- **Expo Push Notifications** — relay ke FCM high-priority
- **Android ALARM Channel** — bypass silent & DND

---

## 🚀 Setup Step-by-step

### 1. Install dependencies

```bash
cd wakeme
npm install
```

### 2. Setup Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Bikin project baru (contoh: `wakeme-app`)
3. Tambah Android app → package name: `com.yourname.wakeme`
4. Download `google-services.json` → taruh di root project
5. Buka **Firestore Database** → Create database → Start in test mode
6. Copy config dari **Project Settings → General → Your apps → SDK setup**
7. Paste ke `src/lib/firebase.ts`:

```ts
const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx",
};
```

### 3. Setup Expo EAS (buat build)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Copy `projectId` dari output → paste ke `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "YOUR_EAS_PROJECT_ID"
  }
}
```

Juga paste ke `src/lib/notifications.ts` di bagian:
```ts
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'YOUR_EXPO_PROJECT_ID',
});
```

### 4. Tambah alarm sound (opsional)

Taruh file `alarm.wav` di `assets/alarm.wav`

Free alarm sounds: [freesound.org](https://freesound.org/search/?q=alarm&f=tag%3A%22alarm%22)

### 5. Build APK

```bash
# Development build (buat testing)
eas build --profile development --platform android

# Production APK
eas build --profile production --platform android
```

---

## 📱 Cara Pakai

### Pertama kali:
1. Buka app → setup screen muncul
2. Masukkin nama lo
3. App generate **kode unik** 6 karakter
4. **Kirim kode itu ke pacar lo** (via chat)
5. Minta dia install app yang sama, setup nama dia
6. Dia kasih kode dia ke lo
7. Masukkin kode pacar lo → **Connected!** ✅

### Sehari-hari:
- Kalau pacar lo ketiduran saat video call → **tekan tombol WAKE UP**
- HP dia bunyi alarm meski silent/DND aktif 🔔
- Berlaku dua arah — dia juga bisa wake up lo

---

## 🔕 Kenapa bisa bypass silent?

Android punya konsep **notification channels** dengan priority berbeda:

| Channel | Silent bypass? |
|---------|---------------|
| Default | ❌ Kena mute |
| High | ❌ Kena mute |
| **ALARM** | ✅ **Bypass silent!** |

WakeMe pakai `AudioAttributes.USAGE_ALARM` yang di Android di-treat sama seperti alarm clock — bunyi meski HP di-silent.

---

## 📁 Struktur Project

```
wakeme/
├── app/
│   ├── _layout.tsx      # Root layout
│   ├── index.tsx        # Main screen (tombol wake up)
│   └── setup.tsx        # Onboarding & pairing
├── src/
│   ├── lib/
│   │   ├── firebase.ts      # Firebase init
│   │   └── notifications.ts # FCM + alarm channel logic
│   └── store/
│       └── useStore.ts      # Zustand state
├── assets/
│   └── alarm.wav        # Custom alarm sound
├── app.json             # Expo config + Android permissions
├── babel.config.js
└── package.json
```

---

## 🐛 Troubleshooting

**Notifikasi tidak bunyi di silent:**
- Pastiin `channelId: 'wakeme-alarm'` di setiap notif
- Cek `bypassDnd: true` di channel setup
- Android 12+ butuh `SCHEDULE_EXACT_ALARM` permission

**Partner tidak ketemu:**
- Pastiin dua-duanya sudah selesai setup
- Kode case-sensitive → cek huruf besar semua
- Cek koneksi internet

**Build gagal:**
- Pastiin `google-services.json` ada di root
- Run `expo doctor` untuk cek compatibility

---

## 💡 Pengembangan Selanjutnya

- [ ] In-app alert fullscreen saat terima wake up
- [ ] Custom message saat wake up
- [ ] Riwayat wake up history
- [ ] Widget di home screen
- [ ] Apple Watch support (iOS)

---

Made with 💕 for couples who sleep on video calls
