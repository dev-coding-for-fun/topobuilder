import type { ConnectedCragSummary } from '@/domain/types';
import { CragCard } from '@/ui/CragCard';

type Props = {
  item: ConnectedCragSummary;
  onPress: () => void;
};

export function ConnectedCragCard({ item, onPress }: Props) {
  return <CragCard onOpen={onPress} summary={item} variant="connected" />;
}
