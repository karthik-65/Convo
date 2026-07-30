// Hybrid Sound & Notification Manager (Web Audio API + Native OS System Notifications + Mobile Vibration)
class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.muted = localStorage.getItem('chat_muted') === 'true';
    
    // Auto-initialize audio context on first user interaction anywhere in the page
    if (typeof window !== 'undefined') {
      const handleUserGesture = () => {
        this.initContext();
        this.requestPermission();
        window.removeEventListener('click', handleUserGesture);
        window.removeEventListener('keydown', handleUserGesture);
        window.removeEventListener('touchstart', handleUserGesture);
      };
      window.addEventListener('click', handleUserGesture);
      window.addEventListener('keydown', handleUserGesture);
      window.addEventListener('touchstart', handleUserGesture);
    }
  }

  initContext() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  async requestPermission() {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          let permission = Notification.permission;
          try {
            permission = await Notification.requestPermission();
          } catch (e) {
            permission = await new Promise(resolve => Notification.requestPermission(resolve));
          }
          console.log('Notification permission status:', permission);
          return permission;
        }
        return Notification.permission;
      }
    } catch (e) {
      console.warn('Permission request error:', e);
    }
    return 'denied';
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('chat_muted', this.muted);
    if (!this.muted) {
      this.initContext();
      this.playChime();
    }
    return this.muted;
  }

  // Synthesize a pleasant 2-note notification chime (E5 -> B5 sequence)
  playChime() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Note 1 (E5: 659.25Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2 (B5: 987.77Hz)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Chime audio play error:', e);
    }
  }

  // Play notification (In-page Web Audio Chime + Native OS Notification + Mobile Vibration)
  playDeviceNotification({ title = 'Convo', body = 'You have a new message', icon = '/chat.png' } = {}) {
    if (this.muted) return;

    // 1. In-page Web Audio Chime (Guaranteed audio feedback in all browsers)
    this.playChime();

    // 2. Mobile Device Vibration (Android / Mobile Web)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 80, 120]);
      } catch (e) {}
    }

    // 3. Native OS System Notification (ServiceWorker showNotification for Mobile + Fallback for Desktop)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notifOptions = {
          body,
          icon: icon || '/chat.png',
          badge: '/chat.png',
          vibrate: [120, 80, 120],
          renotify: true,
          tag: 'convo-notification',
        };

        const showSWNotification = () => {
          if ('serviceWorker' in navigator) {
            return navigator.serviceWorker.ready.then(reg => {
              return reg.showNotification(title, notifOptions);
            });
          }
          return Promise.reject(new Error('No ServiceWorker'));
        };

        showSWNotification().catch(() => {
          try {
            const n = new Notification(title, notifOptions);
            n.onclick = () => {
              window.focus();
              n.close();
            };
            setTimeout(() => n.close(), 5000);
          } catch (e) {
            console.warn('Native notification fallback error:', e);
          }
        });
      } else if (Notification.permission === 'default') {
        this.requestPermission();
      }
    }
  }

  playMessageSound(opts) {
    this.playDeviceNotification(opts);
  }
}

const soundManager = new SoundManager();
export default soundManager;
