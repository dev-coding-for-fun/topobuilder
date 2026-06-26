import { Stack, usePathname } from 'expo-router';

import { stackScreenOptionsForPathname } from '@/navigation/stackScreenOptions';

export default function IssuesLayout() {
  const pathname = usePathname();

  return <Stack screenOptions={stackScreenOptionsForPathname(pathname)} />;
}
