import { useState, useRef } from "react";
import {
  BookOpen, User, X, ChevronRight, Camera, Edit, Palette,
  Sun, Moon, Keyboard, HardDrive, FileDown, FileUp,
} from "lucide-react";
import { ImportDialog } from "@/component/ImportDialog";
import { ExportDialog } from "@/component/ExportDialog";
import { ThemePicker } from "@/component/ThemePicker";
import { useTheme } from "@/contexts/ThemeContext";

interface ProfileSidebarProps {
  open: boolean;
  onClose: () => void;
  storiesCount: number;
  onExport: () => void;
  onImport: () => void;
  onOpenShortcuts?: () => void;
}

export function ProfileSidebar({
  open, onClose, storiesCount, onExport, onImport, onOpenShortcuts,
}: ProfileSidebarProps) {
  const { mode, setMode, currentTheme } = useTheme();
  const [backupOpen, setBackupOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [username, setUsername] = useState("username");
  const [editUsername, setEditUsername] = useState("username");
  const [avatarUrl, setAvatarUrl] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Get current accent colors for preview dots
  const lightPrimary = currentTheme.light.primary;
  const darkPrimary = currentTheme.dark.primary;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-lg font-bold text-foreground">Profile</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile Card */}
          <div className="mx-5 mt-5 rounded-2xl overflow-hidden border border-border bg-card">
            {/* Card top strip */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: currentTheme[mode].primary }}>
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-primary-foreground" />
                <span className="text-xs font-bold tracking-wider text-primary-foreground">JejakBaca</span>
              </div>
              <span className="text-[10px] font-semibold tracking-widest text-primary-foreground/70 uppercase">
                Member Card
              </span>
            </div>

            {/* Avatar + info */}
            <div className="px-4 py-4 flex items-center gap-3">
              <button onClick={() => setEditProfileOpen(true)} className="relative shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 border-border">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-3 text-muted-foreground" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-primary">
                  <Camera size={10} className="text-primary-foreground" />
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">@{username}</p>
                <p className="text-[11px] text-muted-foreground">Member since Feb 2024</p>
                <p className="text-[11px] font-semibold text-primary mt-0.5">
                  <BookOpen size={11} className="inline mr-1" />{storiesCount} stories
                </p>
              </div>

              <button
                onClick={() => setEditProfileOpen(true)}
                className="p-1.5 rounded-lg bg-secondary hover:bg-muted transition-colors border border-border"
              >
                <Edit size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Edit Profile */}
          {editProfileOpen && (
            <div className="mx-5 mt-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground">Edit Profile</span>
                <button onClick={() => setEditProfileOpen(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Username</label>
                  <input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Avatar</label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary border border-border">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-2 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <Camera size={12} /> Upload
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAvatarUrl(URL.createObjectURL(f));
                      }}
                    />
                  </div>
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <button
                  onClick={() => { setUsername(editUsername); setEditProfileOpen(false); }}
                  className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="mt-5 mx-5 rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {/* Appearance */}
            <div>
              <div className="px-4 py-3 flex items-center gap-3">
                <Palette size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Appearance</span>
              </div>

              <div className="px-4 pb-3 space-y-3">
                {/* Light / Dark toggle */}
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">Mode</span>
                  <div className="flex bg-secondary rounded-xl p-1">
                    <button
                      onClick={() => setMode("light")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        mode === "light"
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun size={13} /> Light
                    </button>
                    <button
                      onClick={() => setMode("dark")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        mode === "dark"
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Moon size={13} /> Dark
                    </button>
                  </div>
                </div>

                {/* Theme Colors */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Theme Colors</span>
                    <button
                      onClick={() => setThemePickerOpen(true)}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                    >
                      Change <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: currentTheme[mode].background }} />
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: currentTheme[mode].foreground }} />
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: currentTheme[mode].primary }} />
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: currentTheme[mode].secondary }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sync & Backup */}
            <div>
              <button
                onClick={() => setBackupOpen(!backupOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <HardDrive size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Sync & Backup</span>
                <ChevronRight size={14} className={`text-muted-foreground transition-transform ${backupOpen ? "rotate-90" : ""}`} />
              </button>

              {backupOpen && (
                <div className="space-y-1">
                  {/* Sync Status */}
                  <div className="px-4 py-2">
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1">Cloud Sync</div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Local: <span className="font-bold text-foreground">{storiesCount}</span></span>
                      <span className="text-primary font-semibold">0 cloud</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1 mt-1">
                      <div className="bg-primary h-1 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  
                  {/* Sync Button */}
                  <button
                    onClick={async () => {
                      try {
                        const { signInWithGoogle } = await import('@/component/Auth').then(m => m.useAuth());
                        const stories = await import('@/lib/StoryContext').then(m => m.useStories());
                        await stories.triggerSync();
                      } catch (e) {
                        // Login dialog handled by triggerSync error
                      }
                    }}
                    className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-primary/10 border-t border-border/50 text-left text-sm font-semibold text-primary hover:text-primary-foreground transition-all"
                  >
                    ↻ Sync Now
                  </button>

                  {/* Backup buttons */}
                  <button
                    onClick={() => setImportOpen(true)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/50 transition-colors"
                  >
                    <FileUp size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">Import Progress</span>
                  </button>
                  <button
                    onClick={() => setExportOpen(true)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-secondary/50 transition-colors"
                  >
                    <FileDown size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">Export Progress</span>
                  </button>
                </div>
              )}
            </div>

            {/* Shortcuts */}
            <div>
              <button
                onClick={() => onOpenShortcuts?.()}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <Keyboard size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left">Shortcuts</span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <button className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      {/* Theme Picker */}
      <ThemePicker open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />

      {/* Sub-dialogs */}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} onExport={(fmt) => { if (fmt === "json") onExport(); }} />
    </>
  );
}
