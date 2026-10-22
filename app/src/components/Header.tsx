import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HeaderProps {
  currentTab: 'sounding_board' | 'manuscript' | 'vault';
  onSelectTab: (tab: 'sounding_board' | 'manuscript' | 'vault') => void;
  onOpenSnapshot: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
  authorEmail?: string;
  bookTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSnapshot,
  onOpenSettings,
  onLogout,
  authorEmail,
  bookTitle
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>AUTHOR STUDIO</Text>
          <Text style={styles.bookSubTitle} numberOfLines={1}>{bookTitle || 'Untitled Non-Fiction'}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.snapshotButton} onPress={onOpenSnapshot} activeOpacity={0.7}>
            <Text style={styles.snapshotIcon}>📸</Text>
            <Text style={styles.snapshotText}>Snapshot</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings} activeOpacity={0.7}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'sounding_board' && styles.activeTab]}
          onPress={() => onSelectTab('sounding_board')}
        >
          <Text style={[styles.tabText, currentTab === 'sounding_board' && styles.activeTabText]}>
            🎙️ Sounding Board
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentTab === 'manuscript' && styles.activeTab]}
          onPress={() => onSelectTab('manuscript')}
        >
          <Text style={[styles.tabText, currentTab === 'manuscript' && styles.activeTabText]}>
            ✍️ Manuscript & Diffs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentTab === 'vault' && styles.activeTab]}
          onPress={() => onSelectTab('vault')}
        >
          <Text style={[styles.tabText, currentTab === 'vault' && styles.activeTabText]}>
            🧠 Concept Vault
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 6
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  brandContainer: {
    flex: 1
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#38BDF8'
  },
  bookSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 2
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  snapshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4338CA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1'
  },
  snapshotIcon: {
    fontSize: 14,
    marginRight: 4
  },
  snapshotText: {
    color: '#EEF2FF',
    fontSize: 12,
    fontWeight: '700'
  },
  settingsButton: {
    backgroundColor: '#1E293B',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  settingsIcon: {
    fontSize: 14
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 6
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#38BDF8'
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500'
  },
  activeTabText: {
    color: '#F8FAFC',
    fontWeight: '700'
  }
});
