// hooks/useUpload.js - Enhanced Version Compatible with Existing Structure
import { useState, useCallback } from 'react';
import uploadService from '../services/uploadService.js';

export const useUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadResult(null);

    try {
      console.log('🚀 Starting enhanced upload for:', file.name);

      // Use the enhanced upload service
      const result = await uploadService.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadResult(result);
      console.log('✅ Upload successful:', result);
      return { success: true, ...result };

    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isUploading,
    uploadProgress,
    uploadResult,
    uploadError,
    handleFileUpload,
  };
};