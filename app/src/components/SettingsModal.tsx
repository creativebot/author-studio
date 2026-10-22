import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ApiConfig } from '../services/api';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [apiKey, setApiKey] = useState(ApiConfig.getApiKey());
  const [secretToken, setSecretToken] = useState(ApiConfig.getSecretToken());
  const [backendUrl, setBackendUrl] = useState(ApiConfig.getBackendUrl());
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    ApiConfig.setApiKey(apiKey.trim());
    ApiConfig.setSecretToken(secretToken.trim());
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
            <Text style={styles.title}>⚙️ Security & Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Author Secret Passphrase (Auth Protection)</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Enter your private secret token..."
            placeholderTextColor="#64748B"
            value={secretToken}
            onChangeText={setSecretToken}
          />
          <Text style={styles.hint}>
            Protects your cloud server so only you can use your Gemini quota and access your manuscript.
          </Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Backend API URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://asb001.onrender.com"
            placeholderTextColor="#64748B"
            value={backendUrl}
            onChangeText={setBackendUrl}
          />
          <Text style={styles.hint}>
            Change this if you rename your service on Render.
          </Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Google AI Studio Key (Optional Override)</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="AIzaSy... (leave blank to use Render cloud key)"
            placeholderTextColor="#64748B"
            value={apiKey}
            onChangeText={setApiKey}
          />
          <Text style={styles.hint}>
            Optional. If already set in Render Environment, you can leave this blank.
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
