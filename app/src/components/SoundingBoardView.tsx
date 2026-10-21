import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import { ApiService, ApiConfig } from '../services/api';
import { AudioService } from '../services/audio';
import { ProjectData } from '../types';

interface SoundingBoardViewProps {
  project: ProjectData;
  onRefreshProject: () => void;
  onTelemetryUpdate: (llm: any, audio: any) => void;
}

export const SoundingBoardView: React.FC<SoundingBoardViewProps> = ({
  project,
  onRefreshProject,
  onTelemetryUpdate
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice output (TTS) states
  const [voiceResponsesEnabled, setVoiceResponsesEnabled] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
  };

  const speakText = (text: string, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (speakingMsgId === msgId) {
      setSpeakingMsgId(null);
      return;
    }

    // Clean markdown formatting before speaking
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Natural conversational cadence
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => {
      setSpeakingMsgId(msgId || 'auto');
    };
    utterance.onend = () => {
      setSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleRecord = async () => {
    // If speaking, stop immediately so Gemini doesn't talk over the author
    stopSpeaking();

    if (isRecording) {
      try {
        setIsProcessing(true);
        setIsRecording(false);
        const { blob, durationSeconds } = await AudioService.stopRecording();
        const { transcript, latency_ms } = await ApiService.transcribeAudioBlob(blob);

        onTelemetryUpdate(null, {
          duration_seconds: durationSeconds,
          transcription_result: transcript,
          latency_ms
        });

        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } catch (err: any) {
        setErrorMessage(`Transcription failed: ${err.message}`);
        onTelemetryUpdate(null, { error: err.message });
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        setErrorMessage(null);
        await AudioService.startRecording();
        setIsRecording(true);
      } catch (err: any) {
        setErrorMessage(`Microphone error: ${err.message}`);
      }
    }
  };

  const handleSendMessage = async () => {
    stopSpeaking();
    const textToSend = inputText.trim();
    if (!textToSend || isProcessing) return;

    setInputText('');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await ApiService.sendSoundingBoardMessage(textToSend);
      onTelemetryUpdate(
        {
          model: 'gemini-3.8-flash',
          raw_response: result.reply,
          latency_ms: result.latency_ms
        },
        null
      );
      onRefreshProject();

      // Read reply aloud if voice responses are enabled
      if (voiceResponsesEnabled && result.reply) {
        speakText(result.reply, `reply_${Date.now()}`);
      }

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing thought with Gemini');
      onTelemetryUpdate(
        {
          model: 'gemini-3.8-flash',
          error: err.message
        },
        null
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoBanner}>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Socratic Sounding Board</Text>
          <Text style={styles.infoDesc}>
            Voice brain-dump your theories and drills. Gemini answers back and co-designs the book with you.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.voiceToggleBtn, voiceResponsesEnabled && styles.voiceToggleBtnActive]}
          onPress={() => {
            const next = !voiceResponsesEnabled;
            setVoiceResponsesEnabled(next);
            if (!next) stopSpeaking();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.voiceToggleIcon}>{voiceResponsesEnabled ? '🔊' : '🔇'}</Text>
          <Text style={styles.voiceToggleText}>
            {voiceResponsesEnabled ? 'Voice: ON' : 'Voice: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent}>
        {project.sounding_board_history.length === 0 ? (
          <View style={styles.emptyPrompt}>
            <Text style={styles.emptyIcon}>💡</Text>
            <Text style={styles.emptyTitle}>No Thoughts Recorded Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the microphone below and dictate your raw thoughts. Describe the core contradiction you want to solve, the theoretical mechanism, or your personal drill.
            </Text>
          </View>
        ) : (
          project.sounding_board_history.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.modelBubble
              ]}
            >
              <View style={styles.messageHeaderRow}>
                <Text style={styles.roleLabel}>{msg.role === 'user' ? 'YOU (AUTHOR)' : 'GEMINI (EDITOR)'}</Text>
                {msg.role === 'model' && (
                  <TouchableOpacity
                    style={styles.listenBtn}
                    onPress={() => speakText(msg.content, msg.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.listenBtnText}>
                      {speakingMsgId === msg.id ? '⏹️ Stop' : '🔊 Listen'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.messageText}>{msg.content}</Text>

              {msg.extracted_concepts && msg.extracted_concepts.length > 0 && (
                <View style={styles.conceptsBox}>
                  <Text style={styles.conceptsBoxTitle}>⚡ Extracted Concepts:</Text>
                  {msg.extracted_concepts.map((concept, idx) => (
                    <View key={idx} style={styles.conceptBadge}>
                      <Text style={styles.conceptBadgeType}>[{concept.type.toUpperCase()}]</Text>
                      <Text style={styles.conceptBadgeTitle}>{concept.title}:</Text>
                      <Text style={styles.conceptBadgeDesc}>{concept.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        {isProcessing && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.loadingText}>Gemini is analyzing your theory & practice...</Text>
          </View>
        )}
      </ScrollView>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder={isRecording ? 'Listening to your voice dictation...' : 'Dictate or type your thoughts...'}
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
          />

          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={handleToggleRecord}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Text style={styles.recordIcon}>{isRecording ? '⏹️' : '🎙️'}</Text>
            {isRecording && <Text style={styles.recordTimer}>{formatTime(recordingSeconds)}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomActions}>
          <Text style={styles.tipText}>
            {isRecording ? 'Tap ⏹️ when finished to transcribe' : 'Dictate freely on the go'}
          </Text>

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isProcessing) && styles.btnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isProcessing}
          >
            <Text style={styles.sendBtnText}>Send to Gemini →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  infoBanner: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  infoTextContainer: {
    flex: 1
  },
  infoTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700'
  },
  infoDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  voiceToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4
  },
  voiceToggleBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#059669'
  },
  voiceToggleIcon: {
    fontSize: 13
  },
  voiceToggleText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700'
  },
  chatScroll: {
    flex: 1
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 24
  },
  emptyPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20
  },
  messageBubble: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    maxWidth: '92%'
  },
  userBubble: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2
  },
  modelBubble: {
    backgroundColor: '#0F172A',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomLeftRadius: 2
  },
  messageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#64748B'
  },
  listenBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155'
  },
  listenBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700'
  },
  messageText: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 22
  },
  conceptsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  conceptsBoxTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  conceptBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 8,
    marginTop: 6
  },
  conceptBadgeType: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800'
  },
  conceptBadgeTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  conceptBadgeDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    alignSelf: 'flex-start'
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 12
  },
  inputArea: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    padding: 12
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155'
  },
  recordBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    height: 44
  },
  recordBtnActive: {
    backgroundColor: '#DC2626'
  },
  recordIcon: {
    fontSize: 18
  },
  recordTimer: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  tipText: {
    color: '#64748B',
    fontSize: 11
  },
  sendBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6
  },
  sendBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700'
  },
  btnDisabled: {
    opacity: 0.5
  }
});
