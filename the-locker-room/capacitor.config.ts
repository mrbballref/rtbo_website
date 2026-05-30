import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rtbofficiating.lockerroom',
  appName: 'The Locker Room',
  webDir: 'out',
  server: process.env.CAPACITOR_SERVER_URL
    ? {
        url: process.env.CAPACITOR_SERVER_URL,
        cleartext: false
      }
    : undefined,
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#111111',
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
};

export default config;
