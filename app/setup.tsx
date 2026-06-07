// ============================================================
// app/setup.tsx
// Onboarding: input nama, pair dengan partner via kode unik
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../src/lib/firebase';
import { useStore } from '../src/store/useStore';
import {
  registerForPushNotifications,
  saveTokenToFirestore,
  setupNotificationHandler,
} from '../src/lib/notifications';

// Generate kode pair unik 6 karakter
function generatePairCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function SetupScreen() {
  const { me, setMe, setPartner, setSetupDone, saveToStorage } = useStore();
  const [step, setStep] = useState<'name' | 'pair' | 'waiting'>('name');
  const [myName, setMyName] = useState('');
  const [myCode, setMyCode] = useState(generatePairCode());
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  // ─── Step 1: Simpan nama & daftar ke Firestore ─────────────────────────────
  const handleSaveName = async () => {
    if (!myName.trim()) {
      Alert.alert('Hei!', 'Masukkin nama lo dulu dong');
      return;
    }
    setLoading(true);
    try {
      const token = await registerForPushNotifications();
      if (!token) {
        Alert.alert('Error', 'Gagal dapet permission notifikasi. Cek settings HP lo.');
        return;
      }

      const userId = myCode; // pakai kode sebagai userId
      await saveTokenToFirestore(userId, token);
      await setDoc(doc(db, 'users', userId), {
        name: myName.trim(),
        fcmToken: token,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      setMe({ id: userId, name: myName.trim(), fcmToken: token });
      setStep('pair');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Connect ke partner dengan kode mereka ────────────────────────
  const handlePairWithPartner = async () => {
    if (!partnerCode.trim() || partnerCode.trim().length < 4) {
      Alert.alert('Hei!', 'Masukkin kode partner lo (6 karakter)');
      return;
    }
    if (partnerCode.trim().toUpperCase() === myCode) {
      Alert.alert('Hm..', 'Itu kode lo sendiri bro 😅');
      return;
    }

    setLoading(true);
    try {
      const partnerId = partnerCode.trim().toUpperCase();
      const partnerRef = doc(db, 'users', partnerId);
      const partnerSnap = await getDoc(partnerRef);

      if (!partnerSnap.exists()) {
        Alert.alert('Tidak ditemukan', 'Kode partner tidak valid atau belum setup. Minta dia setup dulu ya.');
        return;
      }

      const partnerData = partnerSnap.data();
      setPartner({
        id: partnerId,
        name: partnerData.name,
        fcmToken: partnerData.fcmToken,
      });

      // Simpan partner ID ke dokumen kita juga
      await setDoc(doc(db, 'users', myCode), {
        partnerId: partnerId,
      }, { merge: true });

      await saveToStorage();
      setSetupDone(true);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      // Pakai Share native untuk share kode ke pacar
      await Share.share({
        message: `Kode WakeMe gue: ${myCode} — install WakeMe dan masukkin kode ini ya 💕`,
        title: 'Kode WakeMe',
      });
    } catch (err) {
      Alert.alert('Kode lo', myCode + '\n\nScreenshot atau catat kode ini dan kirim ke pacar lo 💕');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />
      <LinearGradient
        colors={['#050508', '#0d0d18', '#050508']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Text style={styles.logo}>WAKE<Text style={styles.accent}>ME</Text></Text>
        <Text style={styles.tagline}>
          {step === 'name' ? 'Setup dulu sebentar ✨' :
           step === 'pair' ? 'Pair sama pacar lo 💕' :
           'Nunggu partner...'}
        </Text>

        {/* ── Step: Name ── */}
        {step === 'name' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nama lo siapa?</Text>
            <Text style={styles.cardSub}>Ini yang muncul di notifikasi pacar lo</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Budi"
              placeholderTextColor="#444"
              value={myName}
              onChangeText={setMyName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              maxLength={30}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={handleSaveName}
              disabled={loading}
            >
              <LinearGradient
                colors={['#6C63FF', '#9C4DCC']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Lanjut →</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: Pair ── */}
        {step === 'pair' && (
          <View style={styles.card}>
            {/* Kode lo */}
            <Text style={styles.cardTitle}>Kode lo 👇</Text>
            <Text style={styles.cardSub}>Kasih kode ini ke pacar lo</Text>
            <TouchableOpacity style={styles.codeBox} onPress={copyCode}>
              <Text style={styles.codeText}>{myCode}</Text>
              <Text style={styles.codeCopy}>Tap to copy 📋</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Kode partner */}
            <Text style={styles.cardTitle}>Kode pacar lo 👆</Text>
            <Text style={styles.cardSub}>Minta dia share kodenya ke lo</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkin kode partner"
              placeholderTextColor="#444"
              value={partnerCode}
              onChangeText={(t) => setPartnerCode(t.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handlePairWithPartner}
              maxLength={6}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={handlePairWithPartner}
              disabled={loading}
            >
              <LinearGradient
                colors={['#6C63FF', '#9C4DCC']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Connect 💕</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🔒 Data lo cuma disimpan di Firebase project lo sendiri. Gak ada server pihak ketiga.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    flexGrow: 1,
  },
  orb: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6C63FF',
    opacity: 0.08,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 5,
    marginBottom: 8,
  },
  accent: { color: '#6C63FF' },
  tagline: {
    color: '#666',
    fontSize: 14,
    marginBottom: 40,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 24,
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cardSub: {
    fontSize: 13,
    color: '#555',
    marginTop: -6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 18,
    padding: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  codeBox: {
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#6C63FF',
    letterSpacing: 8,
  },
  codeCopy: {
    fontSize: 12,
    color: '#555',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
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
    color: '#555',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
