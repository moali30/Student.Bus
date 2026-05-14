import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function testCreate() {
    try {
        const doc = await databases.createDocument(
            process.env.VITE_APPWRITE_DATABASE_ID,
            process.env.VITE_APPWRITE_COLLECTION_BATCHES,
            ID.unique(),
            {
                name: 'Test Batch',
                isActive: true,
                isArchived: false,
                createdAt: new Date().toISOString(),
                fileId: ''
            }
        );
        console.log("Success:", doc);
    } catch (e) {
        console.error("Error creating batch:", e);
    }
}
testCreate();
