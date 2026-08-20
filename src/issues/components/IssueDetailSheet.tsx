import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { IssuePhotoUpload } from '@/issues/attachments';
import { issueColors } from '@/issues/colors';
import { IssueAttachmentsField } from '@/issues/components/IssueAttachmentsField';
import { IssueFlagField } from '@/issues/components/IssueFlagField';
import { IssueSelectField } from '@/issues/components/IssueSelectField';
import { ISSUE_TYPES, SUB_ISSUES_BY_TYPE } from '@/issues/options';
import type { IssueEdits, SaveIssueResult } from '@/issues/save';
import type { IssueAttachment, IssueDetail } from '@/storage/repos/tabvarIssuesRepo';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

type Props = {
  issue?: IssueDetail;
  onAddAttachment: (issue: IssueDetail, photo: IssuePhotoUpload) => Promise<IssueDetail>;
  onClose: () => void;
  onOpenAttachment: (attachment: IssueAttachment) => void;
  onRemovePendingAttachment?: (attachmentId: string) => Promise<void>;
  onSave: (issue: IssueDetail, edits: IssueEdits) => Promise<SaveIssueResult>;
};

export function IssueDetailSheet({
  issue,
  onAddAttachment,
  onClose,
  onOpenAttachment,
  onRemovePendingAttachment,
  onSave,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [attachmentsChanged, setAttachmentsChanged] = useState(false);
  const [draftIssueType, setDraftIssueType] = useState('');
  const [draftSubIssueType, setDraftSubIssueType] = useState<string | undefined>();
  const [draftDescription, setDraftDescription] = useState('');
  const [draftBoltsAffected, setDraftBoltsAffected] = useState('');
  const [draftFlagged, setDraftFlagged] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [flagError, setFlagError] = useState<string>();

  useEffect(() => {
    setSaving(false);
    setAdding(false);
    setError(undefined);
    setAttachmentsChanged(false);
    setDraftIssueType(issue?.issueType ?? '');
    setDraftSubIssueType(issue?.subIssueType);
    setDraftDescription(issue?.description ?? '');
    setDraftBoltsAffected(issue?.boltsAffected ?? '');
    setDraftFlagged(issue?.flaggedMessage ?? '');
    setFlagged(Boolean(issue?.flaggedMessage));
    setFlagError(undefined);
  }, [issue?.id]);

  const originalFlaggedMessage = issue?.flaggedMessage ?? '';
  const originalFlagged = Boolean(originalFlaggedMessage);
  const nextFlaggedMessage = flagged ? draftFlagged : '';
  const dirty =
    Boolean(issue) &&
    (draftIssueType !== (issue?.issueType ?? '') ||
      draftSubIssueType !== issue?.subIssueType ||
      draftDescription !== (issue?.description ?? '') ||
      draftBoltsAffected !== (issue?.boltsAffected ?? '') ||
      flagged !== originalFlagged ||
      nextFlaggedMessage !== originalFlaggedMessage);
  const canSave = dirty || attachmentsChanged;
  const resolved = issue?.status === 'Completed';

  function handleClose() {
    setError(undefined);
    setFlagError(undefined);
    onClose();
  }

  async function submit(status: string) {
    if (!issue || saving || adding) return;
    if (!dirty) {
      handleClose();
      return;
    }
    if (flagged && !draftFlagged.trim()) {
      setFlagError('A message is required.');
      return;
    }
    setSaving(true);
    setError(undefined);
    setFlagError(undefined);
    try {
      const result = await onSave(issue, {
        boltsAffected: draftIssueType === 'Bolts' ? draftBoltsAffected : undefined,
        description: draftDescription,
        flaggedMessage: nextFlaggedMessage,
        issueType: draftIssueType,
        status,
        subIssueType: draftSubIssueType,
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
    setDraftIssueType(next.issueType);
    setDraftSubIssueType(next.subIssueType);
    setDraftDescription(next.description ?? '');
    setDraftBoltsAffected(next.boltsAffected ?? '');
    setDraftFlagged(next.flaggedMessage ?? '');
    setFlagged(Boolean(next.flaggedMessage));
    setFlagError(undefined);
  }

  async function handleAddPhoto(photo: IssuePhotoUpload) {
    if (!issue) return;
    setAdding(true);
    setError(undefined);
    try {
      await onAddAttachment(issue, photo);
      setAttachmentsChanged(true);
    } finally {
      setAdding(false);
    }
  }

  const subIssues = draftIssueType ? SUB_ISSUES_BY_TYPE[draftIssueType] ?? [] : [];
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

          <IssueSelectField
            accessibilityLabel="What is affected?"
            label="What is affected?"
            onChange={(value) => {
              setDraftIssueType(value);
              setDraftSubIssueType(undefined);
              setError(undefined);
            }}
            options={ISSUE_TYPES.map((item) => ({ label: item.label, value: item.value }))}
            placeholder="Choose what is affected"
            testID="issues:detail:type"
            value={draftIssueType}
          />

          <IssueSelectField
            accessibilityLabel="Issue type"
            disabled={subIssues.length === 0}
            disabledMessage="Choose what is affected first."
            label="Issue type"
            onChange={setDraftSubIssueType}
            options={subIssues.map((item) => ({ label: item, value: item }))}
            placeholder="Choose an issue type"
            testID="issues:detail:subtype"
            value={draftSubIssueType}
          />

          {draftIssueType === 'Bolts' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Bolts affected</Text>
              <TextInput
                accessibilityLabel="Bolts affected"
                autoCapitalize="none"
                onChangeText={setDraftBoltsAffected}
                placeholder="e.g. 1, 2, 3"
                placeholderTextColor={issueColors.faint}
                style={styles.input}
                testID="issues:detail:bolts"
                value={draftBoltsAffected}
              />
            </View>
          ) : null}

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

          <IssueFlagField
            error={flagError}
            flagged={flagged}
            message={draftFlagged}
            onFlaggedChange={(next) => {
              setFlagged(next);
              setFlagError(undefined);
            }}
            onMessageChange={(next) => {
              setDraftFlagged(next);
              setFlagError(undefined);
            }}
            testID="issues:detail"
          />

          <IssueAttachmentsField
            busy={saving || adding}
            onAddPhoto={handleAddPhoto}
            onError={setError}
            photos={issue.attachments.map((attachment) => ({
              key: String(attachment.id),
              mimeType: attachment.mimeType,
              name: attachment.name,
              onPress: () => onOpenAttachment(attachment),
              onRemove: attachment.pendingSync && onRemovePendingAttachment
                ? () => {
                    setAttachmentsChanged(true);
                    void onRemovePendingAttachment(String(attachment.id));
                  }
                : undefined,
              testID: `issues:detail:attachment:${attachment.id}`,
              uri: attachment.url,
            }))}
            testID="issues:detail"
          />

          {error ? (
            <View style={styles.error} testID="issues:detail:error">
              <Ionicons color={issueColors.danger} name="alert-circle" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                disabled={saving || adding}
                label="Cancel"
                onPress={handleClose}
                testID="issues:detail:cancel"
                variant="secondary"
              />
            </View>
            <View style={styles.action}>
              <Button
                disabled={saving || adding || !canSave}
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
  content: {
    gap: 18,
    paddingBottom: 12,
    paddingTop: 4,
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
