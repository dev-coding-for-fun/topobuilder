import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IssueAttachment, IssueDetail } from '@/storage/repos/tabvarIssuesRepo';
import { BottomSheet } from '@/ui/BottomSheet';
import { interStyle } from '@/ui/fonts';

type Props = {
  issue?: IssueDetail;
  onClose: () => void;
  onOpenAttachment: (attachment: IssueAttachment) => void;
};

export function IssueDetailSheet({ issue, onClose, onOpenAttachment }: Props) {
  return (
    <BottomSheet
      onClose={onClose}
      testID="issues:detail-sheet"
      title={issue ? issue.routeName : 'Issue'}
      visible={Boolean(issue)}
    >
      {issue ? (
        <View style={styles.content}>
          <Text style={styles.kicker}>
            {[issue.sectorName, issue.gradeYds].filter(Boolean).join(' · ') || `Route #${issue.routeId}`}
          </Text>

          <Info label="Type" value={[issue.issueType, issue.subIssueType].filter(Boolean).join(' · ')} />
          <Info label="Status" value={issue.status} />
          {issue.lastStatus ? <Info label="Previous status" value={issue.lastStatus} /> : null}
          {issue.boltsAffected ? <Info label="Bolts affected" value={issue.boltsAffected} /> : null}
          {issue.reportedBy ? <Info label="Reported by" value={issue.reportedBy} /> : null}
          {issue.createdAt ? <Info label="Created" value={issue.createdAt} /> : null}
          <Info label="Updated" value={issue.updatedAt} />

          {issue.description ? (
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.body}>{issue.description}</Text>
            </View>
          ) : null}

          {issue.flaggedMessage ? (
            <View style={styles.section}>
              <Text style={styles.label}>Flagged message</Text>
              <Text style={styles.flagged}>{issue.flaggedMessage}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>Attachments</Text>
            {issue.attachments.length === 0 ? (
              <Text style={styles.body}>No attachments.</Text>
            ) : (
              issue.attachments.map((attachment) => (
                <Pressable
                  accessibilityLabel={`Open attachment ${attachment.name}`}
                  accessibilityRole="button"
                  key={attachment.id}
                  onPress={() => onOpenAttachment(attachment)}
                  style={({ pressed }) => [styles.attachment, pressed && styles.attachmentPressed]}
                  testID={`issues:detail:attachment:${attachment.id}`}
                >
                  <Ionicons color="#374151" name="image-outline" size={18} />
                  <View style={styles.attachmentBody}>
                    <Text numberOfLines={1} style={styles.attachmentName}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.attachmentType}>{attachment.mimeType}</Text>
                  </View>
                  <Ionicons color="#6B7280" name="chevron-forward" size={18} />
                </Pressable>
              ))
            )}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  attachment: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  attachmentBody: {
    flex: 1,
  },
  attachmentName: {
    color: '#111827',
    fontSize: 14,
    ...interStyle('700'),
  },
  attachmentPressed: {
    opacity: 0.7,
  },
  attachmentType: {
    color: '#6B7280',
    fontSize: 12,
  },
  body: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    gap: 14,
    paddingBottom: 12,
  },
  flagged: {
    color: '#92400E',
    fontSize: 15,
    lineHeight: 22,
  },
  infoLabel: {
    color: '#6B7280',
    flex: 1,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoValue: {
    color: '#111827',
    flex: 1.5,
    fontSize: 13,
    textAlign: 'right',
    ...interStyle('700'),
  },
  kicker: {
    color: '#6B7280',
    fontSize: 13,
  },
  label: {
    color: '#111827',
    fontSize: 14,
    ...interStyle('800'),
  },
  section: {
    gap: 8,
  },
});
