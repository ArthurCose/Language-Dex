import { deleteExportDb, deleteImportDb } from "./export-import";

export function launchCleanup() {
  return Promise.all([deleteExportDb(), deleteImportDb()]);
}
