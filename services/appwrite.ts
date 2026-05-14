import { Client, Account, Databases } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69f5bb520009d38fcfb4'; // from the plan

client
    .setEndpoint(endpoint)
    .setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);

// Replace these with your actual Appwrite IDs or load them from .env.local
export const APPWRITE_CONFIG = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || 'main_db',
    collectionIdBatches: import.meta.env.VITE_APPWRITE_COLLECTION_BATCHES || 'batches',
    collectionIdCourses: import.meta.env.VITE_APPWRITE_COLLECTION_COURSES || 'courses',
    collectionIdUsersProfile: import.meta.env.VITE_APPWRITE_COLLECTION_USERS_PROFILE || 'usersProfile',
    collectionIdStudentResults: import.meta.env.VITE_APPWRITE_COLLECTION_STUDENT_RESULTS || 'studentResults',
    collectionIdImportJobs: import.meta.env.VITE_APPWRITE_COLLECTION_IMPORT_JOBS || 'importJobs',
    collectionIdExportJobs: import.meta.env.VITE_APPWRITE_COLLECTION_EXPORT_JOBS || 'exportJobs',
};
