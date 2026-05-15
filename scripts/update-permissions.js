import { Client, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = process.env.VITE_APPWRITE_DATABASE_ID;

const updatePerms = async () => {
    try {
        console.log("Updating Appwrite Collection Permissions...");
        
        const perms = [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ];
        
        await databases.updateCollection(dbId, 'batches', 'Batches', perms);
        console.log("Batches permissions updated.");
        
        await databases.updateCollection(dbId, 'courses', 'Courses', perms);
        console.log("Courses permissions updated.");

        await databases.updateCollection(dbId, 'usersProfile', 'Users Profile', perms);
        console.log("UsersProfile permissions updated.");

        await databases.updateCollection(dbId, 'studentResults', 'Student Results', perms);
        console.log("StudentResults permissions updated.");

        await databases.updateCollection(dbId, 'importJobs', 'Import Jobs', perms);
        console.log("ImportJobs permissions updated.");

        await databases.updateCollection(dbId, 'exportJobs', 'Export Jobs', perms);
        console.log("ExportJobs permissions updated.");

        console.log("All permissions updated successfully! The frontend can now read the data.");
    } catch(e) {
        console.error("Error:", e);
    }
};

updatePerms();
