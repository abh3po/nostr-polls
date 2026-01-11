// utils/secureKeyStorage.ts
import { Preferences } from "@capacitor/preferences";

const NSEC_KEY = "nostr_nsec";

export async function saveNsec(nsec: string) {
  await Preferences.set({
    key: NSEC_KEY,
    value: nsec,
  });
}

export async function getNsec(): Promise<string | null> {
  const { value } = await Preferences.get({ key: NSEC_KEY });
  return value;
}

export async function removeNsec() {
  await Preferences.remove({ key: NSEC_KEY });
}
