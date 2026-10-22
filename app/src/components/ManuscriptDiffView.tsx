import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { ApiService } from '../services/api';
import { AudioService } from '../services/audio';
import { ProjectData, StructureNode, DiffSuggestion } from '../types';

interface ManuscriptDiffViewProps {
  project: ProjectData;
  onRefreshProject: () => void;
  onTelemetryUpdate: (llm: any, audio: any) => void;
}

export const ManuscriptDiffView: React.FC<ManuscriptDiffViewProps> = ({
  project,
  onRefreshProject,
  onTelemetryUpdate
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    project.structure_tree[0]?.id || ''
  );
  const [currentText, setCurrentText] = useState<string>('');
  const [voiceInstruction, setVoiceInstruction] = useState<string>('');
  const [isRecordingDictation, setIsRecordingDictation] = useState(false);
  const [isRecordingInstruction, setIsRecordingInstruction] = useState(false);
  const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);
  const [activeDiff, setActiveDiff] = useState<DiffSuggestion | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync selected node content
  useEffect(() => {
    const node = findNode(project.structure_tree, selectedNodeId);
    if (node) {
      setCurrentText(node.content || '');
    }
  }, [selectedNodeId, project]);

  const findNode = (nodes: StructureNode[], id: string): StructureNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSaveText = async () => {
    try {
      const updateTree = (nodes: StructureNode[]): StructureNode[] => {
        return nodes.map((n) => {
          if (n.id === selectedNodeId) {
            return { ...n, content: currentText };
          }
          if (n.children) {
            return { ...n, children: updateTree(n.children) };
          }
          return n;
        });
      };

      const updatedTree = updateTree(project.structure_tree);
      await ApiService.updateProject({ structure_tree: updatedTree });
      setStatusMessage('✓ Saved manuscript');
      setTimeout(() => setStatusMessage(null), 2000);
      onRefreshProject();
    } catch (err: any) {
      setStatusMessage(`Error saving: ${err.message}`);
    }
  };

  // Walking dictation straight into section
  const handleToggleDictation = async () => {
    if (isRecordingDictation) {
      try {
        setIsRecordingDictation(false);
        const { blob, durationSeconds } = await AudioService.stopRecording();
        const { transcript, latency_ms } = await ApiService.transcribeAudioBlob(blob);

        onTelemetryUpdate(null, {
          duration_seconds: durationSeconds,
          transcription_result: transcript,
          latency_ms
        });

        setCurrentText((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
      } catch (err: any) {
        setStatusMessage(`Transcription failed: ${err.message}`);
      }
    } else {
      try {
        setStatusMessage(null);
        await AudioService.startRecording();
        setIsRecordingDictation(true);
      } catch (err: any) {
        setStatusMessage(`Mic error: ${err.message}`);
      }
    }
  };

  // Voice command for diff editing
  const handleToggleInstructionRecord = async () => {
    if (isRecordingInstruction) {
      try {
        setIsRecordingInstruction(false);
        const { blob } = await AudioService.stopRecording();
        const { transcript } = await ApiService.transcribeAudioBlob(blob);
        setVoiceInstruction(transcript);
      } catch (err: any) {
        setStatusMessage(`Voice instruction failed: ${err.message}`);
      }
    } else {
      try {
        setStatusMessage(null);
        await AudioService.startRecording();
        setIsRecordingInstruction(true);
      } catch (err: any) {
        setStatusMessage(`Mic error: ${err.message}`);
      }
    }
  };

  const handleRequestDiff = async () => {
    if (!currentText.trim() || !voiceInstruction.trim() || isGeneratingDiff) return;

    try {
      setIsGeneratingDiff(true);
      setStatusMessage(null);
      const diff = await ApiService.requestDiff(currentText, voiceInstruction);
      setActiveDiff(diff);
      onTelemetryUpdate(
        {
          model: 'gemini-2.0-flash',
          parsed_response: diff
        },
        null
      );
    } catch (err: any) {
      setStatusMessage(`Diff generation error: ${err.message}`);
    } finally {
      setIsGeneratingDiff(false);
    }
  };

  const handleAcceptDiff = () => {
    if (!activeDiff) return;
    setCurrentText(activeDiff.revised_text);
    setActiveDiff(null);
    setVoiceInstruction('');
    setStatusMessage('✓ Revision accepted and applied!');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleConfirmReject = async () => {
    if (!activeDiff) return;
    try {
      await ApiService.rejectDiff(
        activeDiff.original_text,
        activeDiff.revised_text,
        rejectReason || 'Author rejected suggestion.'
      );
      setStatusMessage('✓ Rejection logged to Author Style Memory!');
      setTimeout(() => setStatusMessage(null), 2500);
      setActiveDiff(null);
      setShowRejectBox(false);
      setRejectReason('');
      onRefreshProject();
    } catch (err: any) {
      setStatusMessage(`Failed to log rejection: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Node selector bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nodeBar}>
        {project.structure_tree.map((node) => (
          <TouchableOpacity
            key={node.id}
            style={[styles.nodeChip, selectedNodeId === node.id && styles.nodeChipActive]}
            onPress={() => setSelectedNodeId(node.id)}
          >
            <Text style={[styles.nodeChipText, selectedNodeId === node.id && styles.nodeChipTextActive]}>
              {node.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {statusMessage && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      {/* Main Manuscript Editor / Diff View */}
      <View style={styles.contentArea}>
        {activeDiff ? (
          <View style={styles.diffContainer}>
            <View style={styles.diffHeader}>
              <Text style={styles.diffTitle}>Proposed Revision</Text>
              <Text style={styles.diffExplanation}>{activeDiff.explanation}</Text>
            </View>

            <ScrollView style={styles.diffScroll}>
              <Text style={styles.diffTextFlow}>
                {activeDiff.diff_tokens.map((token, idx) => {
                  if (token.type === 'equal') {
                    return <Text key={idx} style={styles.diffEqual}>{token.value}</Text>;
                  }
                  if (token.type === 'delete') {
                    return <Text key={idx} style={styles.diffDelete}>{token.value}</Text>;
                  }
                  if (token.type === 'insert') {
                    return <Text key={idx} style={styles.diffInsert}>{token.value}</Text>;
                  }
                  return null;
                })}
              </Text>
            </ScrollView>

            {/* Accept / Reject controls */}
            {showRejectBox ? (
              <View style={styles.rejectBox}>
                <Text style={styles.rejectLabel}>Why are you rejecting this? (Trains Style Memory):</Text>
                <TextInput
                  style={styles.rejectInput}
                  placeholder="e.g. 'Too informal', 'Lost the nuance of the theory'..."
                  placeholderTextColor="#64748B"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                />
                <View style={styles.rejectBtnRow}>
                  <TouchableOpacity style={styles.cancelRejectBtn} onPress={() => setShowRejectBox(false)}>
                    <Text style={styles.cancelRejectText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmRejectBtn} onPress={handleConfirmReject}>
                    <Text style={styles.confirmRejectText}>Confirm & Learn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.diffActionRow}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => setShowRejectBox(true)}>
                  <Text style={styles.rejectBtnText}>✕ Reject Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptDiff}>
                  <Text style={styles.acceptBtnText}>✓ Accept Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.editorContainer}>
            <View style={styles.editorToolbar}>
              <Text style={styles.editorTitle}>Manuscript Section</Text>
              <View style={styles.editorToolbarRight}>
                <TouchableOpacity
                  style={[styles.dictateBtn, isRecordingDictation && styles.dictateBtnActive]}
                  onPress={handleToggleDictation}
                >
                  <Text style={styles.dictateBtnText}>
                    {isRecordingDictation ? '⏹️ Stop Walking Dictate' : '🎙️ Dictate Prose'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveText}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.manuscriptInput}
              multiline
              blurOnSubmit={false}
              placeholder="Dictate your thoughts, draft theory, or write protocols here (Enter for line breaks)..."
              placeholderTextColor="#64748B"
              value={currentText}
              onChangeText={setCurrentText}
            />
          </View>
        )}
      </View>

      {/* Voice / Text AI Revision Command Bar */}
      {!activeDiff && (
        <View style={styles.commandBar}>
          <Text style={styles.commandLabel}>AI Prose Polish & Diff Review</Text>
          <View style={styles.commandInputRow}>
            <TextInput
              style={styles.commandInput}
              placeholder="Voice or type command (e.g. 'Make the second drill punchier')..."
              placeholderTextColor="#64748B"
              value={voiceInstruction}
              onChangeText={setVoiceInstruction}
            />

            <TouchableOpacity
              style={[styles.commandMicBtn, isRecordingInstruction && styles.commandMicBtnActive]}
              onPress={handleToggleInstructionRecord}
            >
              <Text style={styles.commandMicIcon}>{isRecordingInstruction ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.requestDiffBtn, (!currentText || !voiceInstruction || isGeneratingDiff) && styles.btnDisabled]}
              onPress={handleRequestDiff}
              disabled={!currentText || !voiceInstruction || isGeneratingDiff}
            >
              {isGeneratingDiff ? (
                <ActivityIndicator color="#0F172A" size="small" />
              ) : (
                <Text style={styles.requestDiffBtnText}>Diff →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  nodeBar: {
    maxHeight: 46,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  nodeChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  nodeChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8'
  },
  nodeChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  nodeChipTextActive: {
    color: '#0F172A',
    fontWeight: '700'
  },
  statusBar: {
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 16
  },
  statusText: {
    color: '#38BDF8',
    fontSize: 12,
    textAlign: 'center'
  },
  contentArea: {
    flex: 1,
    padding: 16
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12
  },
  editorToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8
  },
  editorTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700'
  },
  editorToolbarRight: {
    flexDirection: 'row',
    gap: 8
  },
  dictateBtn: {
    backgroundColor: '#334155',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  dictateBtnActive: {
    backgroundColor: '#DC2626'
  },
  dictateBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  manuscriptInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 24,
    textAlignVertical: 'top',
    whiteSpace: 'pre-wrap'
  } as any,
  commandBar: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    padding: 12
  },
  commandLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6
  },
  commandInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  commandInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155'
  },
  commandMicBtn: {
    backgroundColor: '#334155',
    padding: 8,
    borderRadius: 8
  },
  commandMicBtnActive: {
    backgroundColor: '#DC2626'
  },
  commandMicIcon: {
    fontSize: 16
  },
  requestDiffBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  requestDiffBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700'
  },
  diffContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
    padding: 14
  },
  diffHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8,
    marginBottom: 10
  },
  diffTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700'
  },
  diffExplanation: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  diffScroll: {
    flex: 1,
    marginVertical: 10
  },
  diffTextFlow: {
    fontSize: 15,
    lineHeight: 24,
    whiteSpace: 'pre-wrap'
  } as any,
  diffEqual: {
    color: '#F8FAFC',
    whiteSpace: 'pre-wrap'
  } as any,
  diffDelete: {
    color: '#F87171',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    textDecorationLine: 'line-through',
    whiteSpace: 'pre-wrap'
  } as any,
  diffInsert: {
    color: '#4ADE80',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    fontWeight: '600',
    whiteSpace: 'pre-wrap'
  } as any,
  diffActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  rejectBtn: {
    backgroundColor: '#7F1D1D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  rejectBtnText: {
    color: '#FCA5A5',
    fontWeight: '700',
    fontSize: 13
  },
  acceptBtn: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  rejectBox: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  rejectLabel: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  rejectInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 8
  },
  rejectBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  cancelRejectBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  cancelRejectText: {
    color: '#94A3B8',
    fontSize: 12
  },
  confirmRejectBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6
  },
  confirmRejectText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  btnDisabled: {
    opacity: 0.5
  }
});
