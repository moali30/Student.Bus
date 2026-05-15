import { Client, Databases, Users, ID } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// we can use process.env to get the values

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1') // Your API Endpoint
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '') // Your project ID
    .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || ''); // Your secret API key

const databases = new Databases(client);

const setupDatabase = async () => {
    try {
        let dbId = 'main_db';
        try {
            const db = await databases.create(ID.custom('main_db'), 'Main Database');
            console.log(`Database created: ${db.$id}`);
        } catch (e) {
            if (e.code === 409) console.log("Database already exists.");
            else throw e;
        }

        const createCollection = async (id, name) => {
            try {
                await databases.createCollection(dbId, id, name);
                console.log(`Created collection: ${name}`);
            } catch (e) {
                if (e.code === 409) console.log(`Collection ${name} already exists`);
                else throw e;
            }
        };

        const createAttr = async (fn, ...args) => {
            try {
                await fn.apply(databases, args);
            } catch (e) {
                if (e.code === 409) return; // already exists
                else throw e;
            }
        };

        const createIndex = async (...args) => {
            try {
                await databases.createIndex(...args);
            } catch (e) {
                if (e.code === 409) return;
                else throw e;
            }
        };

        // 1. Batches Collection
        console.log("Setting up Batches collection...");
        await createCollection('batches', 'Batches');
        await createAttr(databases.createStringAttribute, dbId, 'batches', 'name', 255, true);
        await createAttr(databases.createBooleanAttribute, dbId, 'batches', 'isActive', true);
        await createAttr(databases.createBooleanAttribute, dbId, 'batches', 'isArchived', true);
        await createAttr(databases.createStringAttribute, dbId, 'batches', 'createdAt', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'batches', 'fileId', 255, false);

        // 2. Courses Collection
        console.log("Setting up Courses collection...");
        await createCollection('courses', 'Courses');
        await createAttr(databases.createStringAttribute, dbId, 'courses', 'name', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'courses', 'code', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'courses', 'batchId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'courses', 'professorIds', 100, false, undefined, true);
        await createAttr(databases.createStringAttribute, dbId, 'courses', 'assistantIds', 100, false, undefined, true);
        await createAttr(databases.createStringAttribute, dbId, 'courses', 'config', 5000, true);
        await createAttr(databases.createBooleanAttribute, dbId, 'courses', 'isPublished', false);

        // 3. UsersProfile Collection
        console.log("Setting up UsersProfile collection...");
        await createCollection('usersProfile', 'Users Profile');
        await createAttr(databases.createStringAttribute, dbId, 'usersProfile', 'name', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'usersProfile', 'username', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'usersProfile', 'role', 50, true);
        await createAttr(databases.createStringAttribute, dbId, 'usersProfile', 'assignedCourseIds', 100, false, undefined, true);

        // 4. StudentResults Collection
        console.log("Setting up StudentResults collection...");
        await createCollection('studentResults', 'Student Results');
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'studentId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'studentName', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'program', 100, false);
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'courseId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'batchId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'quizScores', 5000, true);
        await createAttr(databases.createStringAttribute, dbId, 'studentResults', 'assignmentScores', 5000, true);
        await createAttr(databases.createFloatAttribute, dbId, 'studentResults', 'bonusScore', false);
        await createAttr(databases.createFloatAttribute, dbId, 'studentResults', 'calculatedTotal', true);
        await createAttr(databases.createBooleanAttribute, dbId, 'studentResults', 'isLocked', false);

        // 5. ImportJobs Collection
        console.log("Setting up ImportJobs collection...");
        await createCollection('importJobs', 'Import Jobs');
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'type', 20, true);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'status', 20, true);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'fileName', 255, false);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'batchId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'courseId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'startedAt', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'finishedAt', 255, false);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'createdBy', 100, false);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'summary', 1000, false);
        await createAttr(databases.createStringAttribute, dbId, 'importJobs', 'metaJson', 10000, false);

        // 6. ExportJobs Collection
        console.log("Setting up ExportJobs collection...");
        await createCollection('exportJobs', 'Export Jobs');
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'type', 20, true);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'status', 20, true);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'fileName', 255, false);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'batchId', 100, true);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'courseId', 100, false);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'startedAt', 255, true);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'finishedAt', 255, false);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'createdBy', 100, false);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'summary', 1000, false);
        await createAttr(databases.createStringAttribute, dbId, 'exportJobs', 'metaJson', 10000, false);

        // Suggested indexes for faster read paths
        console.log("Setting up indexes...");
        await createIndex(dbId, 'studentResults', 'idx_results_batch_course', 'key', ['batchId', 'courseId']);
        await createIndex(dbId, 'studentResults', 'idx_results_student_batch', 'key', ['studentId', 'batchId']);
        await createIndex(dbId, 'courses', 'idx_courses_batch', 'key', ['batchId']);
        await createIndex(dbId, 'usersProfile', 'idx_users_username', 'key', ['username']);
        await createIndex(dbId, 'importJobs', 'idx_import_status', 'key', ['status']);
        await createIndex(dbId, 'exportJobs', 'idx_export_status', 'key', ['status']);

        console.log("Setup completed successfully!");
        console.log("Please update your .env.local with VITE_APPWRITE_DATABASE_ID=main_db");

    } catch (error) {
        console.error("Error setting up database:", error);
    }
};

setupDatabase();
