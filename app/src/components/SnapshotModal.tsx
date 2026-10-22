import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ApiService } from '../services/api';
import { AudioService } from '../services/audio';

interface SnapshotModalProps {
  visible: boolean;
  onClose: () => void;
  currentFeature: string;
  activeState: any;
  lastLlmTelemetry?: any;
  lastAudioTelemetry?: any;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  visible,
  onClose,
  currentFeature,
  activeState,
  lastLlmTelemetry,
  lastAudioTelemetry
}) => {
  const [userNote, setUserNote] = useState('');
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSnapshotId, setSavedSnapshotId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVoiceNoteToggle = async () => {
    if (isRecordingNote) {
      try {
        setIsSaving(true);
        const { blob } = await AudioService.stopRecording();
        setIsRecordingNote(false);
        const { transcript } = await ApiService.transcribeAudioBlob(blob);
        setUserNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } catch (err: any) {
        setErrorMessage(`Voice note failed: ${err.message}`);
        setIsRecordingNote(false);
      } finally {
        setIsSaving(false);
      }
    } else {
      try {
        setErrorMessage(null);
        await AudioService.startRecording();
        setIsRecordingNote(true);
      } catch (err: any) {
        setErrorMessage(`Microphone error: ${err.message}`);
      }
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      const payload = {
        feature_context: currentFeature,
        user_notes: userNote,
        state: activeState || {},
        llm_telemetry: lastLlmTelemetry || null,
        audio_telemetry: lastAudioTelemetry || null,
        client_info: {
          platform: 'web',
          version: '1.0.0',
          screen: currentFeature
        }
      };

      const result = await ApiService.saveDebugSnapshot(payload);
      setSavedSnapshotId(result.snapshot_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to capture snapshot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAndClose = () => {
    setUserNote('');
    setSavedSnapshotId(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleResetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>📸 Antigravity Debug Snapshot</Text>
            <TouchableOpacity onPress={handleResetAndClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {savedSnapshotId ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Snapshot Saved!</Text>
              <Text style={styles.successDesc}>
                Reference this Snapshot ID in your Antigravity chat to inspect and fix the issue:
              </Text>

              <View style={styles.idBox}>
                <Text style={styles.idText}>{savedSnapshotId}</Text>
              </View>

              <TouchableOpacity style={styles.doneBtn} onPress={handleResetAndClose}>
                <Text style={styles.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Context: <Text style={styles.highlightText}>{currentFeature}</Text></Text>
              <Text style={styles.desc}>
                Notice something wrong? Capture the exact prompt, document state, and audio telemetry for Antigravity to analyze.
              </Text>

              <Text style={styles.inputLabel}>Explain what went wrong (voice or text):</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  placeholder="e.g., 'Gemini softened my prose too much' or 'Diff deleted paragraph 3'..."
                  placeholderTextColor="#64748B"
                  value={userNote}
                  onChangeText={setUserNote}
                />
                <TouchableOpacity
                  style={[styles.micBtn, isRecordingNote && styles.micBtnActive]}
                  onPress={handleVoiceNoteToggle}
                >
                  <Text style={styles.micBtnText}>{isRecordingNote ? '⏹️ Stop' : '🎙️ Dictate'}</Text>
                </TouchableOpacity>
              </View>

              {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleResetAndClose} disabled={isSaving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.btnDisabled]}
                  onPress={handleSaveSnapshot}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Capture & Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    maxWidth: 520,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
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
    fontSize: 18,
    fontWeight: '600'
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4
  },
  highlightText: {
    color: '#38BDF8',
    fontWeight: '700'
  },
  desc: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  inputContainer: {
    marginBottom: 16
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    height: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155'
  },
  micBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8
  },
  micBtnActive: {
    backgroundColor: '#DC2626'
  },
  micBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B'
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600'
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#4F46E5'
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  btnDisabled: {
    opacity: 0.6
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12
  },
  successIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  successTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6
  },
  successDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16
  },
  idBox: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 20
  },
  idText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700'
  },
  doneBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  doneBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700'
  }
});
