import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { issueColors } from '@/issues/colors';
import type { IssueEdits, SaveIssueResult } from '@/issues/save';
import type { IssueAttachment, IssueDetail } from '@/storage/repos/tabvarIssuesRepo';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

type Props = {
  issue?: IssueDetail;
  onClose: () => void;
  onOpenAttachment: (attachment: IssueAttachment) => void;
  onSave: (issue: IssueDetail, edits: IssueEdits) => Promise<SaveIssueResult>;
};

export function IssueDetailSheet({ issue, onClose, onOpenAttachment, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [draftDescription, setDraftDescription] = useState('');
  const [draftFlagged, setDraftFlagged] = useState('');

  useEffect(() => {
    setSaving(false);
    setError(undefined);
    setDraftDescription(issue?.description ?? '');
    setDraftFlagged(issue?.flaggedMessage ?? '');
  }, [issue?.id]);

  function handleClose() {
    setError(undefined);
    onClose();
  }

  async function submit(status: string) {
    if (!issue || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const result = await onSave(issue, {
        description: draftDescription,
        flaggedMessage: draftFlagged,
        status,
      });
      if (result.conflict) {
        setError('This issue was updated elsewhere. The latest version is now shown.');
        applyIssue(result.issue);
        return;
      }
      handleClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this issue.');
    } finally {
      setSaving(false);
    }
  }

  function applyIssue(next?: IssueDetail) {
    if (!next) return;
    setDraftDescription(next.description ?? '');
    setDraftFlagged(next.flaggedMessage ?? '');
  }

  const dirty =
    Boolean(issue) &&
    (draftDescription !== (issue?.description ?? '') ||
      draftFlagged !== (issue?.flaggedMessage ?? ''));
  const resolved = issue?.status === 'Completed';
  const meta = issue
    ? [issue.sectorName, issue.gradeYds].filter(Boolean).join(' · ') || `Route #${issue.routeId}`
    : '';

  return (
    <BottomSheet
      onClose={handleClose}
      testID="issues:detail-sheet"
      title={issue ? issue.routeName : 'Issue'}
      visible={Boolean(issue)}
    >
      {issue ? (
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View style={[styles.status, resolved ? styles.statusDone : styles.statusOpen]}>
              <Text
                style={[styles.statusText, resolved ? styles.statusTextDone : styles.statusTextOpen]}
              >
                {issue.status}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.meta}>
              {meta}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              accessibilityLabel="Description"
              multiline
              onChangeText={setDraftDescription}
              placeholder="Add description"
              placeholderTextColor={issueColors.faint}
              style={[styles.input, styles.multiline]}
              testID="issues:detail:description"
              textAlignVertical="top"
              value={draftDescription}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Flagged message</Text>
            <TextInput
              accessibilityLabel="Flagged message"
              multiline
              onChangeText={setDraftFlagged}
              placeholder="Add flagged message"
              placeholderTextColor={issueColors.faint}
              style={[styles.input, styles.multiline]}
              testID="issues:detail:flagged"
              textAlignVertical="top"
              value={draftFlagged}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Attachments</Text>
            {issue.attachments.length === 0 ? (
              <Text style={styles.emptyBody}>No attachments.</Text>
            ) : (
              <View style={styles.attachmentGrid}>
                {issue.attachments.map((attachment, index) => (
                  <View key={attachment.id} style={styles.attachmentCell}>
                    <Pressable
                      accessibilityLabel={`Open attachment ${index + 1}`}
                      accessibilityRole="button"
                      onPress={() => onOpenAttachment(attachment)}
                      style={({ pressed }) => [
                        styles.attachmentTile,
                        pressed && styles.attachmentPressed,
                      ]}
                      testID={`issues:detail:attachment:${attachment.id}`}
                    >
                      {attachment.mimeType.startsWith('image/') ? (
                        <Image
                          accessibilityIgnoresInvertColors
                          resizeMode="cover"
                          source={{ uri: attachment.url }}
                          style={styles.attachmentImage}
                          testID={`issues:detail:attachment:${attachment.id}:image`}
                        />
                      ) : (
                        <View style={styles.attachmentFallback}>
                          <Ionicons color={issueColors.muted} name="document-outline" size={22} />
                        </View>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.error} testID="issues:detail:error">
              <Ionicons color={issueColors.danger} name="alert-circle" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                disabled={saving}
                label="Cancel"
                onPress={handleClose}
                testID="issues:detail:cancel"
                variant="secondary"
              />
            </View>
            <View style={styles.action}>
              <Button
                disabled={saving || !dirty}
                label={saving ? 'Saving…' : 'Save'}
                onPress={() => {
                  void submit(issue.status);
                }}
                testID="issues:detail:save"
              />
            </View>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  attachmentCell: {
    aspectRatio: 1,
    padding: 4,
    width: '33.333%',
  },
  attachmentFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  attachmentImage: {
    height: '100%',
    width: '100%',
  },
  attachmentPressed: {
    opacity: 0.7,
  },
  attachmentTile: {
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    gap: 18,
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyBody: {
    color: issueColors.faint,
    fontSize: 14,
  },
  error: {
    backgroundColor: issueColors.dangerBg,
    borderColor: issueColors.dangerBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  errorText: {
    color: issueColors.danger,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  field: {
    gap: 8,
  },
  input: {
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 12,
    borderWidth: 1,
    color: issueColors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  meta: {
    color: issueColors.muted,
    flexShrink: 1,
    fontSize: 13,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  multiline: {
    minHeight: 92,
  },
  status: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusDone: {
    backgroundColor: issueColors.doneBg,
  },
  statusOpen: {
    backgroundColor: issueColors.openBg,
  },
  statusText: {
    fontSize: 12,
    ...interStyle('700'),
  },
  statusTextDone: {
    color: issueColors.doneFg,
  },
  statusTextOpen: {
    color: issueColors.openFg,
  },
});
