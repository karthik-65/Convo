// Native Device System Notification & Vibration Sound Manager
class SoundManager {
  constructor() {
    this.muted = localStorage.getItem('chat_muted') === 'true';
    this.requestPermission();
  }

  requestPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('chat_muted', this.muted);
    return this.muted;
  }

  // Triggers native device system notification sound, banner, and mobile vibration
  playDeviceNotification({ title = 'Convo', body = 'You have a new message', icon = '/chat.png' } = {}) {
    if (this.muted) return;

    // 1. Mobile Device Vibration feedback (supported on Android / mobile browsers)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 80, 120]);
      } catch (e) {}
    }

    // 2. Native System/Device Notification (uses OS default notification sound & banner)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const n = new Notification(title, {
            body,
            icon,
            badge: '/chat.png',
            vibrate: [120, 80, 120],
            renotify: true,
            tag: 'convo-notification',
          });
          // Auto-close after 4 seconds
          setTimeout(() => n.close(), 4000);
        } catch (e) {
          console.warn('Device notification error:', e);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  // Alias for backward compatibility
  playMessageSound(opts) {
    this.playDeviceNotification(opts);
  }
}

const soundManager = new SoundManager();
export default soundManager;
