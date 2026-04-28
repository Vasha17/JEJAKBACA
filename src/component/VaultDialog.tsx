import { useState, useEffect } from "react";
import { Lock, KeyRound } from "lucide-react";
import { setVaultPin, verifyVaultPin, hasVaultPin, unlockVaultSession } from "@/lib/vaultUtils";
import { useAuth } from "@/component/Auth";
import { useIsMobile } from "@/hooks/use-mobile";

interface VaultDialogProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  mode?: "unlock" | "change";
}

export function VaultDialog({ open, onClose, onUnlocked, mode: propMode }: VaultDialogProps) {
  const { user } = useAuth();
  const userId = user?.id;

  type DialogMode = "check" | "unlock" | "setup" | "confirm" | "change-old" | "change-new" | "change-confirm";

  const [mode, setMode] = useState<DialogMode>("check");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    setPin(""); setNewPin(""); setError(""); setMode("check");

    (async () => {
      const hasPIN = await hasVaultPin(userId);
      if (propMode === "change") {
        setMode(hasPIN ? "change-old" : "setup");
      } else {
        setMode(hasPIN ? "unlock" : "setup");
      }
    })();
  }, [open, userId, propMode]);

  const handleNumpad = (num: number | "⌫") => {
    setError("");
    if (num === "⌫") {
      setPin(p => p.slice(0, -1));
      return;
    }
    setPin(p => p.length < 4 ? p + num : p);
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        handleNumpad("⌫");
      } else if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        handleNumpad(Number(event.key));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, mode]);

  // Auto-advance when 4 digits entered
  useEffect(() => {
    if (pin.length !== 4) return;
    const timer = setTimeout(() => {
      if (mode === "unlock") handleUnlock();
      else if (mode === "setup") handleSetup();
      else if (mode === "confirm") handleConfirm();
      else if (mode === "change-old") handleChangeOld();
      else if (mode === "change-new") handleChangeNew();
      else if (mode === "change-confirm") handleChangeConfirm();
    }, 120);
    return () => clearTimeout(timer);
  }, [pin, mode]);

  const handleUnlock = async () => {
    if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
    setLoading(true);
    const ok = await verifyVaultPin(pin, userId);
    setLoading(false);
    if (ok) { unlockVaultSession(); onUnlocked(); onClose(); }
    else { setError("Wrong PIN, try again"); setPin(""); }
  };

  const handleSetup = () => {
    if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
    setNewPin(pin);
    setPin("");
    setMode("confirm");
  };

  const handleConfirm = async () => {
    if (pin !== newPin) { setError("PINs don't match"); setPin(""); return; }
    setLoading(true);
    await setVaultPin(pin, userId);
    setLoading(false);
    unlockVaultSession();
    onUnlocked();
    onClose();
  };

  const handleChangeOld = async () => {
    if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
    const ok = await verifyVaultPin(pin, userId);
    if (!ok) { setError("Wrong current PIN"); setPin(""); return; }
    setPin("");
    setMode("change-new");
  };

  const handleChangeNew = () => {
    if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
    setNewPin(pin);
    setPin("");
    setMode("change-confirm");
  };

  const handleChangeConfirm = async () => {
    if (pin !== newPin) { setError("PINs don't match"); setPin(""); return; }
    setLoading(true);
    await setVaultPin(pin, userId);
    setLoading(false);
    onClose();
    alert("PIN changed successfully!");
  };

  if (!open) return null;

  const modeConfig: Record<string, { title: string; sub: string; icon: "lock" | "key" }> = {
    "unlock":         { title: "Hidden Vault",    sub: "Enter PIN to open vault",                  icon: "lock" },
    "setup":          { title: "Set Vault PIN",   sub: "Create a 4-digit PIN to protect hidden stories", icon: "key" },
    "confirm":        { title: "Confirm PIN",     sub: "Enter the same PIN again",                 icon: "key" },
    "change-old":     { title: "Change PIN",      sub: "Enter your current PIN",                   icon: "key" },
    "change-new":     { title: "New PIN",         sub: "Enter your new PIN",                       icon: "key" },
    "change-confirm": { title: "Confirm New PIN", sub: "Repeat your new PIN",                      icon: "key" },
    "check":          { title: "Hidden Vault",    sub: "",                                          icon: "lock" },
  };

  const cfg = modeConfig[mode] ?? modeConfig["check"];

  const PinDots = ({ value }: { value: string }) => (
    <div className="flex items-center justify-center gap-6 my-5">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
          i < value.length
            ? "bg-primary border-primary scale-110"
            : "border-border bg-secondary"
        }`} />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">      
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-[92vw] max-w-[360px] md:max-w-[480px] lg:max-w-[520px] mx-auto bg-card border border-border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">

        {/* Header */}
        <div className="flex flex-col items-center pt-6 pb-2 px-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
            {cfg.icon === "key"
              ? <KeyRound className="w-6 h-6 text-primary" />
              : <Lock className="w-6 h-6 text-primary" />
            }
          </div>
          <h2 className="text-lg font-bold text-foreground">{cfg.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 text-center leading-relaxed">{cfg.sub}</p>
        </div>

        {/* PIN Dots */}
        <div className="px-6 pb-2">
          <PinDots value={pin} />
          {error && (
            <p className="text-center text-xs text-destructive h-4 mt-1 animate-in fade-in duration-200">{error}</p>
          )}
        </div>

        {/* Mobile Keypad */}
        {isMobile && (
          <div className="grid grid-cols-3 gap-2 px-6 py-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((num, i) => (
              <button
                key={i}
                disabled={num === ""}
                onClick={() => {
                  if (num === "⌫") handleNumpad("⌫");
                  else if (num !== "") handleNumpad(num as number);
                }}
                className={`h-14 rounded-2xl text-2xl font-bold transition-all active:scale-95 ${
                  num === "" ? "invisible" :
                  num === "⌫" ? "bg-secondary/50 text-muted-foreground hover:bg-secondary" :
                  "bg-secondary text-foreground hover:bg-muted border border-border/50"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-8 pb-6">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}