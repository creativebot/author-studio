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

const MAX_DESCRIPTION_SYMBOLS = 4000;
const MAX_TITLE_SYMBOLS = 140;

export const ConceptVaultView: React.FC<ConceptVaultViewProps> = ({
  project,
  onRefreshProject
}) => {
  const [activeTab, setActiveTab] = useState<'theories' | 'practices' | 'axioms' | 'style'>('theories');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit existing concept state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const handleStartEdit = (id: string, title: string, content: string) => {
    setEditingId(id);
    setEditTitle(title);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;

    try {
      if (activeTab === 'theories') {
        const item = project.concept_vault.theories.find(t => t.id === editingId);
        if (item) {
          item.name = editTitle.trim();
          item.description = editContent; // Preserves newlines and breaks
        }
      } else if (activeTab === 'practices') {
        const item = project.concept_vault.practices.find(p => p.id === editingId);
        if (item) {
          item.name = editTitle.trim();
          item.protocol = editContent; // Preserves newlines and breaks
        }
      } else if (activeTab === 'axioms') {
        const item = project.concept_vault.axioms.find(a => a.id === editingId);
        if (item) {
          item.context = editTitle.trim();
          item.statement = editContent; // Preserves newlines and breaks
        }
      }

      await ApiService.updateProject({ concept_vault: project.concept_vault });
      handleCancelEdit();
      onRefreshProject();
    } catch (err: any) {
      console.error('Failed to save edit:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      if (activeTab === 'theories') {
        project.concept_vault.theories = project.concept_vault.theories.filter(t => t.id !== id);
      } else if (activeTab === 'practices') {
        project.concept_vault.practices = project.concept_vault.practices.filter(p => p.id !== id);
      } else if (activeTab === 'axioms') {
        project.concept_vault.axioms = project.concept_vault.axioms.filter(a => a.id !== id);
      }

      await ApiService.updateProject({ concept_vault: project.concept_vault });
      if (editingId === id) handleCancelEdit();
      onRefreshProject();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
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
          onPress={() => { setActiveTab('theories'); handleCancelEdit(); }}
        >
          <Text style={[styles.tabText, activeTab === 'theories' && styles.activeTabText]}>
            🔬 Theories ({project.concept_vault.theories.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'practices' && styles.activeTab]}
          onPress={() => { setActiveTab('practices'); handleCancelEdit(); }}
        >
          <Text style={[styles.tabText, activeTab === 'practices' && styles.activeTabText]}>
            ⚡ Protocols ({project.concept_vault.practices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'axioms' && styles.activeTab]}
          onPress={() => { setActiveTab('axioms'); handleCancelEdit(); }}
        >
          <Text style={[styles.tabText, activeTab === 'axioms' && styles.activeTabText]}>
            📐 Axioms ({project.concept_vault.axioms.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'style' && styles.activeTab]}
          onPress={() => { setActiveTab('style'); handleCancelEdit(); }}
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
                {editingId === item.id ? (
                  <View style={styles.editCardBox}>
                    <TextInput
                      style={styles.formInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      maxLength={MAX_TITLE_SYMBOLS}
                      placeholder="Theory Name..."
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={[
                        styles.formInput,
                        styles.formTextArea,
                        focusedField === `edit_${item.id}` && styles.formTextAreaFocused
                      ]}
                      value={editContent}
                      onChangeText={setEditContent}
                      maxLength={MAX_DESCRIPTION_SYMBOLS}
                      onFocus={() => setFocusedField(`edit_${item.id}`)}
                      onBlur={() => setFocusedField(null)}
                      multiline
                      blurOnSubmit={false}
                      placeholder="Description (Press Enter for line breaks and empty lines)..."
                      placeholderTextColor="#64748B"
                    />
                    <View style={styles.counterRow}>
                      <Text style={styles.counterHint}>
                        {focusedField === `edit_${item.id}` ? '✨ Expanded to fit up to 4,000 symbols' : 'Click to enlarge • Enter for line breaks'}
                      </Text>
                      <Text style={[
                        styles.counterText,
                        editContent.length > MAX_DESCRIPTION_SYMBOLS * 0.9 && styles.counterWarning,
                        editContent.length >= MAX_DESCRIPTION_SYMBOLS && styles.counterError
                      ]}>
                        {editContent.length} / {MAX_DESCRIPTION_SYMBOLS} symbols
                      </Text>
                    </View>
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                          <Text style={styles.submitText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleStartEdit(item.id, item.name || '', item.description || '')}
                      >
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardBody}>{item.description}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'practices' && (
          <View>
            {project.concept_vault.practices.map((item) => (
              <View key={item.id} style={styles.card}>
                {editingId === item.id ? (
                  <View style={styles.editCardBox}>
                    <TextInput
                      style={styles.formInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      maxLength={MAX_TITLE_SYMBOLS}
                      placeholder="Protocol Name..."
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={[
                        styles.formInput,
                        styles.formTextArea,
                        focusedField === `edit_${item.id}` && styles.formTextAreaFocused
                      ]}
                      value={editContent}
                      onChangeText={setEditContent}
                      maxLength={MAX_DESCRIPTION_SYMBOLS}
                      onFocus={() => setFocusedField(`edit_${item.id}`)}
                      onBlur={() => setFocusedField(null)}
                      multiline
                      blurOnSubmit={false}
                      placeholder="Step-by-step protocol (Press Enter for line breaks and empty lines)..."
                      placeholderTextColor="#64748B"
                    />
                    <View style={styles.counterRow}>
                      <Text style={styles.counterHint}>
                        {focusedField === `edit_${item.id}` ? '✨ Expanded to fit up to 4,000 symbols' : 'Click to enlarge • Enter for line breaks'}
                      </Text>
                      <Text style={[
                        styles.counterText,
                        editContent.length > MAX_DESCRIPTION_SYMBOLS * 0.9 && styles.counterWarning,
                        editContent.length >= MAX_DESCRIPTION_SYMBOLS && styles.counterError
                      ]}>
                        {editContent.length} / {MAX_DESCRIPTION_SYMBOLS} symbols
                      </Text>
                    </View>
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                          <Text style={styles.submitText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleStartEdit(item.id, item.name || '', item.protocol || '')}
                      >
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardBody}>{item.protocol}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'axioms' && (
          <View>
            {project.concept_vault.axioms.map((item) => (
              <View key={item.id} style={styles.card}>
                {editingId === item.id ? (
                  <View style={styles.editCardBox}>
                    <TextInput
                      style={styles.formInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      maxLength={MAX_TITLE_SYMBOLS}
                      placeholder="Context / Domain..."
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={[
                        styles.formInput,
                        styles.formTextArea,
                        focusedField === `edit_${item.id}` && styles.formTextAreaFocused
                      ]}
                      value={editContent}
                      onChangeText={setEditContent}
                      maxLength={MAX_DESCRIPTION_SYMBOLS}
                      onFocus={() => setFocusedField(`edit_${item.id}`)}
                      onBlur={() => setFocusedField(null)}
                      multiline
                      blurOnSubmit={false}
                      placeholder="Axiom statement (Press Enter for line breaks and empty lines)..."
                      placeholderTextColor="#64748B"
                    />
                    <View style={styles.counterRow}>
                      <Text style={styles.counterHint}>
                        {focusedField === `edit_${item.id}` ? '✨ Expanded to fit up to 4,000 symbols' : 'Click to enlarge • Enter for line breaks'}
                      </Text>
                      <Text style={[
                        styles.counterText,
                        editContent.length > MAX_DESCRIPTION_SYMBOLS * 0.9 && styles.counterWarning,
                        editContent.length >= MAX_DESCRIPTION_SYMBOLS && styles.counterError
                      ]}>
                        {editContent.length} / {MAX_DESCRIPTION_SYMBOLS} symbols
                      </Text>
                    </View>
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                          <Text style={styles.submitText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.context || 'Axiom'}</Text>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleStartEdit(item.id, item.context || '', item.statement || '')}
                      >
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardBody}>{item.statement}</Text>
                  </View>
                )}
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

        {activeTab !== 'style' && !editingId && (
          <View style={styles.addItemSection}>
            {isAdding ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Concept or Model Name..."
                  placeholderTextColor="#64748B"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={MAX_TITLE_SYMBOLS}
                />
                <TextInput
                  style={[
                    styles.formInput,
                    styles.formTextArea,
                    focusedField === 'new' && styles.formTextAreaFocused
                  ]}
                  multiline
                  blurOnSubmit={false}
                  placeholder="Explain the theory or protocol steps (Press Enter for line breaks and empty lines)..."
                  placeholderTextColor="#64748B"
                  value={newContent}
                  onChangeText={setNewContent}
                  maxLength={MAX_DESCRIPTION_SYMBOLS}
                  onFocus={() => setFocusedField('new')}
                  onBlur={() => setFocusedField(null)}
                />
                <View style={styles.counterRow}>
                  <Text style={styles.counterHint}>
                    {focusedField === 'new' ? '✨ Expanded to fit up to 4,000 symbols' : 'Click to enlarge • Enter for line breaks'}
                  </Text>
                  <Text style={[
                    styles.counterText,
                    newContent.length > MAX_DESCRIPTION_SYMBOLS * 0.9 && styles.counterWarning,
                    newContent.length >= MAX_DESCRIPTION_SYMBOLS && styles.counterError
                  ]}>
                    {newContent.length} / {MAX_DESCRIPTION_SYMBOLS} symbols
                  </Text>
                </View>
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
    flex: 1
  },
  editBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  editBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  cardDesc: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12
  },
  cardBody: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 22,
    whiteSpace: 'pre-wrap'
  } as any,
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
    lineHeight: 18,
    whiteSpace: 'pre-wrap'
  } as any,
  editCardBox: {
    paddingTop: 4
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#7F1D1D'
  },
  deleteBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600'
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  formTextArea: {
    minHeight: 180,
    maxHeight: 320,
    textAlignVertical: 'top',
    lineHeight: 22,
    fontSize: 14
  },
  formTextAreaFocused: {
    minHeight: 400,
    maxHeight: 650,
    borderColor: '#38BDF8',
    backgroundColor: '#0F172A'
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 4
  },
  counterHint: {
    color: '#64748B',
    fontSize: 11
  },
  counterText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  counterWarning: {
    color: '#F59E0B'
  },
  counterError: {
    color: '#EF4444'
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
