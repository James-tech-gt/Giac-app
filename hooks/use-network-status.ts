import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsConnected(navigator.onLine);
      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    let active = true;

    async function check() {
      try {
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        if (active) setIsConnected(true);
      } catch {
        if (active) setIsConnected(false);
      }
    }

    check();
    const interval = setInterval(check, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return isConnected;
}
