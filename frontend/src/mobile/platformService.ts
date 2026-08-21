/**
 * platformService.ts
 * Safe platform abstraction layer for Web, Android, iOS, and PWA.
 * Keeps mobile-specific Capacitor functionality encapsulated without breaking browser functionality.
 */

export interface PlatformInfo {
  isWeb: boolean;
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  platform: "web" | "android" | "ios";
}

class PlatformService {
  /**
   * Detect current execution platform safely
   */
  public getPlatformInfo(): PlatformInfo {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isCapacitorNative =
      typeof (window as any).Capacitor !== "undefined" &&
      typeof (window as any).Capacitor.isNativePlatform === "function" &&
      (window as any).Capacitor.isNativePlatform();

    const isAndroid = isCapacitorNative
      ? (window as any).Capacitor.getPlatform() === "android"
      : /android/.test(userAgent);

    const isIOS = isCapacitorNative
      ? (window as any).Capacitor.getPlatform() === "ios"
      : /iphone|ipad|ipod/.test(userAgent);

    const isNative = isCapacitorNative;
    const isWeb = !isNative;

    return {
      isWeb,
      isNative,
      isAndroid,
      isIOS,
      platform: isIOS ? "ios" : isAndroid ? "android" : "web",
    };
  }

  public isWeb(): boolean {
    return this.getPlatformInfo().isWeb;
  }

  public isNative(): boolean {
    return this.getPlatformInfo().isNative;
  }

  public isAndroid(): boolean {
    return this.getPlatformInfo().isAndroid;
  }

  public isIOS(): boolean {
    return this.getPlatformInfo().isIOS;
  }

  /**
   * Automatically resolve the API Base URL.
   * On mobile devices / physical phones, prevents hitting 'localhost' on the phone itself.
   */
  public getApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }

    if (typeof window !== "undefined" && window.location) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:8000/api/v1`;
      }
    }

    return envUrl || "http://localhost:8000/api/v1";
  }

  /**
   * Native Share or Web Share Fallback
   */
  public async share(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Safe Storage Fallback (Native Preferences vs Browser LocalStorage)
   */
  public getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("[PlatformService] Failed to set item:", e);
    }
  }

  public removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("[PlatformService] Failed to remove item:", e);
    }
  }
}

export const platformService = new PlatformService();
export default platformService;
