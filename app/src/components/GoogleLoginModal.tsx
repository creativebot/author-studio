import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { ApiService, ApiConfig } from '../services/api';

const GOOGLE_CLIENT_ID = '436412031999-4ba6ochv7pcmqkuh59h6sdlqean3vs0j.apps.googleusercontent.com';

interface GoogleLoginModalProps {
  onLoginSuccess: (user: any) => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const buttonDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Load Google Identity Services script if not already present
    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initGoogle = () => {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.id) return;

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          if (!response.credential) {
            setErrorMessage('No credential returned from Google');
            return;
          }

          try {
            setLoading(true);
            setErrorMessage(null);
            const user = await ApiService.verifyGoogleToken(response.credential);
            onLoginSuccess(user);
          } catch (err: any) {
            setErrorMessage(err.message || 'Google login failed');
          } finally {
            setLoading(false);
          }
        },
        auto_select: true
      });

      // Render button in div
      const container = document.getElementById('google-btn-container');
      if (container) {
        google.accounts.id.renderButton(container, {
          theme: 'filled_blue',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280
        });
      }

      // Also trigger One Tap prompt on mobile
      google.accounts.id.prompt();
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>🔒 PRIVATE WORKSPACE</Text>
        <Text style={styles.title}>Author Studio</Text>
        <Text style={styles.subtitle}>
          Private, voice-first non-fiction writing studio.
        </Text>
        <Text style={styles.accessNotice}>
          Authorized author account required
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.loadingText}>Verifying author identity with Google...</Text>
          </View>
        ) : (
          <View style={styles.btnWrapper}>
            {/* Native HTML element for Google GIS button */}
            <div id="google-btn-container" style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }} />
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.footerNote}>
          Your tokens and manuscript are protected by Google Cloud OAuth.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 28,
    alignItems: 'center'
  },
  badge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16
  },
  accessNotice: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16
  },
  btnWrapper: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16
  },
  loadingText: {
    color: '#38BDF8',
    fontSize: 13
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
    width: '100%'
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    textAlign: 'center'
  },
  footerNote: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20
  }
});
