// utils/platform.ts
import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();

export function isAndroidNative() {
  return Capacitor.getPlatform() === "android";
}
