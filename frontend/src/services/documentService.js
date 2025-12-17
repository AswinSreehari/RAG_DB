const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Upload multiple documents to the backend for text extraction
 * @param {File[]} files - Array of File objects to upload
 * @returns {Promise<Object>} Upload results for each file
 */
export const uploadDocuments = async (files) => {
  try {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${BACKEND_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};

/**
 * Get list of all uploaded documents
 * @returns {Promise<Object>} List of documents
 */
export const listDocuments = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/documents`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing documents:', error);
    throw error;
  }
};

/**
 * Get a specific document by ID
 * @param {number} id - Document ID
 * @returns {Promise<Object>} Document details
 */
export const getDocumentById = async (id) => {
  try {
    const response = await fetch(`${BACKEND_URL}/documents/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching document:', error);
    throw error;
  }
};

/**
 * Get the URL for a document's PDF preview
 * @param {number} id - Document ID
 * @returns {string} PDF URL
 */
export const getDocumentPdfUrl = (id) => {
  return `${BACKEND_URL}/documents/${id}/pdf`;
};

/**
 * Delete a document by ID
 * @param {number} id - Document ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteDocument = async (id) => {
  try {
    const response = await fetch(`${BACKEND_URL}/documents/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export default {
  uploadDocuments,
  listDocuments,
  getDocumentById,
  getDocumentPdfUrl,
  deleteDocument,
};
