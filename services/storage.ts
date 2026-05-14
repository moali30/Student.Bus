import { ID, Query } from 'appwrite';
import { databases, account, APPWRITE_CONFIG } from './appwrite';
import {
  Batch,
  Course,
  DataJobStatus,
  DataTransferJob,
  ImportRunReport,
  StudentResult,
  User,
  UserRole
} from '../types';

const {
  databaseId,
  collectionIdBatches,
  collectionIdCourses,
  collectionIdUsersProfile,
  collectionIdStudentResults,
  collectionIdImportJobs,
  collectionIdExportJobs
} = APPWRITE_CONFIG;

const LIST_LIMIT = 100;
const CACHE_TTL_MS = 30_000;

const memoryCache = new Map<string, { expiresAt: number; value: any }>();

const getCached = <T>(key: string): T | null => {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value as T;
};

const setCached = (key: string, value: any, ttlMs = CACHE_TTL_MS) => {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const invalidateCache = (...keys: string[]) => {
  keys.forEach(k => memoryCache.delete(k));
};

const listAllDocuments = async (collectionId: string, queries: string[] = []) => {
  const all: any[] = [];
  let cursor: string | null = null;

  while (true) {
    const pageQueries = [...queries, Query.limit(LIST_LIMIT)];
    if (cursor) {
      pageQueries.push(Query.cursorAfter(cursor));
    }

    const page = await databases.listDocuments(databaseId, collectionId, pageQueries);
    all.push(...page.documents);

    if (page.documents.length < LIST_LIMIT) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return all;
};

const chunkArray = <T>(arr: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
};

const normalizeResultPayload = (result: StudentResult) => ({
  studentId: result.studentId.trim(),
  studentName: result.studentName.trim(),
  program: (result.program || '').trim(),
  courseId: result.courseId,
  batchId: result.batchId,
  quizScores: JSON.stringify(result.quizScores),
  assignmentScores: JSON.stringify(result.assignmentScores),
  bonusScore: result.bonusScore === null ? null : Number(result.bonusScore),
  calculatedTotal: Number(result.calculatedTotal),
  isLocked: !!result.isLocked
});

const createAccountREST = async (userId: string, email: string, password: string, name: string) => {
    const response = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': import.meta.env.VITE_APPWRITE_API_KEY
        },
        body: JSON.stringify({ userId, email, password, name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create user account');
    return data;
};

const deleteAccountREST = async (userId: string) => {
    const response = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': import.meta.env.VITE_APPWRITE_API_KEY
        }
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user account');
    }
};

export const StorageService = {
  setupSystem: async () => {
    return { status: 'success', message: 'System setup is managed via Appwrite Console.' };
  },

  login: async (username: string, pass: string): Promise<User | null> => {
    try {
      // Try to delete current session first to avoid "session already active" error
      try {
        await account.deleteSession('current');
      } catch (e) {
        // Ignore if no session exists
      }

      const email = `${username.trim().toLowerCase()}@mental.edu`; 
      await account.createEmailPasswordSession(email, pass.trim());
      
      const profiles = await databases.listDocuments(
        databaseId,
        collectionIdUsersProfile,
        [Query.equal('username', username.trim())]
      );

      if (profiles.documents.length === 0) {
        throw new Error('User profile not found.');
      }

      const doc = profiles.documents[0];
      return {
        id: doc.$id,
        name: doc.name,
        username: doc.username,
        role: doc.role as UserRole,
        assignedCourseIds: doc.assignedCourseIds || [] 
      };
    } catch (error: any) {
      console.error('Login Error:', error);
      throw new Error(error.message);
    }
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    try {
        const acc = await account.get();
        if (acc) {
            // Find profile by username (which is the email prefix)
            const username = acc.email.split('@')[0];
            const profiles = await databases.listDocuments(
                databaseId,
                collectionIdUsersProfile,
                [Query.equal('username', username)]
            );

            if (profiles.documents.length > 0) {
                const doc = profiles.documents[0];
                return {
                    id: doc.$id,
                    name: doc.name,
                    username: doc.username,
                    role: doc.role as UserRole,
                    assignedCourseIds: doc.assignedCourseIds || []
                };
            }
        }
        return null;
    } catch (e) {
        return null;
    }
  },

  logout: async () => {
    try {
       await account.deleteSession('current');
    } catch (e) {}
  },

  getUsers: async (): Promise<User[]> => {
    const cacheKey = 'users:all';
    const cached = getCached<User[]>(cacheKey);
    if (cached) return cached;

    const docs = await listAllDocuments(collectionIdUsersProfile);
    const users = docs.map(doc => ({
      id: doc.$id,
      name: doc.name,
      username: doc.username,
      role: doc.role as UserRole,
      assignedCourseIds: doc.assignedCourseIds || []
    }));
    setCached(cacheKey, users);
    return users;
  },
  
  saveUser: async (user: User) => {
    if (!user.id || user.id.startsWith('new_')) {
        const email = `${user.username.trim().toLowerCase()}@mental.edu`;
        const pass = user.password || '12345678'; 
        const userId = ID.unique();
        
        const acc = await createAccountREST(userId, email, pass, user.name);
        
        const doc = await databases.createDocument(databaseId, collectionIdUsersProfile, acc.$id, {
            name: user.name,
            username: user.username,
            role: user.role,
            assignedCourseIds: user.assignedCourseIds || []
        });
        invalidateCache('users:all');
        return { ...user, id: doc.$id };
    } else {
        const doc = await databases.updateDocument(databaseId, collectionIdUsersProfile, user.id, {
            name: user.name,
            username: user.username,
            role: user.role,
            assignedCourseIds: user.assignedCourseIds || []
        });
        invalidateCache('users:all');
        return { ...user, id: doc.$id };
    }
  },
  
  deleteUser: async (id: string) => {
    await databases.deleteDocument(databaseId, collectionIdUsersProfile, id);
    invalidateCache('users:all');
    try {
        await deleteAccountREST(id);
    } catch(e) {
        console.warn("Account delete REST warning", e);
    }
  },

  getBatches: async (): Promise<Batch[]> => {
    const cacheKey = 'batches:all';
    const cached = getCached<Batch[]>(cacheKey);
    if (cached) return cached;

    const docs = await listAllDocuments(collectionIdBatches);
    const batches = docs.map(doc => ({
      id: doc.$id,
      name: doc.name,
      isActive: doc.isActive,
      isArchived: doc.isArchived,
      createdAt: doc.createdAt,
      fileId: doc.fileId
    }));
    setCached(cacheKey, batches);
    return batches;
  },
  
  saveBatch: async (batch: Batch) => {
    const data = {
        name: batch.name,
        isActive: batch.isActive,
        isArchived: batch.isArchived,
        createdAt: batch.createdAt,
        fileId: batch.fileId || ''
    };
    if (!batch.id || batch.id.startsWith('new_')) {
        const doc = await databases.createDocument(databaseId, collectionIdBatches, ID.unique(), data);
        invalidateCache('batches:all');
        return { ...batch, id: doc.$id };
    } else {
        const doc = await databases.updateDocument(databaseId, collectionIdBatches, batch.id, data);
        invalidateCache('batches:all');
        return { ...batch, id: doc.$id };
    }
  },
  
  deleteBatch: async (id: string) => {
    await databases.deleteDocument(databaseId, collectionIdBatches, id);
    invalidateCache('batches:all');
  },
  
  getActiveBatch: async (): Promise<Batch | undefined> => {
    const res = await databases.listDocuments(databaseId, collectionIdBatches, [Query.equal('isActive', true)]);
    if (res.documents.length === 0) return undefined;
    const doc = res.documents[0];
    return {
      id: doc.$id,
      name: doc.name,
      isActive: doc.isActive,
      isArchived: doc.isArchived,
      createdAt: doc.createdAt,
      fileId: doc.fileId
    };
  },

  getCourses: async (batchId?: string): Promise<Course[]> => {
    if (!batchId) return [];
    const cacheKey = `courses:${batchId}`;
    const cached = getCached<Course[]>(cacheKey);
    if (cached) return cached;

    const docs = await listAllDocuments(collectionIdCourses, [Query.equal('batchId', batchId)]);
    const courses = docs.map(doc => ({
      id: doc.$id,
      name: doc.name,
      code: doc.code,
      batchId: doc.batchId,
      professorIds: doc.professorIds || [],
      assistantIds: doc.assistantIds || [],
      config: JSON.parse(doc.config),
      isPublished: doc.isPublished
    }));
    setCached(cacheKey, courses);
    return courses;
  },
  
  saveCourse: async (course: Course) => {
    const data = {
        name: course.name,
        code: course.code,
        batchId: course.batchId,
        professorIds: course.professorIds || [],
        assistantIds: course.assistantIds || [],
        config: JSON.stringify(course.config || {}),
        isPublished: course.isPublished || false
    };
    if (!course.id || course.id.startsWith('new_')) {
        const doc = await databases.createDocument(databaseId, collectionIdCourses, ID.unique(), data);
        invalidateCache(`courses:${course.batchId}`);
        return { ...course, id: doc.$id };
    } else {
        const doc = await databases.updateDocument(databaseId, collectionIdCourses, course.id, data);
        invalidateCache(`courses:${course.batchId}`);
        return { ...course, id: doc.$id };
    }
  },
  
  deleteCourse: async (courseId: string, batchId: string) => {
    await databases.deleteDocument(databaseId, collectionIdCourses, courseId);
    invalidateCache(`courses:${batchId}`);
  },

  getResults: async (courseId: string, batchId: string): Promise<StudentResult[]> => {
    const cacheKey = `results:${batchId}:${courseId}`;
    const cached = getCached<StudentResult[]>(cacheKey);
    if (cached) return cached;

    const docs = await listAllDocuments(collectionIdStudentResults, [
      Query.equal('courseId', courseId),
      Query.equal('batchId', batchId)
    ]);

    const results = docs.map(doc => ({
      id: doc.$id,
      studentId: doc.studentId,
      studentName: doc.studentName,
      program: doc.program || '',
      courseId: doc.courseId,
      batchId: doc.batchId,
      quizScores: JSON.parse(doc.quizScores),
      assignmentScores: JSON.parse(doc.assignmentScores),
      bonusScore: doc.bonusScore,
      calculatedTotal: doc.calculatedTotal,
      isLocked: doc.isLocked
    }));
    setCached(cacheKey, results, 15_000);
    return results;
  },
  
  saveResult: async (result: StudentResult) => {
    const data = normalizeResultPayload(result);
    
    if (!result.id || result.id.startsWith('new_')) {
        const doc = await databases.createDocument(databaseId, collectionIdStudentResults, ID.unique(), data);
        invalidateCache(`results:${result.batchId}:${result.courseId}`);
        return { ...result, id: doc.$id };
    } else {
        const doc = await databases.updateDocument(databaseId, collectionIdStudentResults, result.id, data);
        invalidateCache(`results:${result.batchId}:${result.courseId}`);
        return { ...result, id: doc.$id };
    }
  },
  
  bulkSaveResults: async (results: StudentResult[]) => {
    if (results.length === 0) return [];
    const insertedOrUpdated: StudentResult[] = [];
    const courseId = results[0].courseId;
    const batchId = results[0].batchId;

    const courseStudentIds = Array.from(new Set(results.map(r => r.studentId.trim()).filter(Boolean)));
    const existingMap = new Map<string, string>();

    for (const idsChunk of chunkArray(courseStudentIds, 100)) {
      const docs = await listAllDocuments(collectionIdStudentResults, [
        Query.equal('courseId', courseId),
        Query.equal('batchId', batchId),
        Query.equal('studentId', idsChunk)
      ]);
      docs.forEach(doc => existingMap.set(doc.studentId, doc.$id));
    }

    for (const resultChunk of chunkArray(results, 25)) {
      const chunkResponse = await Promise.all(
        resultChunk.map(async result => {
          const existingId = existingMap.get(result.studentId.trim());
          const payload = normalizeResultPayload(result);
          if (existingId) {
            const updated = await databases.updateDocument(databaseId, collectionIdStudentResults, existingId, payload);
            return { ...result, id: updated.$id };
          }
          const created = await databases.createDocument(databaseId, collectionIdStudentResults, ID.unique(), payload);
          return { ...result, id: created.$id };
        })
      );
      insertedOrUpdated.push(...chunkResponse);
    }

    invalidateCache(`results:${batchId}:${courseId}`);
    return insertedOrUpdated;
  },
  
  deleteResult: async (id: string, courseId: string, batchId: string) => {
    await databases.deleteDocument(databaseId, collectionIdStudentResults, id);
    invalidateCache(`results:${batchId}:${courseId}`);
  },

  createImportJob: async (payload: {
    fileName?: string;
    batchId: string;
    courseId: string;
    createdBy?: string;
    metaJson?: string;
  }): Promise<DataTransferJob> => {
    const startedAt = new Date().toISOString();
    const doc = await databases.createDocument(databaseId, collectionIdImportJobs, ID.unique(), {
      type: 'IMPORT',
      status: 'PENDING',
      fileName: payload.fileName || '',
      batchId: payload.batchId,
      courseId: payload.courseId,
      startedAt,
      finishedAt: '',
      createdBy: payload.createdBy || '',
      summary: '',
      metaJson: payload.metaJson || ''
    });

    return {
      id: doc.$id,
      type: 'IMPORT',
      status: 'PENDING',
      fileName: doc.fileName,
      batchId: doc.batchId,
      courseId: doc.courseId,
      startedAt: doc.startedAt,
      finishedAt: doc.finishedAt,
      createdBy: doc.createdBy,
      summary: doc.summary,
      metaJson: doc.metaJson
    };
  },

  runImportResults: async (jobId: string, rows: StudentResult[]): Promise<ImportRunReport> => {
    const errors: string[] = [];
    let skipped = 0;
    const cleanedRows: StudentResult[] = [];

    for (const row of rows) {
      if (!row.studentId?.trim() || !row.studentName?.trim() || !row.courseId || !row.batchId) {
        skipped += 1;
        errors.push(`Skipped row due to missing required fields for student "${row.studentName || '-'}".`);
        continue;
      }
      cleanedRows.push({ ...row, studentId: row.studentId.trim(), studentName: row.studentName.trim() });
    }

    await databases.updateDocument(databaseId, collectionIdImportJobs, jobId, {
      status: 'PROCESSING' as DataJobStatus
    });

    if (cleanedRows.length === 0) {
      const emptyReport: ImportRunReport = {
        jobId,
        processed: rows.length,
        inserted: 0,
        updated: 0,
        skipped,
        errors: errors.length ? errors : ['No valid rows to import.']
      };
      await databases.updateDocument(databaseId, collectionIdImportJobs, jobId, {
        status: 'COMPLETED' as DataJobStatus,
        finishedAt: new Date().toISOString(),
        summary: 'Import completed with no valid rows.',
        metaJson: JSON.stringify(emptyReport)
      });
      return emptyReport;
    }

    try {
      const existingBefore = await listAllDocuments(collectionIdStudentResults, [
        Query.equal('courseId', cleanedRows[0].courseId),
        Query.equal('batchId', cleanedRows[0].batchId)
      ]);
      const existingSet = new Set(existingBefore.map(d => d.studentId));
      const upserted = await StorageService.bulkSaveResults(cleanedRows);
      const inserted = upserted.filter(r => !existingSet.has(r.studentId)).length;
      const updated = upserted.length - inserted;

      const report: ImportRunReport = {
        jobId,
        processed: rows.length,
        inserted,
        updated,
        skipped,
        errors
      };

      await databases.updateDocument(databaseId, collectionIdImportJobs, jobId, {
        status: 'COMPLETED' as DataJobStatus,
        finishedAt: new Date().toISOString(),
        summary: `Imported ${upserted.length}/${rows.length} rows (inserted=${inserted}, updated=${updated}, skipped=${skipped}).`,
        metaJson: JSON.stringify(report)
      });

      return report;
    } catch (error: any) {
      await databases.updateDocument(databaseId, collectionIdImportJobs, jobId, {
        status: 'FAILED' as DataJobStatus,
        finishedAt: new Date().toISOString(),
        summary: error?.message || 'Import failed'
      });
      throw error;
    }
  },

  createExportJob: async (payload: {
    batchId: string;
    courseId?: string;
    createdBy?: string;
    fileName?: string;
  }): Promise<DataTransferJob> => {
    const doc = await databases.createDocument(databaseId, collectionIdExportJobs, ID.unique(), {
      type: 'EXPORT',
      status: 'PENDING',
      fileName: payload.fileName || '',
      batchId: payload.batchId,
      courseId: payload.courseId || '',
      startedAt: new Date().toISOString(),
      finishedAt: '',
      createdBy: payload.createdBy || '',
      summary: '',
      metaJson: ''
    });
    return {
      id: doc.$id,
      type: 'EXPORT',
      status: 'PENDING',
      fileName: doc.fileName,
      batchId: doc.batchId,
      courseId: doc.courseId,
      startedAt: doc.startedAt
    };
  },

  exportResultsAsCsv: async (jobId: string, opts: { batchId: string; courseId?: string }): Promise<string> => {
    await databases.updateDocument(databaseId, collectionIdExportJobs, jobId, {
      status: 'PROCESSING' as DataJobStatus
    });

    try {
      const queries = [Query.equal('batchId', opts.batchId)];
      if (opts.courseId) queries.push(Query.equal('courseId', opts.courseId));
      const docs = await listAllDocuments(collectionIdStudentResults, queries);

      const headers = [
        'studentId',
        'studentName',
        'program',
        'courseId',
        'batchId',
        'quizScores',
        'assignmentScores',
        'bonusScore',
        'calculatedTotal',
        'isLocked'
      ];
      const csvRows = docs.map((doc: any) =>
        [
          doc.studentId,
          doc.studentName,
          doc.program || '',
          doc.courseId,
          doc.batchId,
          doc.quizScores,
          doc.assignmentScores,
          doc.bonusScore ?? '',
          doc.calculatedTotal,
          doc.isLocked ? 'true' : 'false'
        ]
          .map((cell: any) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
          .join(',')
      );

      const csv = [headers.join(','), ...csvRows].join('\n');
      await databases.updateDocument(databaseId, collectionIdExportJobs, jobId, {
        status: 'COMPLETED' as DataJobStatus,
        finishedAt: new Date().toISOString(),
        summary: `Exported ${docs.length} records.`,
        metaJson: JSON.stringify({ rowCount: docs.length })
      });

      return csv;
    } catch (error: any) {
      await databases.updateDocument(databaseId, collectionIdExportJobs, jobId, {
        status: 'FAILED' as DataJobStatus,
        finishedAt: new Date().toISOString(),
        summary: error?.message || 'Export failed'
      });
      throw error;
    }
  },

  listRecentDataJobs: async (limit = 20): Promise<DataTransferJob[]> => {
    const importJobsRes = await databases.listDocuments(databaseId, collectionIdImportJobs, [
      Query.orderDesc('$createdAt'),
      Query.limit(Math.min(limit, 50))
    ]);
    const exportJobsRes = await databases.listDocuments(databaseId, collectionIdExportJobs, [
      Query.orderDesc('$createdAt'),
      Query.limit(Math.min(limit, 50))
    ]);

    return [...importJobsRes.documents, ...exportJobsRes.documents]
      .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
      .slice(0, limit)
      .map(doc => ({
        id: doc.$id,
        type: doc.type,
        status: doc.status,
        fileName: doc.fileName,
        courseId: doc.courseId,
        batchId: doc.batchId,
        startedAt: doc.startedAt,
        finishedAt: doc.finishedAt,
        createdBy: doc.createdBy,
        summary: doc.summary,
        metaJson: doc.metaJson
      }));
  },
  
  getAllStudentResults: async (studentId: string, batchId: string): Promise<{result: StudentResult, course: Course}[]> => {
    const resultsRes = await databases.listDocuments(databaseId, collectionIdStudentResults, [
        Query.equal('studentId', studentId),
        Query.equal('batchId', batchId)
    ]);
    
    if (resultsRes.documents.length === 0) return [];
    
    const coursesRes = await databases.listDocuments(databaseId, collectionIdCourses, [
        Query.equal('batchId', batchId)
    ]);
    
    const coursesMap = new Map();
    coursesRes.documents.forEach(doc => {
        coursesMap.set(doc.$id, {
          id: doc.$id,
          name: doc.name,
          code: doc.code,
          batchId: doc.batchId,
          professorIds: doc.professorIds || [],
          assistantIds: doc.assistantIds || [],
          config: JSON.parse(doc.config),
          isPublished: doc.isPublished
        });
    });
    
    const res: {result: StudentResult, course: Course}[] = [];
    resultsRes.documents.forEach(doc => {
        const course = coursesMap.get(doc.courseId);
        if (course && course.isPublished) {
            res.push({
                result: {
                    id: doc.$id,
                    studentId: doc.studentId,
                    studentName: doc.studentName,
                    program: doc.program || '',
                    courseId: doc.courseId,
                    batchId: doc.batchId,
                    quizScores: JSON.parse(doc.quizScores),
                    assignmentScores: JSON.parse(doc.assignmentScores),
                    bonusScore: doc.bonusScore,
                    calculatedTotal: doc.calculatedTotal,
                    isLocked: doc.isLocked
                },
                course: course
            });
        }
    });
    
    return res;
  }
};

export const calculateStudentGrade = (
  quizzes: (number | null)[], 
  assignments: (number | null)[], 
  bonus: number | null, 
  config: any
): number => {
  if(!config) return 0;
  
  const normalizedQuizzes = quizzes.map((score, i) => {
    const effectiveScore = (score === null || score === undefined || (score as any) === '') ? 0 : Number(score);
    const individualMax = (config.quizIndividualMaxScores && config.quizIndividualMaxScores[i] > 0) 
        ? Number(config.quizIndividualMaxScores[i]) 
        : Number(config.quizMaxScore);
        
    if (individualMax === 0) return 0;
    return (effectiveScore / individualMax) * Number(config.quizMaxScore);
  });
  
  const sortedQuizzes = [...normalizedQuizzes].sort((a, b) => b - a);
  const quizSum = sortedQuizzes.slice(0, config.quizBestOf).reduce((acc, curr) => acc + curr, 0);

  const normalizedAssigns = assignments.map((score, i) => {
    const effectiveScore = (score === null || score === undefined || (score as any) === '') ? 0 : Number(score);
    const individualMax = (config.assignmentIndividualMaxScores && config.assignmentIndividualMaxScores[i] > 0)
        ? Number(config.assignmentIndividualMaxScores[i]) 
        : Number(config.assignmentMaxScore);
        
    if (individualMax === 0) return 0;
    return (effectiveScore / individualMax) * Number(config.assignmentMaxScore);
  });
  
  const sortedAssigns = [...normalizedAssigns].sort((a, b) => b - a);
  const assignSum = sortedAssigns.slice(0, config.assignmentBestOf).reduce((acc, curr) => acc + curr, 0);
  
  const effectiveBonus = (bonus === null || bonus === undefined || (bonus as any) === '') ? 0 : Number(bonus);

  const total = quizSum + assignSum + (config.enableBonus ? effectiveBonus : 0);
  
  return parseFloat(total.toFixed(2));
};