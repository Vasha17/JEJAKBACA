const VAULT_PIN_KEY = "jejakbaca_vault_pin";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "jejakbaca_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function setVaultPin(pin: string, userId?: string): Promise<void> {
  const hashed = await hashPin(pin);
  localStorage.setItem(VAULT_PIN_KEY, hashed);
  if (userId) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("profiles")
        .upsert({ user_id: userId, vault_pin: hashed }, { onConflict: "user_id" });
    } catch (e) {
      console.error("Failed to save PIN to Supabase:", e);
    }
  }
}

export async function verifyVaultPin(pin: string, userId?: string): Promise<boolean> {
  const hashed = await hashPin(pin);
  if (userId) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("profiles")
        .select("vault_pin")
        .eq("user_id", userId)
        .single();
      if (data?.vault_pin) {        
        localStorage.setItem(VAULT_PIN_KEY, data.vault_pin);
        return data.vault_pin === hashed;
      }
    } catch (e) {
      console.error("Supabase PIN fetch failed, fallback localStorage:", e);
    }
  }
  const stored = localStorage.getItem(VAULT_PIN_KEY);
  return stored === hashed;
}

export async function hasVaultPin(userId?: string): Promise<boolean> {
  if (userId) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("profiles")
        .select("vault_pin")
        .eq("user_id", userId)
        .single();
      if (data?.vault_pin) {
        localStorage.setItem(VAULT_PIN_KEY, data.vault_pin);
        return true;
      }
    } catch (e) {
      console.error("Supabase hasVaultPin failed, fallback:", e);
    }
  }
  return !!localStorage.getItem(VAULT_PIN_KEY);
}

export function isVaultUnlocked(): boolean {
  return sessionStorage.getItem("jejakbaca_vault_unlocked") === "true";
}

export function lockVault(): void {
  sessionStorage.removeItem("jejakbaca_vault_unlocked");
}

export function unlockVaultSession(): void {
  sessionStorage.setItem("jejakbaca_vault_unlocked", "true");
}