import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Chrome,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  open: boolean;
  urls: string[];
  onClose: () => void;
  onDone: () => void;
}

type Step = "permission" | "tutorial" | "success" | "warning";
type BrowserType = "chrome" | "edge";

const SITE_URL = "https://jejakbaca.vercel.app";
const CHROME_LINK = "chrome://settings/content/popups";
const EDGE_LINK =
  "edge://settings/privacy/sitePermissions/allPermissions/popups";

export function PopupPermissionDialog({
  open,
  urls,
  onClose,
  onDone,
}: Props) {
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>("permission");
  const [blockedCount, setBlockedCount] = useState(0);
  const [selectedBrowser, setSelectedBrowser] =
    useState<BrowserType>("chrome");

  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (open) {
      setStep("permission");
      setSelectedBrowser("chrome");
    }
  }, [open]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);

      setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {}
  };

  const tryOpenTabs = () => {
    let blocked = 0;

    urls.forEach((url) => {
      const win = window.open(url, "_blank", "noopener,noreferrer");

      if (!win || win.closed || typeof win.closed === "undefined") {
        blocked++;
      }
    });

    setBlockedCount(blocked);

    if (blocked === 0) {
      setStep("success");
    } else {
      setStep("warning");
    }
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 120 || info.velocity.y > 700) {
      onClose();
    }
  };

  if (!open) return null;

  const chromeSteps = [
    "Open Settings",
    "Privacy and security → Site settings",
    "Pop-ups and redirects",
    "Under Allowed, click Add",
  ];

  const edgeSteps = [
    "Open Settings",
    "Site permissions",
    "All permissions → Pop-ups and redirects",
    "Under Allow, click Add",
  ];

  const CopyBox = ({
    value,
    color = "primary",
  }: {
    value: string;
    color?: "primary" | "emerald";
  }) => {
    const isGreen = color === "emerald";

    return (
      <button
        onClick={() => copyText(value, value)}
        className={`group mt-1 w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-all hover:scale-[1.01]
        ${
          isGreen
            ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
            : "bg-primary/10 border-primary/20 hover:bg-primary/15"
        }`}
      >
        <code
          className={`text-[11px] font-mono break-all text-left
          ${isGreen ? "text-emerald-400" : "text-primary"}`}
        >
          {value}
        </code>

        <div
          className={`shrink-0 transition-all
          ${isGreen ? "text-emerald-400" : "text-primary"}`}
        >
          {copied === value ? <Check size={15} /> : <Copy size={15} />}
        </div>
      </button>
    );
  };

  const content = (
    <div className="flex flex-col gap-5 py-2">
      {/* PERMISSION */}
      {step === "permission" && (
        <>
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-primary/80" />
            </div>

            <div>
              <h2 className="text-base font-bold text-foreground">
                Enable Pop-ups for JejakBaca
              </h2>

              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                JejakBaca needs pop-up permission to open multiple tabs at
                once.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={tryOpenTabs}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              I Already Enabled It
            </button>

            <button
              onClick={() => setStep("tutorial")}
              className="w-full h-11 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-all active:scale-95"
            >
              How to Enable
            </button>
          </div>
        </>
      )}

      {/* SUCCESS */}
      {step === "success" && (
        <>
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-base font-bold text-foreground">
                All Tabs Opened Successfully
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                {urls.length} tab{urls.length > 1 ? "s" : ""} opened.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onDone();
              onClose();
            }}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-95"
          >
            Ok
          </button>
        </>
      )}

      {/* WARNING */}
      {step === "warning" && (
        <>
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>

            <div>
              <h2 className="text-base font-bold text-foreground">
                Some Tabs Were Blocked
              </h2>

              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Your browser blocked {blockedCount} pop-up
                {blockedCount > 1 ? "s" : ""}. Please allow pop-ups for
                JejakBaca.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setStep("tutorial")}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              Open Tutorial
            </button>

            <button
              onClick={() => {
                onDone();
                onClose();
              }}
              className="w-full h-11 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* TUTORIAL */}
      {step === "tutorial" && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedBrowser("chrome")}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                selectedBrowser === "chrome"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Chrome size={16} />
              Chrome
            </button>

            <button
              onClick={() => setSelectedBrowser("edge")}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                selectedBrowser === "edge"
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe size={16} />
              Edge
            </button>
          </div>

          {/* CHROME */}
          {selectedBrowser === "chrome" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Chrome className="w-4 h-4 text-primary" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Google Chrome
                  </h3>

                  <p className="text-[11px] text-muted-foreground">
                    Allow pop-ups for JejakBaca
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-primary mb-2">
                    Quick Open Settings
                  </p>

                  <CopyBox value={CHROME_LINK} />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-primary mb-2">
                    Paste This Into Allowed
                  </p>

                  <CopyBox value={SITE_URL} />
                </div>
              </div>

              <div className="pt-3 border-t border-border/50">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Manual Steps
                </p>

                <div className="space-y-3">
                  {chromeSteps.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>

                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}

                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      5
                    </span>

                    <span className="text-sm text-muted-foreground leading-relaxed">
                      Paste the copied JejakBaca link
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* EDGE */}
          {selectedBrowser === "edge" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-emerald-400" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Microsoft Edge
                  </h3>

                  <p className="text-[11px] text-muted-foreground">
                    Allow pop-ups for JejakBaca
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-400 mb-2">
                    Quick Open Settings
                  </p>

                  <CopyBox value={EDGE_LINK} color="emerald" />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-emerald-400 mb-2">
                    Paste This Into Allow
                  </p>

                  <CopyBox value={SITE_URL} color="emerald" />
                </div>
              </div>

              <div className="pt-3 border-t border-border/50">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Manual Steps
                </p>

                <div className="space-y-3">
                  {edgeSteps.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>

                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}

                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      5
                    </span>

                    <span className="text-sm text-muted-foreground leading-relaxed">
                      Paste the copied JejakBaca link
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <button
            onClick={() => setStep("permission")}
            className="w-full h-11 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-all active:scale-95"
          >
            ← Back
          </button>
        </>
      )}
    </div>
  );

  /* MOBILE */
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
          />

          <motion.div
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 260,
            }}
            className="relative flex flex-col"
            style={{
              borderRadius: "24px 24px 0 0",
              maxHeight: "92dvh",
              background: "hsl(var(--card))",
              borderTop: "1px solid hsl(var(--border))",
              boxShadow: "0 -24px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* DRAG HANDLE */}
            <div
              className="cursor-grab active:cursor-grabbing"
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 12,
                paddingBottom: 4,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 999,
                  background: "hsl(var(--border))",
                }}
              />
            </div>

            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-primary/90" />
                <span className="font-bold text-[13px]">Open Tabs</span>
              </div>

              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-10">
              {content}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  /* DESKTOP */
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
          }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{
            type: "spring",
            damping: 24,
            stiffness: 280,
          }}
          className="relative w-full max-w-md"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 20,
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-primary/90" />
              <span className="font-bold text-[13px]">Open Tabs</span>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary/80"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 pb-6">
            {content}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}