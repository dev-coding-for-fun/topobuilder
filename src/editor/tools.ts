import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { EditorTool } from '@/domain/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const editorTools: Array<{ id: EditorTool; label: string; icon: IoniconName }> = [
  { id: 'select', label: 'Select', icon: 'navigate-outline' },
  { id: 'bolt', label: 'Bolt', icon: 'hammer-outline' },
  { id: 'anchor', label: 'Anchor', icon: 'git-network-outline' },
  { id: 'belay', label: 'Belay', icon: 'hand-left-outline' },
  { id: 'rappel', label: 'Rappel', icon: 'arrow-down-outline' },
  { id: 'start', label: 'Start', icon: 'flag-outline' },
  { id: 'label', label: 'Label', icon: 'text-outline' },
  { id: 'arrow', label: 'Arrow', icon: 'arrow-forward-outline' },
  { id: 'climbLine', label: 'Line', icon: 'trending-up-outline' },
  { id: 'walkoff', label: 'Walkoff', icon: 'walk-outline' },
  { id: 'scramble', label: 'Scramble', icon: 'trail-sign-outline' },
];
