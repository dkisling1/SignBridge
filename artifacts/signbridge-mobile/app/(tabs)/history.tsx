import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "@/constants/api";
import Colors from "@/constants/colors";

interface SearchItem {
  id: number;
  folderId: number | null;
  type: string;
  query: string;
  result: any;
  title: string;
  createdAt: string;
}

interface FolderItem {
  id: number;
  name: string;
  createdAt: string;
}

const MAX_SEARCHES = 100;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [searches, setSearches] = useState<SearchItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<number | "all">("all");
  const [filterText, setFilterText] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [moveModal, setMoveModal] = useState<SearchItem | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/history");
      if (res.ok) {
        const data = await res.json();
        setSearches(data.searches ?? []);
        setFolders(data.folders ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const visibleSearches = searches.filter((s) => {
    const matchesFolder = selectedFolder === "all" || s.folderId === selectedFolder;
    const matchesFilter =
      !filterText ||
      s.title.toLowerCase().includes(filterText.toLowerCase()) ||
      s.query.toLowerCase().includes(filterText.toLowerCase());
    return matchesFolder && matchesFilter;
  });

  const count = searches.length;
  const atLimit = count >= MAX_SEARCHES;
  const nearLimit = count >= 90;

  const handleRename = async (id: number, title: string) => {
    try {
      const res = await apiFetch(`/history/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSearches((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } catch {}
    setEditingId(null);
  };

  const handleDelete = (item: SearchItem) => {
    Alert.alert("Delete Search", `Delete "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await apiFetch(`/history/${item.id}`, { method: "DELETE" });
            if (res.ok) setSearches((prev) => prev.filter((s) => s.id !== item.id));
          } catch {}
        },
      },
    ]);
  };

  const handleMove = async (itemId: number, folderId: number | null) => {
    try {
      const res = await apiFetch(`/history/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSearches((prev) => prev.map((s) => (s.id === itemId ? updated : s)));
      }
    } catch {}
    setMoveModal(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await apiFetch("/history/folders", {
        method: "POST",
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {}
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleDeleteFolder = (folder: FolderItem) => {
    Alert.alert(
      "Delete Folder",
      `Delete "${folder.name}"? Searches inside will move to All Searches.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiFetch(`/history/folders/${folder.id}`, { method: "DELETE" });
              if (res.ok) {
                setFolders((prev) => prev.filter((f) => f.id !== folder.id));
                setSearches((prev) =>
                  prev.map((s) => (s.folderId === folder.id ? { ...s, folderId: null } : s))
                );
                if (selectedFolder === folder.id) setSelectedFolder("all");
              }
            } catch {}
          },
        },
      ]
    );
  };

  const s = StyleSheet.create({
    root: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    warning: {
      marginHorizontal: 20,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: atLimit ? "#ff4d4f20" : "#faad1420",
      borderWidth: 1,
      borderColor: atLimit ? "#ff4d4f50" : "#faad1450",
    },
    warningText: {
      fontSize: 12,
      color: atLimit ? "#cf1322" : "#d48806",
      fontWeight: "500",
    },
    searchBar: {
      marginHorizontal: 20,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 12,
      height: 42,
      gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },
    folderScroll: {
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    folderChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      marginRight: 8,
      gap: 6,
      borderWidth: 1,
    },
    folderChipText: { fontSize: 13, fontWeight: "600" },
    addFolderChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderStyle: "dashed",
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 10,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
    },
    cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
    cardQuery: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    badgeRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      gap: 4,
    },
    badgeText: { fontSize: 11, fontWeight: "600" },
    dateText: { fontSize: 11, color: colors.textMuted, marginLeft: "auto" },
    actions: { flexDirection: "row", gap: 4 },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputBg,
    },
    titleInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
    },
    empty: { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
    emptySubText: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingHorizontal: 40 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "#00000060",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 20,
    },
    modalHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    modalOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    modalOptionText: { fontSize: 15, color: colors.text },
    newFolderRow: {
      marginHorizontal: 20,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    newFolderInput: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      height: 38,
      fontSize: 14,
      color: colors.text,
    },
    newFolderBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    newFolderBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  });

  const renderItem = ({ item }: { item: SearchItem }) => {
    const isEditing = editingId === item.id;
    const currentFolder = folders.find((f) => f.id === item.folderId);

    return (
      <View style={s.card}>
        <View style={s.cardRow}>
          {isEditing ? (
            <TextInput
              style={s.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              onSubmitEditing={() => handleRename(item.id, editTitle)}
              returnKeyType="done"
            />
          ) : (
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
          )}
          <View style={s.actions}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => handleRename(item.id, editTitle)}
                >
                  <Feather name="check" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => setEditingId(null)}
                >
                  <Feather name="x" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => { setEditingId(item.id); setEditTitle(item.title); }}
                >
                  <Feather name="edit-2" size={13} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => setMoveModal(item)}
                >
                  <Feather name="folder" size={13} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Feather name="trash-2" size={13} color={colors.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <Text style={s.cardQuery} numberOfLines={1}>
          {item.query}
        </Text>
        <View style={s.badgeRow}>
          <View
            style={[
              s.badge,
              {
                backgroundColor:
                  item.type === "translate"
                    ? `${colors.primary}20`
                    : `${colors.primaryLight}20`,
              },
            ]}
          >
            <Feather
              name={item.type === "translate" ? "layers" : "book-open"}
              size={10}
              color={colors.primary}
            />
            <Text style={[s.badgeText, { color: colors.primary }]}>
              {item.type === "translate" ? "Translate" : "Dictionary"}
            </Text>
          </View>
          {currentFolder && (
            <View style={[s.badge, { backgroundColor: colors.inputBg }]}>
              <Feather name="folder" size={10} color={colors.textMuted} />
              <Text style={[s.badgeText, { color: colors.textMuted }]}>
                {currentFolder.name}
              </Text>
            </View>
          )}
          <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <View style={s.header}>
          <Text style={s.title}>History</Text>
          <Text style={s.subtitle}>
            {count} of {MAX_SEARCHES} searches saved
          </Text>
        </View>
      </View>

      {(atLimit || nearLimit) && (
        <View style={s.warning}>
          <Text style={s.warningText}>
            {atLimit
              ? "History is full — delete searches to save new ones."
              : `${MAX_SEARCHES - count} search slots remaining.`}
          </Text>
        </View>
      )}

      <View style={s.searchBar}>
        <Feather name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          value={filterText}
          onChangeText={setFilterText}
          placeholder="Search history…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
        />
        {filterText.length > 0 && (
          <TouchableOpacity onPress={() => setFilterText("")}>
            <Feather name="x" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Folder chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.folderScroll}
      >
        <Pressable
          style={[
            s.folderChip,
            {
              backgroundColor: selectedFolder === "all" ? colors.primary : colors.inputBg,
              borderColor: selectedFolder === "all" ? colors.primary : colors.inputBorder,
            },
          ]}
          onPress={() => setSelectedFolder("all")}
        >
          <Feather
            name="clock"
            size={13}
            color={selectedFolder === "all" ? "#fff" : colors.textMuted}
          />
          <Text
            style={[
              s.folderChipText,
              { color: selectedFolder === "all" ? "#fff" : colors.textMuted },
            ]}
          >
            All
          </Text>
        </Pressable>

        {folders.map((f) => {
          const active = selectedFolder === f.id;
          return (
            <Pressable
              key={f.id}
              style={[
                s.folderChip,
                {
                  backgroundColor: active ? colors.primary : colors.inputBg,
                  borderColor: active ? colors.primary : colors.inputBorder,
                },
              ]}
              onPress={() => setSelectedFolder(active ? "all" : f.id)}
              onLongPress={() => handleDeleteFolder(f)}
            >
              <Feather name="folder" size={13} color={active ? "#fff" : colors.textMuted} />
              <Text
                style={[s.folderChipText, { color: active ? "#fff" : colors.textMuted }]}
              >
                {f.name}
              </Text>
            </Pressable>
          );
        })}

        {showNewFolder ? (
          <View style={s.newFolderRow}>
            <TextInput
              style={s.newFolderInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFolder}
            />
            <TouchableOpacity style={s.newFolderBtn} onPress={handleCreateFolder}>
              <Text style={s.newFolderBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowNewFolder(false); setNewFolderName(""); }}
            >
              <Feather name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <Pressable
            style={[s.addFolderChip, { borderColor: colors.inputBorder }]}
            onPress={() => setShowNewFolder(true)}
          >
            <Feather name="folder-plus" size={13} color={colors.textMuted} />
          </Pressable>
        )}
      </ScrollView>

      {loading ? (
        <View style={s.empty}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visibleSearches.length === 0 ? (
        <View style={s.empty}>
          <Feather name="clock" size={40} color={colors.textMuted} />
          <Text style={s.emptyText}>{filterText ? "No matching searches" : "No searches yet"}</Text>
          {!filterText && (
            <Text style={s.emptySubText}>
              Your translations and dictionary lookups will appear here automatically.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={visibleSearches}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        />
      )}

      {/* Move to folder modal */}
      <Modal
        visible={!!moveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setMoveModal(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setMoveModal(null)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Move to folder</Text>
            <TouchableOpacity
              style={s.modalOption}
              onPress={() => moveModal && handleMove(moveModal.id, null)}
            >
              <Feather name="inbox" size={18} color={colors.textMuted} />
              <Text
                style={[
                  s.modalOptionText,
                  !moveModal?.folderId && { color: colors.primary, fontWeight: "700" },
                ]}
              >
                No folder
              </Text>
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={s.modalOption}
                onPress={() => moveModal && handleMove(moveModal.id, f.id)}
              >
                <Feather name="folder" size={18} color={colors.textMuted} />
                <Text
                  style={[
                    s.modalOptionText,
                    moveModal?.folderId === f.id && {
                      color: colors.primary,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
