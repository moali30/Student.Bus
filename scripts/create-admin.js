import { Client, Users, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

const createAdmin = async () => {
    try {
        console.log("Creating default admin user...");
        const email = 'admin@mental.edu';
        const password = 'adminpassword';
        const name = 'Main Administrator';
        
        // Check if exists
        try {
            await users.get(ID.custom('admin'));
            console.log("Admin already exists!");
            return;
        } catch (e) {
            // doesn't exist
        }

        const user = await users.create(ID.custom('admin'), email, undefined, password, name);
        
        await databases.createDocument(
            process.env.VITE_APPWRITE_DATABASE_ID, 
            process.env.VITE_APPWRITE_COLLECTION_USERS_PROFILE, 
            user.$id, 
            {
                name: name,
                username: 'admin',
                role: 'MAIN_ADMIN',
                assignedCourseIds: []
            }
        );
        
        console.log("Admin created successfully! Username: admin | Password: adminpassword");
    } catch (error) {
        console.error("Error creating admin:", error);
    }
};

createAdmin();
