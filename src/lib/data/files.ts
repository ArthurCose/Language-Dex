import uuid from "react-native-uuid";
import * as FileSystem from "expo-file-system/legacy";

export const FILE_OBJECT_DIR = FileSystem.documentDirectory + "file-objects/";

export function saveFileObject(id: string, data: any) {
  return FileSystem.writeAsStringAsync(
    FILE_OBJECT_DIR + id,
    JSON.stringify(data),
  );
}

export function createNewFileObjectId() {
  return uuid.v4();
}

export function getFileObjectPath(id?: string | null) {
  return id != undefined ? FILE_OBJECT_DIR + id : id;
}

export async function saveNewFileObject(data: any) {
  const id = uuid.v4();

  await saveFileObject(id, data);

  return id;
}

export async function loadFileObject(id: string): Promise<any> {
  const data = await FileSystem.readAsStringAsync(FILE_OBJECT_DIR + id);

  if (typeof data == "string") {
    return JSON.parse(data);
  }
}

export function deleteFileObject(id: string) {
  return FileSystem.deleteAsync(FILE_OBJECT_DIR + id);
}

export async function fileExists(path: string) {
  try {
    return (await FileSystem.getInfoAsync(path)).exists;
  } catch {
    return false;
  }
}
