import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { apiFetch } from "@/constants/api";

interface TranslationSentence {
  original: string;
  topic: string;
  comment: string;
  aslStructure: string;
  structureType: string;
  notes?: string;
}

interface TranslationResult {
  sentences: TranslationSentence[];
  summary?: string;
}

export default function TranslateScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [input, setInput] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Microphone permission required for voice input.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      startPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      setError("Could not start recording.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    stopPulse();
    setRecording(null);
    setTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error("No recording URI");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await apiFetch("/transcribe", {
        method: "POST",
        body: JSON.stringify({ audio: base64, mimeType: "audio/m4a" }),
      });
      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      setInput(data.text || "");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError("Could not transcribe audio. Please try again.");
    } finally {
      setTranscribing(false);
    }
  }, [recording]);

  const translate = useCallback(async () => {
    if (!input.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/translate", {
        method: "POST",
        body: JSON.stringify({ text: input.trim() }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError("Translation failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
      >
        <Text style={[styles.heading, { color: colors.text }]}>Translate to ASL</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Enter English text or use your voice
        </Text>

        <View
          style={[
            styles.inputCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type English here…"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            returnKeyType="default"
          />
          <View style={styles.inputActions}>
            {input.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => { setInput(""); setResult(null); }}
              >
                <Feather name="x" size={16} color={colors.textMuted} />
              </Pressable>
            )}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={({ pressed }) => [
                  styles.micBtn,
                  {
                    backgroundColor: recording
                      ? colors.error
                      : transcribing
                      ? colors.surfaceSecondary
                      : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={recording ? stopRecording : startRecording}
                disabled={transcribing}
              >
                {transcribing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name={recording ? "square" : "mic"} size={18} color="#fff" />
                )}
              </Pressable>
            </Animated.View>
          </View>
          {recording && (
            <Text style={[styles.listeningText, { color: colors.error }]}>
              Listening… tap to stop
            </Text>
          )}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? "#2D0000" : "#FEF2F2" }]}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.translateBtn,
            {
              backgroundColor: input.trim() ? colors.primary : colors.surfaceSecondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={translate}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="arrow-right-circle" size={20} color={!input.trim() ? colors.textMuted : "#fff"} />
              <Text
                style={[
                  styles.translateBtnText,
                  { color: !input.trim() ? colors.textMuted : "#fff" },
                ]}
              >
                Translate
              </Text>
            </>
          )}
        </Pressable>

        {result && result.sentences && (
          <View style={styles.results}>
            {result.sentences.map((sent, i) => (
              <View key={i}>
                {result.sentences.length > 1 && (
                  <Text style={[styles.sentenceLabel, { color: colors.textMuted }]}>
                    {sent.original}
                  </Text>
                )}
                <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={[styles.resultBadge, { backgroundColor: isDark ? "#3B1F6B" : "#EDE9FE" }]}>
                    <Text style={[styles.resultBadgeText, { color: colors.topic }]}>TOPIC</Text>
                  </View>
                  <Text style={[styles.resultPhrase, { color: colors.topic }]}>{sent.topic}</Text>
                </View>
                <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 8 }]}>
                  <View style={[styles.resultBadge, { backgroundColor: isDark ? "#052E1C" : "#DCFCE7" }]}>
                    <Text style={[styles.resultBadgeText, { color: colors.comment }]}>COMMENT</Text>
                  </View>
                  <Text style={[styles.resultPhrase, { color: colors.comment }]}>{sent.comment}</Text>
                </View>
                {sent.notes ? (
                  <View style={[styles.notesCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, marginTop: 8 }]}>
                    <Feather name="info" size={14} color={colors.textSecondary} />
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>{sent.notes}</Text>
                  </View>
                ) : null}
              </View>
            ))}
            {result.summary && (
              <View style={[styles.notesCard, { backgroundColor: isDark ? "#0A3D37" : "#CCFBF1", borderColor: colors.primary }]}>
                <Feather name="book-open" size={14} color={colors.primary} />
                <Text style={[styles.notesText, { color: colors.primary }]}>{result.summary}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  heading: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  inputCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  textInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    lineHeight: 24,
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  clearBtn: {
    padding: 6,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  listeningText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginBottom: 24,
  },
  translateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  results: { gap: 12 },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  resultBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  resultBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  resultPhrase: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 26,
  },
  signsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  signChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  signChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  notesCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  sentenceLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 20,
  },
});
