import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ApiConfig } from '../services/api';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [apiKey, setApiKey] = useState(ApiConfig.getApiKey());
  const [backendUrl, setBackendUrl] = useState(ApiConfig.getBackendUrl());
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    ApiConfig.setApiKey(apiKey.trim());
    ApiConfig.setBackendUrl(backendUrl.trim());
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>⚙️ Project Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Google AI Studio Gemini API Key</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="AIzaSy... (leave blank to use backend .env)"
            placeholderTextColor="#64748B"
            value={apiKey}
            onChangeText={setApiKey}
          />
          <Text style={styles.hint}>
            Your key stays local in your session. You can also configure GEMINI_API_KEY directly in the backend .env.
          </Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Backend API URL</Text>
          <TextInput
            style={styles.input}
            placeholder="http://localhost:3001"
            placeholderTextColor="#64748B"
            value={backendUrl}
            onChangeText={setBackendUrl}
          />
          <Text style={styles.hint}>
            Default: http://localhost:3001 (or your remote backend server IP).
          </Text>

          {savedNotice && <Text style={styles.savedText}>✓ Settings saved!</Text>}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  closeBtn: {
    padding: 4
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 18
  },
  label: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  hint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4
  },
  savedText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center'
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B'
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#38BDF8'
  },
  saveBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700'
  }
});
