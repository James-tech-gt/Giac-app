import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { CaseMessage, createAdminNotification, sendCaseMessage, subscribeCaseMessages } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#1F2A44',
  secondary: '#2E4A8A',
  secondarySoft: '#E9EEF8',
  textPrimary: '#1F2A44',
  textSecondary: '#5A6478',
  textMuted: '#7A7F8A',
  border: '#E3E9F2',
};

function formatTime(ts: unknown): string {
  if (!ts) return '';
  const d =
    typeof ts === 'object' && ts !== null && 'toDate' in ts
      ? (ts as any).toDate()
      : new Date(ts as any);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function CaseChatScreen() {
  const { caseId, category, serviceType, userId } = useLocalSearchParams<{
    caseId: string;
    category?: string;
    serviceType?: string;
    userId?: string;
  }>();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!caseId) return;
    return subscribeCaseMessages(caseId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
  }, [caseId]);

  const handleSend = async () => {
    if (!user || !caseId) return;
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setSending(true);
    try {
      await sendCaseMessage(
        caseId,
        user.uid,
        user.displayName ?? user.email ?? 'Client',
        'client',
        msg,
      );
      createAdminNotification({
        type: 'service',
        message: `New message from client in ${serviceType ?? 'mediation'} case (${category ?? ''})`,
        referenceId: caseId,
        userId: user.uid,
      }).catch(() => {});
    } catch {
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const title = serviceType === 'arbitration' ? 'Arbitration' : 'Mediation';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.navigate('/(main)/cases')} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]} hitSlop={8}>
          <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {category ? <Text style={styles.headerSub} numberOfLines={1}>{category}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <FontAwesome6 name="comments" size={32} color={C.textMuted} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyText}>No messages yet.{'\n'}Send a message to your mediator below.</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <View key={msg.id} style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                  {!isMe && (
                    <View style={styles.bubbleAvatar}>
                      <Text style={styles.bubbleAvatarText}>{msg.senderName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {!isMe && <Text style={styles.bubbleSender}>{msg.senderName}</Text>}
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.text}</Text>
                    <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.55)' }]}>
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={C.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!text.trim() || sending) && styles.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <FontAwesome6 name="paper-plane" size={14} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary },
  headerSub: { fontSize: 13, fontFamily: Fonts.sans, color: C.textSecondary },

  scroll: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, flexGrow: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 14, fontFamily: Fonts.sans, color: C.textMuted, textAlign: 'center', lineHeight: 22 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.secondarySoft, alignItems: 'center', justifyContent: 'center',
  },
  bubbleAvatarText: { fontSize: 11, fontFamily: Fonts.sansBold, color: C.secondary },
  bubble: { maxWidth: '76%', borderRadius: 16, padding: 10, gap: 3 },
  bubbleMe: { backgroundColor: C.secondary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 10, fontFamily: Fonts.sansSemiBold, color: C.textMuted },
  bubbleText: { fontSize: 14, fontFamily: Fonts.sans, color: C.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 9, fontFamily: Fonts.sans, color: C.textMuted, alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  input: {
    flex: 1, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: Fonts.sans, color: C.textPrimary, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
