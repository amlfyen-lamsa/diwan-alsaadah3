/**
 * BluetoothAudioService
 * Advanced Bluetooth audio device discovery, pairing, and routing service for Dewan Al Saada.
 * Supports:
 * - HTMLMediaElement setSinkId routing
 * - Native Audio Output Picker (selectAudioOutput)
 * - Auto-sink interceptor on any audio/video element playback
 * - Car Infotainment & Audio System signatures (Toyota, Sync, Uconnect, Car Audio, etc.)
 * - Buffer synchronization & anti-lag reset
 * - Audio verification acoustic Oud test tone
 */

export interface BluetoothAudioDevice {
  id: string;
  name: string;
  type: 'headphone' | 'speaker' | 'car' | 'other';
  connected: boolean;
  isDefault?: boolean;
  batteryLevel?: number;
  isPairedViaWebBt?: boolean;
}

const STORAGE_KEY_DEV_ID = 'dewan_selected_audio_device';
const STORAGE_KEY_DEV_NAME = 'dewan_selected_audio_device_name';

class BluetoothAudioServiceClass {
  private selectedDeviceId: string = 'default';
  private selectedDeviceName: string = 'سماعات الجهاز الافتراضية';
  private hasInstalledGlobalListener = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.selectedDeviceId = localStorage.getItem(STORAGE_KEY_DEV_ID) || 'default';
        this.selectedDeviceName = localStorage.getItem(STORAGE_KEY_DEV_NAME) || 'سماعات الجهاز الافتراضية';
      } catch (_) {}

      // Auto-reapply sink when devices change (e.g. bluetooth headphones or car connected/disconnected)
      if (navigator.mediaDevices?.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', () => {
          this.applyToAllMediaElements();
        });
      }

      this.installGlobalAudioListener();
    }
  }

  /**
   * Global listener intercepting any new media playback to ensure audio routes to the active Bluetooth device
   */
  private installGlobalAudioListener() {
    if (typeof document === 'undefined' || this.hasInstalledGlobalListener) return;
    this.hasInstalledGlobalListener = true;

    document.addEventListener(
      'play',
      (e: Event) => {
        const target = e.target;
        if (target instanceof HTMLMediaElement && this.selectedDeviceId !== 'default') {
          this.applyAudioSink(target, this.selectedDeviceId).catch(() => {});
        }
      },
      true // Capture phase to catch all audio elements early
    );
  }

  public getCurrentDeviceId(): string {
    return this.selectedDeviceId;
  }

  public getCurrentDeviceName(): string {
    return this.selectedDeviceName;
  }

  public isSinkIdSupported(): boolean {
    return typeof window !== 'undefined' && 'HTMLMediaElement' in window && 'setSinkId' in HTMLMediaElement.prototype;
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isSelectAudioOutputSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'mediaDevices' in navigator &&
      typeof (navigator.mediaDevices as any).selectAudioOutput === 'function'
    );
  }

  /**
   * Apply audio output sinkId to a specific HTMLMediaElement with retry protection
   */
  public async applyAudioSink(mediaEl: HTMLMediaElement | null, targetDeviceId?: string): Promise<boolean> {
    if (!mediaEl || !this.isSinkIdSupported()) return false;
    const deviceId = targetDeviceId ?? this.selectedDeviceId;

    try {
      const sinkValue = deviceId === 'default' ? '' : deviceId;
      await (mediaEl as any).setSinkId(sinkValue);
      return true;
    } catch (err) {
      console.warn('[BluetoothAudioService] setSinkId error:', err);
      return false;
    }
  }

  /**
   * Apply sink to all audio and video elements currently in the DOM
   */
  public async applyToAllMediaElements(targetDeviceId?: string): Promise<void> {
    if (typeof document === 'undefined') return;
    const audioElements = document.querySelectorAll<HTMLMediaElement>('audio, video');
    for (const el of Array.from(audioElements)) {
      await this.applyAudioSink(el, targetDeviceId);
    }
  }

  /**
   * Anti-lag and buffer synchronization reset:
   * Smoothly pauses active audio elements, resets the playback buffer, and resumes playback without jitter.
   */
  public async resetAudioBufferSync(): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    try {
      const audioElements = Array.from(document.querySelectorAll<HTMLMediaElement>('audio, video'))
        .filter(el => !el.paused && !el.ended);

      for (const el of audioElements) {
        const currentTime = el.currentTime;
        el.pause();
        await this.applyAudioSink(el, this.selectedDeviceId);
        // Small 60ms gap for Bluetooth hardware buffer synchronization
        await new Promise(r => setTimeout(r, 60));
        el.currentTime = Math.max(0, currentTime - 0.05);
        await el.play().catch(() => {});
      }
      return true;
    } catch (e) {
      console.warn('[BluetoothAudioService] resetAudioBufferSync error:', e);
      return false;
    }
  }

  /**
   * Enumerate system audio output devices with intelligent categorization and car signature detection
   */
  public async getAudioOutputDevices(): Promise<BluetoothAudioDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [
        {
          id: 'default',
          name: 'سماعات الجهاز الافتراضية (مكبر الصوت)',
          type: 'speaker',
          connected: true,
          isDefault: true,
        },
      ];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

      if (audioOutputs.length === 0) {
        return [
          {
            id: 'default',
            name: 'سماعة النظام الافتراضية (مكبر الصوت)',
            type: 'speaker',
            connected: this.selectedDeviceId === 'default',
            isDefault: true,
          },
        ];
      }

      return audioOutputs.map((dev, idx) => {
        const rawLabel = dev.label?.trim() || '';
        const fallbackName = dev.deviceId === 'default'
          ? 'سماعة النظام الافتراضية (مكبر الصوت)'
          : dev.deviceId === 'communications'
          ? 'سماعة الاتصالات / اللاسلكي'
          : `جهاز صوت خارجي / بلوتوث #${idx + 1}`;
        const name = rawLabel || fallbackName;

        const lower = name.toLowerCase();
        let type: BluetoothAudioDevice['type'] = 'speaker';

        // Car infotainment and vehicle audio signatures
        const carKeywords = [
          'car', 'سيارة', 'auto', 'sync', 'uconnect', 'toyota', 'honda', 'hyundai',
          'nissan', 'ford', 'kia', 'lexus', 'chevrolet', 'gmc', 'mercedes', 'bmw',
          'audi', 'vw', 'mazda', 'infotainment', 'carplay', 'android auto', 'bt-car'
        ];

        // Headphones and wireless earbuds signatures
        const headphoneKeywords = [
          'headphone', 'headset', 'earphone', 'airpod', 'buds', 'freebuds', 'سماعة',
          'wireless', 'bluetooth', 'bt', 'wh-1000', 'wf-1000', 'beats', 'pixel buds'
        ];

        if (carKeywords.some(k => lower.includes(k))) {
          type = 'car';
        } else if (headphoneKeywords.some(k => lower.includes(k))) {
          type = 'headphone';
        } else if (
          lower.includes('jbl') ||
          lower.includes('sony') ||
          lower.includes('bose') ||
          lower.includes('soundcore') ||
          lower.includes('anker') ||
          lower.includes('soundbar') ||
          lower.includes('speaker') ||
          lower.includes('مكبر') ||
          lower.includes('harman') ||
          lower.includes('marshall')
        ) {
          type = 'speaker';
        }

        const isCurrent = this.selectedDeviceId === dev.deviceId ||
          (this.selectedDeviceId === 'default' && dev.deviceId === 'default');

        return {
          id: dev.deviceId || `dev-${idx}`,
          name,
          type,
          connected: isCurrent,
          isDefault: dev.deviceId === 'default',
        };
      });
    } catch (e) {
      console.warn('[BluetoothAudioService] enumerateDevices error:', e);
      return [
        {
          id: 'default',
          name: 'سماعات الجهاز الافتراضية',
          type: 'speaker',
          connected: true,
          isDefault: true,
        },
      ];
    }
  }

  /**
   * Request user permission to unmask real hardware labels (AirPods, JBL, Sony, Car Audio, etc.)
   */
  public async unlockDeviceLabels(): Promise<BluetoothAudioDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return this.getAudioOutputDevices();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return await this.getAudioOutputDevices();
    } catch (err) {
      console.warn('[BluetoothAudioService] label unmasking dismissed or not permitted:', err);
      return await this.getAudioOutputDevices();
    }
  }

  /**
   * Native Browser / Chromium Audio Output Chooser (selectAudioOutput)
   */
  public async selectNativeAudioOutput(): Promise<BluetoothAudioDevice | null> {
    if (!this.isSelectAudioOutputSupported()) return null;

    try {
      const device = await (navigator.mediaDevices as any).selectAudioOutput();
      if (!device) return null;

      const newDev: BluetoothAudioDevice = {
        id: device.deviceId,
        name: device.label || 'سماعة بلوتوث خارجية',
        type: 'headphone',
        connected: true,
      };

      await this.setConnectedDevice(newDev.id, newDev.name);
      return newDev;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
        return null;
      }
      console.warn('[BluetoothAudioService] selectAudioOutput warning:', err);
      return null;
    }
  }

  /**
   * Scan and refresh available audio devices
   */
  public async scanAudioDevices(): Promise<BluetoothAudioDevice[]> {
    const devices = await this.getAudioOutputDevices();
    const hasGeneric = devices.some(d => !d.isDefault && (d.name.includes('جهاز صوت') || !d.name));
    
    if (hasGeneric) {
      return await this.unlockDeviceLabels();
    }
    return devices;
  }

  /**
   * Set and persist active connected device
   */
  public async setConnectedDevice(deviceId: string, deviceName: string): Promise<void> {
    this.selectedDeviceId = deviceId;
    this.selectedDeviceName = deviceName;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_DEV_ID, deviceId);
        localStorage.setItem(STORAGE_KEY_DEV_NAME, deviceName);
      } catch (_) {}
    }

    await this.applyToAllMediaElements(deviceId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dewan:bluetooth-connected', {
          detail: { deviceId, deviceName },
        })
      );
    }
  }

  public isRoutingRealHardware(): boolean {
    return this.isSinkIdSupported() && this.selectedDeviceId !== 'default';
  }

  /**
   * Play an authentic warm acoustic chime test tone on the selected audio device
   */
  public playTestTone(): Promise<boolean> {
    return new Promise(resolve => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          resolve(false);
          return;
        }

        const ctx = new AudioCtx();
        if ('setSinkId' in ctx && this.selectedDeviceId !== 'default') {
          (ctx as any).setSinkId(this.selectedDeviceId).catch(() => {});
        }

        // 3-note harmonic Yemeni Oud arpeggio (Rast - Bayati - High Rast)
        const notes = [
          { freq: 440, time: 0.0, dur: 0.28 }, // Rast (A4)
          { freq: 554.37, time: 0.22, dur: 0.28 }, // C#5
          { freq: 659.25, time: 0.44, dur: 0.55 }, // E5
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

          gain.gain.setValueAtTime(0, ctx.currentTime + time);
          gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + dur + 0.05);
        });

        setTimeout(() => {
          try {
            ctx.close();
          } catch (_) {}
          resolve(true);
        }, 1100);
      } catch (e) {
        console.warn('[BluetoothAudioService] playTestTone error:', e);
        resolve(false);
      }
    });
  }
}

export const BluetoothAudioService = new BluetoothAudioServiceClass();
