// ============================================================
// src/store/useStore.ts
// Global state: user, partner, connection status
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  fcmToken: string | null;
}

interface AppState {
  // User
  me: User | null;
  partner: User | null;
  isSetupDone: boolean;

  // UI
  isSending: boolean;
  lastWakeUpSent: Date | null;
  lastWakeUpReceived: Date | null;

  // Actions
  setMe: (user: User) => void;
  setPartner: (partner: User) => void;
  setSetupDone: (done: boolean) => void;
  setIsSending: (v: boolean) => void;
  setLastWakeUpSent: () => void;
  setLastWakeUpReceived: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  me: null,
  partner: null,
  isSetupDone: false,
  isSending: false,
  lastWakeUpSent: null,
  lastWakeUpReceived: null,

  setMe: (user) => set({ me: user }),
  setPartner: (partner) => set({ partner }),
  setSetupDone: (done) => set({ isSetupDone: done }),
  setIsSending: (v) => set({ isSending: v }),
  setLastWakeUpSent: () => set({ lastWakeUpSent: new Date() }),
  setLastWakeUpReceived: () => set({ lastWakeUpReceived: new Date() }),

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem('wakeme_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          me: parsed.me ?? null,
          partner: parsed.partner ?? null,
          isSetupDone: parsed.isSetupDone ?? false,
        });
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  },

  saveToStorage: async () => {
    const { me, partner, isSetupDone } = get();
    try {
      await AsyncStorage.setItem('wakeme_state', JSON.stringify({
        me, partner, isSetupDone,
      }));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  },

  reset: () => set({
    me: null,
    partner: null,
    isSetupDone: false,
    isSending: false,
    lastWakeUpSent: null,
    lastWakeUpReceived: null,
  }),
}));
