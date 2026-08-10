/**
 * Support — Ananya AI shopping assistant (port of the website's ananya-ai.js).
 * Instant local FAQ intents → unmatched queries route to /api/chat (Gemini +
 * Supabase product search). Admin replies arrive live via realtime.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { ANANYA_SESSION_KEY, WHATSAPP_NUMBER } from '@/lib/config';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { fetchAnanyaReply, type ChatHistoryItem } from '@/lib/api';
import { AppText } from '@/components/AppText';
import { makeSessionId } from '@/lib/helpers';
import type { ChatMessage } from '@/lib/types';

interface Msg {
  id: string;
  role: 'user' | 'bot' | 'admin';
  text: string;
  senderLabel?: string;
  time: string;
}

/* ── Local FAQ intents (instant + free, ported from the website) ── */
const INTENTS: { keys: string[]; reply: string }[] = [
  {
    keys: ['timing', 'time', 'open', 'close', 'band', 'kab khula', 'schedule', 'hours', 'khula'],
    reply: '🕐 *Store Timings:*\n\n📅 Monday–Saturday: 8 AM – 9 PM\n📅 Sunday: 9 AM – 7 PM\n\nOnline order 24/7 kar sakte hain! 😊',
  },
  {
    keys: ['deliver', 'delivery', 'ship', 'door', 'ghar', 'kitna time', 'courier', 'home'],
    reply: '🚚 *Delivery Info:*\n\n📍 5 km ke andar same-day delivery\n✅ ₹200 se upar FREE delivery\n⏱️ Time: 2–4 ghante\n\nOrder ke baad Account → Orders mein track karein!',
  },
  {
    keys: ['payment', 'pay', 'upi', 'gpay', 'google pay', 'cash', 'card', 'paytm', 'phonepe', 'online pay', 'paise'],
    reply: '💳 *Payment Methods:*\n\n✅ Cash on Delivery\n✅ UPI (GPay, PhonePe, Paytm)\n✅ Debit/Credit Cards\n✅ Net Banking\n\nSabse safe: UPI payment! 😊',
  },
  {
    keys: ['return', 'refund', 'wapas', 'vapas', 'exchange', 'damage', 'toot', 'kharab'],
    reply: '↩️ *Return Policy:*\n\n🥦 Fresh items: 24 ghante ke andar\n📦 Packaged goods: 7 din ke andar\n\nReturn ke liye WhatsApp par order ID bhejein:\n📲 +91 63931 96765',
  },
  {
    keys: ['contact', 'phone', 'call', 'number', 'email', 'helpline', 'support', 'help'],
    reply: '📞 *Contact Us:*\n\n📱 Phone/WhatsApp: +91 63931 96765\n📧 Email: support@rkgrocerymart.com\n\nHum 9 AM–8 PM available hain! 😊',
  },
  {
    keys: ['discount', 'offer', 'coupon', 'sale', 'promo', 'cashback', 'deal', 'off', 'scheme'],
    reply: '🎉 *Current Offers:*\n\n🆕 Code: WELCOME10 — first order par 10% OFF\n📱 App install karo — weekly special offers\n🛒 ₹500+ order par extra 5% off\n\nCheckout pe code apply karein!',
  },
  {
    keys: ['minimum', 'min order', 'kitna order'],
    reply: '📦 *Minimum Order:*\n\nDelivery ke liye: ₹200 minimum\nIn-store: Koi minimum nahi!\n\n💡 ₹200+ order karo → FREE delivery! ✅',
  },
  {
    keys: ['organic', 'natural', 'fresh', 'healthy', 'pesticide free', 'jaivik'],
    reply: '🌿 *Organic Products:*\n\nHaan, hamare paas available hain:\n• Organic Fruits & Vegetables\n• Organic Dal, Atta, Chawal\n• Natural Spices & Masale\n\nShop mein "Organic" search karo! 🛒',
  },
  {
    keys: ['order', 'track', 'status', 'kahan hai', 'mera order', 'my order', 'order id'],
    reply: '🛒 *Order Track Kaise Karein:*\n\n1️⃣ App mein login karein\n2️⃣ Orders tab mein jaayein\n3️⃣ Order tap karein — live status!\n\nYa WhatsApp par order ID bhejein 📦',
  },
  {
    keys: ['cancel', 'cancel order'],
    reply: '❌ *Order Cancel:*\n\n1️⃣ Orders tab mein jaayein\n2️⃣ Order select karein\n3️⃣ Cancel request karein\n\nYa turant WhatsApp karein: +91 63931 96765 📲',
  },
  {
    keys: ['namaste', 'hello', 'hi', 'hey', 'helo', 'namaskar', 'good morning', 'good evening', 'salam'],
    reply: 'Namaste! 🙏😊\n\nMain Ananya hoon — RK Grocery Mart ki smart assistant.\n\nMain in topics mein help kar sakti hoon:\n🚚 Delivery · 💳 Payment · ↩️ Returns\n🎁 Offers · 📞 Contact · 🛒 Orders\n\nKya poochna chahte hain? 😊',
  },
  {
    keys: ['thanks', 'thank you', 'shukriya', 'dhanyawad', 'theek hai', 'ok', 'okay', 'achha'],
    reply: 'Bahut bahut shukriya! 🙏😊\n\nKoi aur sawaal ho toh zaroor poochein.\n\nRK Grocery Mart mein aapka swagat hai! 🌸',
  },
  {
    keys: ['bye', 'goodbye', 'alvida', 'baad mein', 'later', 'tata'],
    reply: 'Alvida! 👋😊\n\nRK Grocery Mart par aate rahein.\n\nKoi zaroorat ho toh main hamesha yahaan hoon! 🌸',
  },
];

