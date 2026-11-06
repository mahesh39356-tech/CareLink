import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.carelink.ruraltelemedicine',
  appName: 'CareLink Rural Health',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
