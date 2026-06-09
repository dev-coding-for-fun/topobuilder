import * as FileSystem from 'expo-file-system/legacy';

function itemUri(key: string) {
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Document storage is not available.');
  }
  return `${directory}settings-${encodeURIComponent(key)}.txt`;
}

export async function getItem(key: string) {
  const uri = itemUri(key);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return null;
  return FileSystem.readAsStringAsync(uri);
}

export async function setItem(key: string, value: string) {
  await FileSystem.writeAsStringAsync(itemUri(key), value);
}
