import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
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

import Colors from "@/constants/colors";
import { apiFetch } from "@/constants/api";

interface DictionaryExample {
  english: string;
  topic: string;
  comment: string;
  aslStructure: string;
  structureType: string;
  notes?: string;
}

interface SignEntry {
  word: string;
  partOfSpeech?: string;
  definition: string;
  aslSign?: string;
  examples?: DictionaryExample[];
}

export default function DictionaryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SignEntry | null>(null);
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
      const word = (data.text || "").trim().split(/\s+/)[0];
      setQuery(word);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError("Could not transcribe audio. Please try again.");
    } finally {
      setTranscribing(false);
    }
  }, [recording]);

  const lookup = useCallback(async () => {
    const word = query.trim().split(/\s+/)[0];
    if (!word) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/dictionary", {
        method: "POST",
        body: JSON.stringify({ word: word.toLowerCase() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lookup failed");
      }
      const data = await res.json();
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      apiFetch("/history", {
        method: "POST",
        body: JSON.stringify({ type: "dictionary", query: data.word ?? word, result: data }),
      }).catch(() => {});
    } catch (e: any) {
      setError(e.message || "Could not look up this word.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const Field = ({
    icon,
    label,
    value,
  }: {
    icon: string;
    label: string;
    value: string;
  }) => (
    <View style={styles.fieldRow}>
      <View style={styles.fieldHeader}>
        <Feather name={icon as any} size={14} color={colors.textMuted} />
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

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
        <Text style={[styles.heading, { color: colors.text }]}>ASL Dictionary</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Look up any sign by word
        </Text>

        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search a word…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={lookup}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setResult(null); }}>
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
                <Feather name={recording ? "square" : "mic"} size={16} color="#fff" />
              )}
            </Pressable>
          </Animated.View>
          <Pressable
            style={({ pressed }) => [
              styles.searchBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={lookup}
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="arrow-right" size={16} color="#fff" />
            )}
          </Pressable>
        </View>

        {recording && (
          <Text style={[styles.listeningText, { color: colors.error }]}>
            Listening… tap to stop
          </Text>
        )}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? "#2D0000" : "#FEF2F2" }]}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {result && (
          <View style={{ gap: 12 }}>
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.wordTitle, { color: colors.text }]}>{result.word}</Text>
                {result.partOfSpeech && (
                  <View style={[styles.aslBadge, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                    <Text style={[styles.aslBadgeText, { color: colors.textSecondary }]}>
                      {result.partOfSpeech}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {result.definition}
              </Text>

              {result.aslSign && (
                <View style={[styles.fieldSection, { borderColor: colors.border }]}>
                  <Field icon="eye" label="How to Sign" value={result.aslSign} />
                </View>
              )}
            </View>

            {result.examples && result.examples.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.examplesTitle, { color: colors.textMuted }]}>
                  EXAMPLE SENTENCES
                </Text>
                {result.examples.map((ex, i) => (
                  <View
                    key={i}
                    style={[
                      styles.exampleCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <Text style={[styles.exampleEnglish, { color: colors.textSecondary }]}>
                      {ex.english}
                    </Text>
                    <View style={styles.aslGlossRow}>
                      <View style={[styles.topicChip, { backgroundColor: isDark ? "#2A1857" : "#EDE9FE" }]}>
                        <Text style={[styles.topicChipText, { color: colors.topic }]}>{ex.topic}</Text>
                      </View>
                      <View style={[styles.commentChip, { backgroundColor: isDark ? "#052E1C" : "#DCFCE7" }]}>
                        <Text style={[styles.commentChipText, { color: colors.comment }]}>{ex.comment}</Text>
                      </View>
                    </View>
                    {ex.notes && (
                      <Text style={[styles.exampleNotes, { color: colors.textMuted }]}>{ex.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {!result && !loading && !error && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="book-open" size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Search the dictionary
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Type or speak a word to find its ASL sign description
            </Text>
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  micBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  listeningText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textTransform: "capitalize",
  },
  aslBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aslBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  fieldSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  fieldRow: {
    gap: 4,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    paddingLeft: 19,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 14,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 280,
  },
  examplesTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 2,
  },
  exampleCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  exampleEnglish: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    fontStyle: "italic",
  },
  aslGlossRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topicChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  commentChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commentChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  exampleNotes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    fontStyle: "italic",
  },
});
