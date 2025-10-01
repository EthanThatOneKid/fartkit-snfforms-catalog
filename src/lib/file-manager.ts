import { createKvStore } from "@kitsonk/kv-toolbox";

// Initialize KV store for file management
const kv = await Deno.openKv();
const fileStore = createKvStore(kv, "files");

export interface FileMetadata {
  formId: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  previewType: 'image' | 'pdf';
}

/**
 * Upload a file to KV storage
 */
export async function uploadFile(
  formId: string,
  file: File,
  previewType: 'image' | 'pdf' = 'image'
): Promise<FileMetadata> {
  const filename = `${formId}_${Date.now()}_${file.name}`;
  const fileData = new Uint8Array(await file.arrayBuffer());
  
  const metadata: FileMetadata = {
    formId,
    filename,
    originalName: file.name,
    contentType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    previewType
  };

  // Store file data with filename as key
  await fileStore.set(filename, fileData);
  
  // Store metadata with a separate key for easy querying
  await kv.set([`file_metadata`, filename], metadata);
  
  // Store filename in form's file list
  const formFilesKey = [`form_files`, formId];
  const existingFiles = await kv.get<string[]>(formFilesKey);
  const fileList = existingFiles.value || [];
  fileList.push(filename);
  await kv.set(formFilesKey, fileList);

  return metadata;
}

/**
 * Delete a file from KV storage
 */
export async function deleteFile(filename: string): Promise<boolean> {
  try {
    // Get metadata first to find formId
    const metadataKey = [`file_metadata`, filename];
    const metadataResult = await kv.get<FileMetadata>(metadataKey);
    
    if (!metadataResult.value) {
      return false;
    }

    const formId = metadataResult.value.formId;

    // Delete file data
    await fileStore.delete(filename);
    
    // Delete metadata
    await kv.delete(metadataKey);
    
    // Remove from form's file list
    const formFilesKey = [`form_files`, formId];
    const existingFiles = await kv.get<string[]>(formFilesKey);
    if (existingFiles.value) {
      const updatedFileList = existingFiles.value.filter(f => f !== filename);
      await kv.set(formFilesKey, updatedFileList);
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get file data from KV storage
 */
export async function getFile(filename: string): Promise<Uint8Array | null> {
  try {
    return await fileStore.get(filename);
  } catch (error) {
    console.error('Error getting file:', error);
    return null;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(filename: string): Promise<FileMetadata | null> {
  try {
    const result = await kv.get<FileMetadata>([`file_metadata`, filename]);
    return result.value;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

/**
 * Get all files for a specific form
 */
export async function getFormFiles(formId: string): Promise<FileMetadata[]> {
  try {
    const formFilesKey = [`form_files`, formId];
    const result = await kv.get<string[]>(formFilesKey);
    
    if (!result.value) {
      return [];
    }

    const metadataPromises = result.value.map(filename => getFileMetadata(filename));
    const metadataResults = await Promise.all(metadataPromises);
    
    return metadataResults.filter((metadata): metadata is FileMetadata => metadata !== null);
  } catch (error) {
    console.error('Error getting form files:', error);
    return [];
  }
}

/**
 * Generate a URL for accessing a file
 */
export function getFileUrl(filename: string): string {
  return `/api/files/${filename}`;
}