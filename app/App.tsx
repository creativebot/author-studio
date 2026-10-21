import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, ActivityIndicator, Text } from 'react-native';
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

  // Active Telemetry state for debug snapshots
  const [lastLlmTelemetry, setLastLlmTelemetry] = useState<any>(null);
  const [lastAudioTelemetry, setLastAudioTelemetry] = useState<any>(null);

  const loadProject = async () => {
    try {
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
      // Fallback: If network error or cold start, keep using local backup!
      const fallback = ApiConfig.getLocalProjectBackup();
      if (fallback) {
        setProject(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = ApiConfig.getGoogleToken();
    const secret = ApiConfig.getSecretToken();
    if (token || secret) {
      loadProject();
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setAuthenticatedUser(user);
    setLoading(true);
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

  if (!authenticatedUser && !ApiConfig.getGoogleToken() && !ApiConfig.getSecretToken()) {
    return <GoogleLoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading || !project) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Connecting to Author Cloud...</Text>
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
