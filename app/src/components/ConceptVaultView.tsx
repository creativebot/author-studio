import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { ApiService } from '../services/api';
import { ProjectData } from '../types';

interface ConceptVaultViewProps {
  project: ProjectData;
  onRefreshProject: () => void;
}

export const ConceptVaultView: React.FC<ConceptVaultViewProps> = ({
  project,
  onRefreshProject
}) => {
  const [activeTab, setActiveTab] = useState<'theories' | 'practices' | 'axioms' | 'style'>('theories');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNewItem = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      if (activeTab === 'theories') {
        project.concept_vault.theories.push({
          id: `th_${Date.now()}`,
          name: newTitle.trim(),
          description: newContent.trim()
        });
      } else if (activeTab === 'practices') {
        project.concept_vault.practices.push({
          id: `pr_${Date.now()}`,
          name: newTitle.trim(),
          protocol: newContent.trim()
        });
      } else if (activeTab === 'axioms') {
        project.concept_vault.axioms.push({
          id: `ax_${Date.now()}`,
          context: newTitle.trim(),
          statement: newContent.trim()
        });
      }

      await ApiService.updateProject({ concept_vault: project.concept_vault });
      setNewTitle('');
      setNewContent('');
      setIsAdding(false);
      onRefreshProject();
    } catch (err: any) {
      console.error('Failed to add concept:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge & Method Vault</Text>
        <Text style={styles.subtitle}>
          The intellectual bedrock of your book: persistent theories, named models, practical protocols, and learned style rules.
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'theories' && styles.activeTab]}
          onPress={() => setActiveTab('theories')}
        >
          <Text style={[styles.tabText, activeTab === 'theories' && styles.activeTabText]}>
            🔬 Theories ({project.concept_vault.theories.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'practices' && styles.activeTab]}
          onPress={() => setActiveTab('practices')}
        >
          <Text style={[styles.tabText, activeTab === 'practices' && styles.activeTabText]}>
            ⚡ Protocols ({project.concept_vault.practices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'axioms' && styles.activeTab]}
          onPress={() => setActiveTab('axioms')}
        >
          <Text style={[styles.tabText, activeTab === 'axioms' && styles.activeTabText]}>
            📐 Axioms ({project.concept_vault.axioms.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'style' && styles.activeTab]}
          onPress={() => setActiveTab('style')}
        >
          <Text style={[styles.tabText, activeTab === 'style' && styles.activeTabText]}>
            🎨 Style DNA ({project.style_guidelines.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
        {activeTab === 'theories' && (
          <View>
            {project.concept_vault.theories.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardBody}>{item.description}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'practices' && (
          <View>
            {project.concept_vault.practices.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardBody}>{item.protocol}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'axioms' && (
          <View>
            {project.concept_vault.axioms.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.context || 'Axiom'}</Text>
                <Text style={styles.cardBody}>{item.statement}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'style' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Learned Author Style Guidelines</Text>
              <Text style={styles.cardDesc}>
                These rules are automatically fed to Gemini during diff review to ensure it honors your natural cadence and never repeats rejected patterns.
              </Text>
              {project.style_guidelines.map((rule, idx) => (
                <View key={idx} style={styles.ruleItem}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab !== 'style' && (
          <View style={styles.addItemSection}>
            {isAdding ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Concept or Model Name..."
                  placeholderTextColor="#64748B"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  multiline
                  placeholder="Explain the theory or protocol steps..."
                  placeholderTextColor="#64748B"
                  value={newContent}
                  onChangeText={setNewContent}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAdding(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleAddNewItem}>
                    <Text style={styles.submitText}>Save to Vault</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
                <Text style={styles.addBtnText}>+ Add New {activeTab.slice(0, -1)}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  header: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 8
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 4
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#38BDF8'
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  activeTabText: {
    color: '#F8FAFC',
    fontWeight: '700'
  },
  listScroll: {
    flex: 1
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 12
  },
  cardTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  cardDesc: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12
  },
  cardBody: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 20
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  ruleBullet: {
    color: '#38BDF8',
    fontSize: 16,
    marginRight: 8,
    lineHeight: 18
  },
  ruleText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18
  },
  addItemSection: {
    marginTop: 12
  },
  addBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  addBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  },
  addForm: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12
  },
  formInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 10
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  cancelBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 12
  },
  submitBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6
  },
  submitText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700'
  }
});
