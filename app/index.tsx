// ============================================================
// app/index.tsx
// Main screen — tombol WAKE UP, status, history
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  StatusBar,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { sendWakeUpCall, getPartnerToken, saveTokenToFirestore } from '../src/lib/notifications';

const { width, height } = Dimensions.get('window');

// ─── Pulse Ring Component ──────────────────────────────────────────────────────
function PulseRing({ active, color }: { active: boolean; color: string }) {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim1.setValue(0);
      anim2.setValue(0);
      return;
    }

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(anim2, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop1.start();
    loop2.start();
    return () => { loop1.stop(); loop2.stop(); };
  }, [active]);

  const makeStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  return (
    <>
      <Animated.View style={makeStyle(anim1)} />
      <Animated.View style={makeStyle(anim2)} />
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { me, partner, isSetupDone, isSending, lastWakeUpSent, lastWakeUpReceived, setIsSending, setLastWakeUpSent, loadFromStorage } = useStore();
  const [wakeReceived, setWakeReceived] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Load state on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Redirect to setup jika belum selesai setup
  useEffect(() => {
    if (!isSetupDone) {
      router.replace('/setup');
    }
  }, [isSetupDone]);

  // Listener notifikasi masuk
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type === 'WAKE_UP_CALL') {
        setWakeReceived(true);
        triggerShake();
        setTimeout(() => setWakeReceived(false), 5000);
      }
    });
    return () => sub.remove();
  }, []);

  // Animasi shake saat terima wake up
  const triggerShake = () => {
    Animated.sequence([
      ...Array(6).fill(null).map((_, i) =>
        Animated.timing(shakeAnim, {
          toValue: i % 2 === 0 ? 10 : -10,
          duration: 60,
          useNativeDriver: true,
        })
      ),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate([0, 400, 200, 400, 200, 400]);
  };

  // Animasi press tombol
  const animatePress = (toValue: number) => {
    Animated.spring(btnScale, {
      toValue,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // ─── Handler: Kirim Wake Up ──────────────────────────────────────────────────
  const handleWakeUp = useCallback(async () => {
    if (!partner || !me) return;
    if (isSending) return;

    // Cooldown 10 detik
    if (lastWakeUpSent) {
      const diff = (Date.now() - new Date(lastWakeUpSent).getTime()) / 1000;
      if (diff < 10) {
        Alert.alert('Sabar dulu bro 😅', `Tunggu ${Math.ceil(10 - diff)} detik lagi`);
        return;
      }
    }

    setIsSending(true);
    animatePress(0.92);
    Vibration.vibrate(100);

    try {
      // Ambil token terbaru partner dari Firestore
      const token = await getPartnerToken(partner.id);
      if (!token) {
        Alert.alert('Gagal 😢', 'Partner belum online atau belum setup notifikasi');
        return;
      }

      await sendWakeUpCall(token, me.name);
      setLastWakeUpSent();
      Alert.alert('Terkirim! 💕', `Wake up call dikirim ke ${partner.name}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Gagal kirim notifikasi');
    } finally {
      setIsSending(false);
      animatePress(1);
    }
  }, [partner, me, isSending, lastWakeUpSent]);

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  };

  if (!isSetupDone) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Background mesh gradient */}
      <LinearGradient
        colors={['#050508', '#0d0d18', '#050508']}
        style={StyleSheet.absoluteFill}
      />

      {/* Orb decoration */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>WAKE<Text style={styles.accentText}>ME</Text></Text>
          <Pressable onPress={() => router.push('/setup')} style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </View>

        {/* Partner card */}
        <View style={styles.partnerCard}>
          <View style={styles.partnerAvatar}>
            <Text style={styles.partnerEmoji}>💕</Text>
          </View>
          <View>
            <Text style={styles.partnerLabel}>Connected to</Text>
            <Text style={styles.partnerName}>{partner?.name ?? '—'}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {/* Wake received banner */}
        {wakeReceived && (
          <Animated.View
            style={[styles.receivedBanner, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={styles.receivedText}>🔔 {partner?.name} is waking you up!</Text>
          </Animated.View>
        )}

        {/* Main button area */}
        <View style={styles.buttonArea}>
          <PulseRing active={isSending} color="#6C63FF" />

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              onPress={handleWakeUp}
              onPressIn={() => animatePress(0.95)}
              onPressOut={() => animatePress(1)}
              activeOpacity={1}
              disabled={isSending}
              style={styles.wakeBtn}
            >
              <LinearGradient
                colors={isSending
                  ? ['#3d3580', '#6C63FF']
                  : ['#6C63FF', '#9C4DCC']}
                style={styles.wakeBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.wakeBtnIcon}>{isSending ? '📡' : '📳'}</Text>
                <Text style={styles.wakeBtnLabel}>
                  {isSending ? 'Sending...' : 'WAKE UP'}
                </Text>
                <Text style={styles.wakeBtnSub}>
                  {isSending ? 'Menghubungi...' : partner?.name ?? 'Partner'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.hint}>
            {isSending ? '' : 'Tekan untuk bypass silent mode pacar lo 🔕→🔔'}
          </Text>
        </View>

        {/* Log */}
        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Activity</Text>
          {lastWakeUpSent && (
            <View style={styles.logRow}>
              <Text style={styles.logIcon}>📤</Text>
              <Text style={styles.logText}>
                Lo kirim wake up ke {partner?.name} · {formatTime(lastWakeUpSent)}
              </Text>
            </View>
          )}
          {lastWakeUpReceived && (
            <View style={styles.logRow}>
              <Text style={styles.logIcon}>📥</Text>
              <Text style={styles.logText}>
                {partner?.name} wake up lo · {formatTime(lastWakeUpReceived)}
              </Text>
            </View>
          )}
          {!lastWakeUpSent && !lastWakeUpReceived && (
            <Text style={styles.logEmpty}>Belum ada aktivitas~</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            ⚡ Notifikasi dikirim via <Text style={styles.accentText}>Alarm Channel</Text> — bunyi meski HP silent atau DND aktif
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  orbTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#6C63FF',
    opacity: 0.08,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#9C4DCC',
    opacity: 0.07,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  accentText: {
    color: '#6C63FF',
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
    color: '#888',
  },
  partnerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.2)',
    padding: 16,
    marginBottom: 24,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerEmoji: { fontSize: 24 },
  partnerLabel: {
    fontSize: 11,
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  onlineDot: {
    marginLeft: 'auto',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  receivedBanner: {
    width: '100%',
    backgroundColor: 'rgba(250, 60, 100, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(250, 60, 100, 0.4)',
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  receivedText: {
    color: '#fa3c64',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  wakeBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  wakeBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  wakeBtnIcon: {
    fontSize: 40,
  },
  wakeBtnLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
  },
  wakeBtnSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  hint: {
    marginTop: 20,
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  logCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
    marginBottom: 16,
    gap: 12,
  },
  logTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  logIcon: { fontSize: 16, marginTop: 1 },
  logText: {
    flex: 1,
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  logEmpty: {
    color: '#444',
    fontSize: 13,
    fontStyle: 'italic',
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.15)',
    padding: 14,
  },
  infoText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
