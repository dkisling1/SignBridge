import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { apiFetch } from "@/constants/api";

type PickSource = "camera" | "gallery";

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<any>(null);

  const pickImage = useCallback(async (source: PickSource) => {
    setError("");
    setExtractedText("");
    setTranslation(null);

    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setError("Camera permission required to scan text.");
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setError("Gallery permission required to pick an image.");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            base64: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            base64: false,
          });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setLoading(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = asset.mimeType || "image/jpeg";
      const res = await apiFetch("/ocr", {
        method: "POST",
        body: JSON.stringify({ image: base64, mimeType }),
      });
      if (!res.ok) throw new Error("OCR failed");
      const data = await res.json();
      setExtractedText(data.text || "");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError("Could not extract text from image. Please try another image.");
    } finally {
      setLoading(false);
    }
  }, []);

  const translateExtracted = useCallback(async () => {
    if (!extractedText.trim()) return;
    setError("");
    setTranslating(true);
    try {
      const res = await apiFetch("/translate", {
        method: "POST",
        body: JSON.stringify({ text: extractedText.trim() }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setTranslation(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  }, [extractedText]);

  const reset = () => {
    setImageUri(null);
    setExtractedText("");
    setTranslation(null);
    setError("");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
      >
        <Text style={[styles.heading, { color: colors.text }]}>Scan & Translate</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Extract text from photos, then translate to ASL
        </Text>

        {!imageUri ? (
          <View style={styles.pickSection}>
            <Pressable
              style={({ pressed }) => [
                styles.pickCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => pickImage("camera")}
            >
              <View style={[styles.pickIconCircle, { backgroundColor: isDark ? "#0A3D37" : "#CCFBF1" }]}>
                <Feather name="camera" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.pickTitle, { color: colors.text }]}>Take a Photo</Text>
              <Text style={[styles.pickDesc, { color: colors.textSecondary }]}>
                Use your camera to capture text
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.pickCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => pickImage("gallery")}
            >
              <View style={[styles.pickIconCircle, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="image" size={28} color={colors.textSecondary} />
              </View>
              <Text style={[styles.pickTitle, { color: colors.text }]}>Choose from Gallery</Text>
              <Text style={[styles.pickDesc, { color: colors.textSecondary }]}>
                Pick an existing photo
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.imageSection}>
            <View style={styles.imageHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Scanned Image
              </Text>
              <Pressable onPress={reset} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Feather name="refresh-ccw" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          </View>
        )}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? "#2D0000" : "#FEF2F2" }]}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {loading && (
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Extracting text…
            </Text>
          </View>
        )}

        {extractedText && !loading && (
          <View style={[styles.textCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.textCardHeader}>
              <View style={styles.textLabelRow}>
                <Feather name="type" size={14} color={colors.textMuted} />
                <Text style={[styles.textCardLabel, { color: colors.textMuted }]}>
                  Extracted Text
                </Text>
              </View>
            </View>
            <Text style={[styles.extractedText, { color: colors.text }]}>{extractedText}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.translateBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={translateExtracted}
              disabled={translating}
            >
              {translating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="arrow-right-circle" size={18} color="#fff" />
                  <Text style={styles.translateBtnText}>Translate to ASL</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {translation && translation.sentences && (
          <View style={styles.results}>
            {translation.sentences.map((sent: any, i: number) => (
              <View key={i}>
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
                {sent.notes && (
                  <View style={[styles.resultCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, marginTop: 8, flexDirection: "row", gap: 8 }]}>
                    <Feather name="info" size={14} color={colors.textSecondary} />
                    <Text style={[styles.resultPhrase, { color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" }]}>{sent.notes}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 24 },
  pickSection: { gap: 16 },
  pickCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  pickIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pickTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  pickDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  imageSection: { marginBottom: 16, gap: 10 },
  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  textCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 14, marginBottom: 16 },
  textCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  textLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  textCardLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  extractedText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  translateBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  results: { gap: 12 },
  resultCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  resultBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  resultBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  resultPhrase: { fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 26 },
  signsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  signChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  signChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
