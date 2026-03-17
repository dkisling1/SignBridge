import { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock, Folder, FolderOpen, FolderPlus, Pencil, Trash2, Check, X,
  Languages, BookOpen, AlertTriangle, Search, Move
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: number;
  userId: number;
  folderId: number | null;
  type: string;
  query: string;
  result: any;
  title: string;
  createdAt: string;
}

interface FolderItem {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

const MAX_SEARCHES = 100;

function useHistoryData() {
  const [searches, setSearches] = useState<SearchItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSearches(data.searches ?? []);
        setFolders(data.folders ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { searches, folders, setSearches, setFolders, loading, refresh };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function InlineEdit({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const save = () => {
    if (draft.trim()) onSave(draft.trim());
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm font-medium text-foreground focus:outline-none"
        />
        <button onClick={save} className="p-0.5 text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn("group flex items-center gap-1 text-left min-w-0 hover:text-primary transition-colors", className)}
    >
      <span className="truncate text-sm font-medium">{value}</span>
      <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

function FolderRow({ folder, selected, onSelect, onRename, onDelete }: {
  folder: FolderItem; selected: boolean;
  onSelect: () => void; onRename: (name: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => { if (draft.trim()) onRename(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(folder.name); setEditing(false); };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
        selected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={() => { if (!editing) onSelect(); }}
    >
      {selected ? <FolderOpen className="w-4 h-4 shrink-0" /> : <Folder className="w-4 h-4 shrink-0" />}
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm focus:outline-none"
          />
          <button onClick={save} className="p-0.5 text-primary"><Check className="w-3 h-3" /></button>
          <button onClick={cancel} className="p-0.5 text-muted-foreground"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate">{folder.name}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setEditing(true); }} className="p-1 hover:text-foreground rounded" title="Rename">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1 hover:text-destructive rounded" title="Delete folder">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SearchCard({ item, folders, onRename, onDelete, onMove }: {
  item: SearchItem; folders: FolderItem[];
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, folderId: number | null) => void;
}) {
  const [showMove, setShowMove] = useState(false);

  const currentFolder = folders.find(f => f.id === item.folderId);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={item.title}
            onSave={v => onRename(item.id, v)}
            className="text-foreground"
          />
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.query}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowMove(v => !v)}
              title="Move to folder"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            {showMove && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors", !item.folderId && "text-primary font-medium")}
                  onClick={() => { onMove(item.id, null); setShowMove(false); }}
                >
                  No folder
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2", item.folderId === f.id && "text-primary font-medium")}
                    onClick={() => { onMove(item.id, f.id); setShowMove(false); }}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onDelete(item.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          item.type === "translate" ? "bg-primary/10 text-primary" : "bg-topic/10 text-topic"
        )}>
          {item.type === "translate" ? <Languages className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
          {item.type === "translate" ? "Translate" : "Dictionary"}
        </span>
        {currentFolder && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            <Folder className="w-3 h-3" />
            {currentFolder.name}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{formatDate(item.createdAt)}</span>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { searches, folders, setSearches, setFolders, loading } = useHistoryData();
  const [selectedFolder, setSelectedFolder] = useState<number | "all">("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [filter, setFilter] = useState("");
  const newFolderRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingFolder) newFolderRef.current?.focus(); }, [addingFolder]);

  const visibleSearches = searches.filter(s => {
    const matchesFolder = selectedFolder === "all" || s.folderId === selectedFolder;
    const matchesFilter = !filter || s.title.toLowerCase().includes(filter.toLowerCase()) || s.query.toLowerCase().includes(filter.toLowerCase());
    return matchesFolder && matchesFilter;
  });

  const count = searches.length;
  const nearLimit = count >= 90;
  const atLimit = count >= MAX_SEARCHES;

  const handleRename = async (id: number, title: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSearches(prev => prev.map(s => s.id === id ? updated : s));
      }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setSearches(prev => prev.filter(s => s.id !== id));
    } catch {}
  };

  const handleMove = async (id: number, folderId: number | null) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSearches(prev => prev.map(s => s.id === id ? updated : s));
      }
    } catch {}
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/history/folders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders(prev => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
        setNewFolderName("");
        setAddingFolder(false);
      }
    } catch {}
  };

  const handleRenameFolder = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/history/folders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFolders(prev => prev.map(f => f.id === id ? updated : f).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {}
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm("Delete this folder? Searches inside will be moved to All Searches.")) return;
    try {
      const res = await fetch(`/api/history/folders/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setFolders(prev => prev.filter(f => f.id !== id));
        setSearches(prev => prev.map(s => s.folderId === id ? { ...s, folderId: null } : s));
        if (selectedFolder === id) setSelectedFolder("all");
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-primary" />
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Search <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-topic">History</span>
          </h2>
          <p className="text-muted-foreground text-sm">{count} of {MAX_SEARCHES} searches saved</p>
        </div>
      </div>

      {atLimit && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">History is full</p>
            <p className="text-sm opacity-90">You've reached the 100-search limit. Delete some searches to make room for new ones.</p>
          </div>
        </div>
      )}
      {!atLimit && nearLimit && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">{MAX_SEARCHES - count} search slots remaining — consider deleting old entries.</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 space-y-1">
          <button
            onClick={() => setSelectedFolder("all")}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              selectedFolder === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>All Searches</span>
            <span className="ml-auto text-xs opacity-70">{searches.length}</span>
          </button>

          {folders.map(f => (
            <FolderRow
              key={f.id}
              folder={f}
              selected={selectedFolder === f.id}
              onSelect={() => setSelectedFolder(f.id)}
              onRename={name => handleRenameFolder(f.id, name)}
              onDelete={() => handleDeleteFolder(f.id)}
            />
          ))}

          {addingFolder ? (
            <div className="flex items-center gap-1 px-3 py-2">
              <input
                ref={newFolderRef}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setAddingFolder(false); setNewFolderName(""); } }}
                placeholder="Folder name"
                className="flex-1 min-w-0 text-sm bg-transparent border-b border-primary focus:outline-none"
              />
              <button onClick={handleCreateFolder} className="p-0.5 text-primary"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setAddingFolder(false); setNewFolderName(""); }} className="p-0.5 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingFolder(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New folder</span>
            </button>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search history…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
              Loading history…
            </div>
          ) : visibleSearches.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Clock className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-medium">{filter ? "No matching searches" : "No searches yet"}</p>
              {!filter && <p className="text-sm">Your translation and dictionary searches will appear here automatically.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSearches.map(item => (
                <SearchCard
                  key={item.id}
                  item={item}
                  folders={folders}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onMove={handleMove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

