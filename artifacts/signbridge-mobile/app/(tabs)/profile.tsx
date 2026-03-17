import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string; bgDark: string }> = {
  master: { label: "Master", color: "#DC2626", bg: "#FEE2E2", bgDark: "#3B0000" },
  admin: { label: "Admin", color: "#D97706", bg: "#FEF3C7", bgDark: "#2D1700" },
  user: { label: "User", color: "#0D9488", bg: "#CCFBF1", bgDark: "#0A3D37" },
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const roleInfo = user ? (ROLE_LABELS[user.role] || ROLE_LABELS.user) : ROLE_LABELS.user;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await logout();
            router.replace("/login");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "SB";

  const features = [
    { icon: "message-square", label: "English → ASL Translation", desc: "Topic-Comment structure" },
    { icon: "book-open", label: "ASL Dictionary", desc: "Sourced from ASLBloom + AI" },
    { icon: "mic", label: "Voice Input", desc: "Speak to translate or search" },
    { icon: "camera", label: "OCR Scanner", desc: "Extract text from photos" },
  ];

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
        <Text style={[styles.heading, { color: colors.text }]}>Profile</Text>

        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              {user?.username || "—"}
            </Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: isDark ? roleInfo.bgDark : roleInfo.bg },
              ]}
            >
              <Text style={[styles.roleText, { color: roleInfo.color }]}>
                {roleInfo.label}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Features
        </Text>
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {features.map((f, i) => (
            <View key={f.icon}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: isDark ? "#0A3D37" : "#CCFBF1" }]}>
                  <Feather name={f.icon as any} size={18} color={colors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
                </View>
                <Feather name="check-circle" size={16} color={colors.primary} />
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          About
        </Text>
        <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.aboutRow}>
            <Feather name="eye" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.aboutTitle, { color: colors.text }]}>SignBridge</Text>
              <Text style={[styles.aboutDesc, { color: colors.textSecondary }]}>
                ASL Learning & Translation Platform
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.aboutMetaRow}>
            <Text style={[styles.aboutMeta, { color: colors.textMuted }]}>Version</Text>
            <Text style={[styles.aboutMeta, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.aboutMetaRow}>
            <Text style={[styles.aboutMeta, { color: colors.textMuted }]}>Dictionary Source</Text>
            <Text style={[styles.aboutMeta, { color: colors.textSecondary }]}>ASLBloom + OpenAI</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: isDark ? "#2D0000" : "#FEF2F2",
              borderColor: colors.error,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Feather name="log-out" size={18} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  userInfo: { gap: 6 },
  username: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 4,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, marginHorizontal: 14 },
  aboutCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 4,
    marginBottom: 28,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  aboutTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  aboutDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  aboutMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  aboutMeta: { fontSize: 14, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
