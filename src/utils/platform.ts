// utils/platform.ts
import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();

export function isAndroidNative() {
  return Capacitor.getPlatform() === "android";
}

export function getAppBaseUrl(): string {
  if (isAndroidNative()) {
    return "https://pollerama.fun";
  }
  return window.location.origin;
}
