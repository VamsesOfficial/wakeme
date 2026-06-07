// ============================================================
// src/lib/notifications.ts
// Core logic: bypass silent mode via Android ALARM channel
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Android Notification Channels ────────────────────────────────────────────
// ALARM channel → bypass silent + DND di Android
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Channel utama: pakai audio stream ALARM, bypass silent mode
  await Notifications.setNotificationChannelAsync('wakeme-alarm', {
    name: 'WakeMe Alarm',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarm.wav',           // custom sound di android/app/src/main/res/raw/
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    enableVibrate: true,
    bypassDnd: true,              // bypass Do Not Disturb
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,  // ← kunci bypass silent
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,  // paksa bunyi meski silent
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
}

// ─── Request Permission & Get FCM Token ───────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Must use physical device for notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  await setupNotificationChannels();

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'fcb321b5-1ba4-4c48-bd53-445010132795', // dari app.json / EAS dashboard
  });

  return token.data;
}

// ─── Simpan FCM Token ke Firestore ────────────────────────────────────────────
export async function saveTokenToFirestore(userId: string, token: string) {
  await setDoc(doc(db, 'users', userId), {
    fcmToken: token,
    lastSeen: new Date().toISOString(),
    isOnline: true,
  }, { merge: true });
}

// ─── Ambil Token Pasangan dari Firestore ──────────────────────────────────────
export async function getPartnerToken(partnerId: string): Promise<string | null> {
  const ref = doc(db, 'users', partnerId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data().fcmToken ?? null;
  }
  return null;
}

// ─── Kirim Wake Up via Expo Push Service ──────────────────────────────────────
// Ini pakai Expo Push API sebagai relay — no server needed!
// Di production, lo bisa ganti dengan Firebase Cloud Functions
export async function sendWakeUpCall(partnerToken: string, senderName: string) {
  const message = {
    to: partnerToken,
    sound: 'alarm.wav',
    title: `🔔 ${senderName} is calling you!`,
    body: 'Tap to wake up — video call is waiting 💕',
    priority: 'high',
    channelId: 'wakeme-alarm',   // pakai channel ALARM kita
    data: {
      type: 'WAKE_UP_CALL',
      sender: senderName,
    },
    android: {
      channelId: 'wakeme-alarm',
      priority: 'max',
      sound: 'alarm.wav',
      vibrate: [0, 500, 200, 500],
    },
    _contentAvailable: true,     // iOS background wake
    mutableContent: true,
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  
  if (result.data?.status === 'error') {
    throw new Error(result.data.message || 'Failed to send notification');
  }

  return result;
}

// ─── Setup Notification Handler (foreground) ──────────────────────────────────
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}
