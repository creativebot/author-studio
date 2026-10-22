import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Header } from './src/components/Header';
import { SoundingBoardView } from './src/components/SoundingBoardView';
import { ManuscriptDiffView } from './src/components/ManuscriptDiffView';
import { ConceptVaultView } from './src/components/ConceptVaultView';
import { SnapshotModal } from './src/components/SnapshotModal';
import { SettingsModal } from './src/components/SettingsModal';
import { GoogleLoginModal } from './src/components/GoogleLoginModal';
import { ApiService, ApiConfig } from './src/services/api';
import { ProjectData } from './src/types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'sounding_board' | 'manuscript' | 'vault'>('sounding_board');
  const [project, setProject] = useState<ProjectData | null>(() => ApiConfig.getLocalProjectBackup());
  const [loading, setLoading] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(ApiConfig.getAuthorProfile());
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Telemetry state for debug snapshots
  const [lastLlmTelemetry, setLastLlmTelemetry] = useState<any>(null);
  const [lastAudioTelemetry, setLastAudioTelemetry] = useState<any>(null);

  const loadProject = async () => {
    try {
      setLoadError(null);
      const serverData = await ApiService.getProject();
      const localBackup = ApiConfig.getLocalProjectBackup();

      // If server has empty history (e.g. Render container restarted/redeployed)
      // but local backup has messages, auto-restore server from local backup!
      if (
        localBackup &&
        localBackup.sounding_board_history &&
        localBackup.sounding_board_history.length > 0 &&
        (!serverData.sounding_board_history || serverData.sounding_board_history.length < localBackup.sounding_board_history.length)
      ) {
        console.log('[Auto-Persistence] Restoring server state from local backup...');
        await ApiService.updateProject(localBackup);
        setProject(localBackup);
        return;
      }

      // Otherwise save server updates locally
      ApiConfig.saveLocalProjectBackup(serverData);
      setProject(serverData);
    } catch (err: any) {
      console.warn('Project fetch error:', err.message);

      // If session expired or unauthorized
      if (err.message && err.message.includes('Unauthorized')) {
        console.warn('Unauthorized error from server:', err.message);
        setLoadError('Session verification failed. Click below to re-authenticate.');
      } else {
        setLoadError(err.message || 'Connecting to server...');
      }

      // Fallback: If network error or cold start, keep using local backup or default
      const fallback = ApiConfig.getLocalProjectBackup();
      if (fallback) {
        setProject(fallback);
      } else {
        const defaultProject: ProjectData = {
          book_title: 'Untitled Non-Fiction Work',
          author_thesis: '',
          style_guidelines: ['Preserve authentic intellectual cadence'],
          structure_tree: [
            { id: 'node_1', title: 'Core Philosophy & Mechanics', type: 'part', order: 1, content: '', children: [] },
            { id: 'node_2', title: 'Applied Protocols & Drills', type: 'part', order: 2, content: '', children: [] }
          ],
          concept_vault: { theories: [], practices: [], axioms: [], open_questions: [] },
          sounding_board_history: []
        };
        setProject(defaultProject);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasAuth = !!ApiConfig.getSessionToken() || !!ApiConfig.getGoogleToken() || !!ApiConfig.getSecretToken();
    if (hasAuth) {
      setLoading(true);
      loadProject();
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setAuthenticatedUser(user);
    if (!project) {
      const fallback = ApiConfig.getLocalProjectBackup() || {
        book_title: 'Untitled Non-Fiction Work',
        author_thesis: '',
        style_guidelines: ['Preserve authentic intellectual cadence'],
        structure_tree: [
          { id: 'node_1', title: 'Core Philosophy & Mechanics', type: 'part', order: 1, content: '', children: [] },
          { id: 'node_2', title: 'Applied Protocols & Drills', type: 'part', order: 2, content: '', children: [] }
        ],
        concept_vault: { theories: [], practices: [], axioms: [], open_questions: [] },
        sounding_board_history: []
      };
      setProject(fallback);
    }
    loadProject();
  };

  const handleLogout = () => {
    ApiConfig.logout();
    setAuthenticatedUser(null);
    setProject(null);
  };

  const handleTelemetryUpdate = (llm: any, audio: any) => {
    if (llm) setLastLlmTelemetry(llm);
    if (audio) setLastAudioTelemetry(audio);
  };

  const hasCredentials = !!authenticatedUser || !!ApiConfig.getSessionToken() || !!ApiConfig.getGoogleToken() || !!ApiConfig.getSecretToken();

  if (!hasCredentials) {
    return <GoogleLoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading && !project) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Connecting to Author Cloud...</Text>
        <Text style={styles.loadingSubtext}>
          {loadError ? loadError : 'Server is waking up (Render free tier spin-up can take ~30s on first load)...'}
        </Text>

        <View style={styles.loadingActionRow}>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProject}>
            <Text style={styles.retryBtnText}>🔄 Retry Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reauthBtn} onPress={handleLogout}>
            <Text style={styles.reauthBtnText}>🔑 Re-Authenticate</Text>
          </TouchableOpacity>
        </View>
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
        onLogout={handleLogout}
        authorEmail={authenticatedUser?.email}
        bookTitle={project?.book_title || 'Untitled Non-Fiction'}
      />

      <View style={styles.body}>
        {currentTab === 'sounding_board' && project && (
          <SoundingBoardView
            project={project}
            onRefreshProject={loadProject}
            onTelemetryUpdate={handleTelemetryUpdate}
          />
        )}

        {currentTab === 'manuscript' && project && (
          <ManuscriptDiffView
            project={project}
            onRefreshProject={loadProject}
            onTelemetryUpdate={handleTelemetryUpdate}
          />
        )}

        {currentTab === 'vault' && project && (
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
            title: project?.book_title,
            sections_count: project?.structure_tree?.length || 0,
            theories_count: project?.concept_vault?.theories?.length || 0,
            practices_count: project?.concept_vault?.practices?.length || 0
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
    padding: 24,
    gap: 12
  },
  loadingText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700'
  },
  loadingSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
    marginTop: 4
  },
  loadingActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  retryBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  reauthBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  reauthBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13
  }
});