const WELCOME: Msg = {
  id: 'welcome',
  role: 'bot',
  text: 'Namaste! 🙏 Main Ananya hoon — RK Grocery Mart ki AI shopping assistant.\n\nProducts, delivery, payment, offers — kuch bhi poochein! 😊',
  time: '',
};

function getSmartReply(msg: string): string | null {
  const m = msg.toLowerCase().trim();
  for (const intent of INTENTS) {
    if (intent.keys.some((k) => m.includes(k))) return intent.reply;
  }
  return null;
}

function timeStr(): string {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function SupportScreen() {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  /* ── Session setup ─────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    (async () => {
      let sid = await AsyncStorage.getItem(ANANYA_SESSION_KEY);
      if (!sid) {
        sid = makeSessionId();
        await AsyncStorage.setItem(ANANYA_SESSION_KEY, sid);
      }
      sessionIdRef.current = sid;
      setSid(sid);

      let name: string | null = null;
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', session.user.id).maybeSingle();
        name = profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || null;
      }
      if (active) setDisplayName(name || 'Guest User');

      try {
        await supabase.from('ananya_chat_sessions').upsert(
          {
            id: sid,
            user_id: session?.user?.id || null,
            display_name: name || 'Guest User',
            page_url: 'mobile-app',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch {
        // optional
      }

      // Load history
      try {
        const { data } = await supabase
          .from('ananya_chat_messages')
          .select('*')
          .eq('session_id', sid)
          .order('created_at', { ascending: true })
          .limit(50);
        if (active && data?.length) {
          setMessages(
            (data as ChatMessage[]).map((m) => ({
              id: m.id || Math.random().toString(),
              role: m.role === 'user' ? 'user' : m.role === 'admin' ? 'admin' : 'bot',
              text: m.content,
              senderLabel: m.role === 'admin' ? '🛡️ Support Agent' : undefined,
              time: timeStr(),
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  /* ── Save a message to Supabase ─────────────────────────── */
  const saveMessage = useCallback(async (role: string, text: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await supabase.from('ananya_chat_messages').insert({
        session_id: sid,
        role,
        content: text,
        created_at: new Date().toISOString(),
      });
      if (role === 'user') {
        const { data: current } = await supabase.from('ananya_chat_sessions').select('unread').eq('id', sid).maybeSingle();
        await supabase
          .from('ananya_chat_sessions')
          .update({ last_message: text.slice(0, 100), unread: (current?.unread || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', sid);
      }
    } catch {
      // optional
    }
  }, []);

  /* ── Realtime: admin replies arrive live ────────────────── */
  useEffect(() => {
    if (!sid) return;
    const ch = supabase
      .channel(`ananya-app-${sid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ananya_chat_messages', filter: `session_id=eq.${sid}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          if (m.role === 'admin') {
            setMessages((prev) => [
              ...prev,
              { id: Math.random().toString(), role: 'admin', text: m.content, senderLabel: '🛡️ Support Agent', time: timeStr() },
            ]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sid]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    const userMsg: Msg = { id: Math.random().toString(), role: 'user', text, time: timeStr() };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage('user', text);

    // Local intent first (instant, free)
    const local = getSmartReply(text);
    if (local) {
      setTimeout(() => {
        const botMsg: Msg = { id: Math.random().toString(), role: 'bot', text: local, time: timeStr() };
        setMessages((prev) => [...prev, botMsg]);
        saveMessage('assistant', local);
      }, 400);
      return;
    }

    // Else backend AI
    setTyping(true);
    try {
      const history: ChatHistoryItem[] = messages
        .slice(-12)
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const { reply } = await fetchAnanyaReply({
        message: text,
        sessionId: sessionIdRef.current,
        accessToken: session?.access_token || null,
        history,
      });
      const botMsg: Msg = { id: Math.random().toString(), role: 'bot', text: reply, time: timeStr() };
      setMessages((prev) => [...prev, botMsg]);
      saveMessage('assistant', reply);
    } catch {
      const botMsg: Msg = {
        id: Math.random().toString(),
        role: 'bot',
        text: 'Sorry, abhi connect nahi ho pa raha 🙏\n\nThodi der mein dobara try karein, ya WhatsApp par poochein.',
        time: timeStr(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setTyping(false);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Namaste! Mujhe help chahiye 🙏')}`).catch(() => {});
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primaryDark }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.avatar}>
            <AppText style={{ fontSize: 22 }}>🌸</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading" color="#fff">
              Ananya AI
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              {typing ? 'Typing…' : 'Online • 24x7 Help'}
            </AppText>
          </View>
          <Pressable onPress={openWhatsApp} style={[styles.whatsBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <AppText variant="captionBold" color="#fff">
              💬
            </AppText>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            const isAdmin = item.role === 'admin';
            return (
              <View style={[styles.msgRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isUser ? theme.primary : isAdmin ? theme.tintPurple.bg : theme.cardBg,
                      borderColor: isAdmin ? theme.tintPurple.border : theme.border,
                      maxWidth: '82%',
                    },
                  ]}>
                  {isAdmin ? (
                    <AppText variant="tiny" color={theme.tintPurple.text} style={{ marginBottom: 2 }}>
                      {item.senderLabel}
                    </AppText>
                  ) : null}
                  <AppText variant="body" color={isUser ? '#fff' : theme.text} style={{ lineHeight: 20 }}>
                    {item.text}
                  </AppText>
                  {item.time ? (
                    <AppText variant="tiny" color={isUser ? 'rgba(255,255,255,0.7)' : theme.muted} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                      {item.time}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            typing ? (
              <View style={[styles.bubble, { backgroundColor: theme.cardBg, borderColor: theme.border, alignSelf: 'flex-start', marginTop: 6 }]}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ananya se poochein…"
            placeholderTextColor={theme.muted}
            multiline
            style={[styles.chatInput, { backgroundColor: theme.light, borderColor: theme.border, color: theme.dark }]}
          />
          <Pressable onPress={send} disabled={!input.trim() || typing} style={[styles.sendBtn, { backgroundColor: input.trim() && !typing ? theme.primary : theme.muted }]}>
            <AppText variant="bodyBold" color="#fff" style={{ fontSize: 16 }}>
              ➤
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  whatsBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
