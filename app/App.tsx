import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, ActivityIndicator, Text } from 'react-native';
import { Header } from './src/components/Header';
import { SoundingBoardView } from './src/components/SoundingBoardView';
import { ManuscriptDiffView } from './src/components/ManuscriptDiffView';
import { ConceptVaultView } from './src/components/ConceptVaultView';
import { SnapshotModal } from './src/components/SnapshotModal';
import { SettingsModal } from './src/components/SettingsModal';
import { ApiService } from './src/services/api';
import { ProjectData } from './src/types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'sounding_board' | 'manuscript' | 'vault'>('sounding_board');
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Telemetry state for debug snapshots
  const [lastLlmTelemetry, setLastLlmTelemetry] = useState<any>(null);
  const [lastAudioTelemetry, setLastAudioTelemetry] = useState<any>(null);

  const loadProject = async () => {
    try {
      const data = await ApiService.getProject();
      setProject(data);
    } catch (err: any) {
      console.warn('Initial project fetch failed, backend might be starting:', err.message);
      // Fallback empty data if backend is still starting up
      setProject({
        book_title: 'Untitled Non-Fiction Work',
        author_thesis: '',
        style_guidelines: ['Preserve authentic intellectual cadence'],
        structure_tree: [
          {
            id: 'node_1',
            title: 'Core Philosophy & Mechanics',
            type: 'part',
            order: 1,
            content: '',
            children: []
          }
        ],
        concept_vault: {
          theories: [],
          practices: [],
          axioms: [],
          open_questions: []
        },
        sounding_board_history: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, []);

  const handleTelemetryUpdate = (llm: any, audio: any) => {
    if (llm) setLastLlmTelemetry(llm);
    if (audio) setLastAudioTelemetry(audio);
  };

  if (loading || !project) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Initializing Author Studio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSnapshot={() => setIsSnapshotOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        bookTitle={project.book_title}
      />

      <View style={styles.body}>
        {currentTab === 'sounding_board' && (
          <SoundingBoardView
            project={project}
            onRefreshProject={loadProject}
            onTelemetryUpdate={handleTelemetryUpdate}
          />
        )}

        {currentTab === 'manuscript' && (
          <ManuscriptDiffView
            project={project}
            onRefreshProject={loadProject}
            onTelemetryUpdate={handleTelemetryUpdate}
          />
        )}

        {currentTab === 'vault' && (
          <ConceptVaultView
            project={project}
            onRefreshProject={loadProject}
          />
        )}
      </View>

      <SnapshotModal
        visible={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        currentFeature={currentTab}
        activeState={{
          project_summary: {
            title: project.book_title,
            sections_count: project.structure_tree.length,
            theories_count: project.concept_vault.theories.length,
            practices_count: project.concept_vault.practices.length
          },
          currentTab
        }}
        lastLlmTelemetry={lastLlmTelemetry}
        lastAudioTelemetry={lastAudioTelemetry}
      />

      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadProject();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  body: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500'
  }
});
