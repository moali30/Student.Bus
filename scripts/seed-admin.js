import { Client, Databases, Users, ID } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

const seedAdmin = async () => {
    try {
        console.log("Creating admin user...");
        const email = "moasim@mental.edu";
        const password = "ilmeglio441";
        const username = "moasim";
        const name = "Admin Moasim";
        
        let userId = ID.unique();
        let authUser;
        
        try {
            authUser = await users.create(userId, email, undefined, password, name);
            console.log(`User created in Auth: ${authUser.$id}`);
            userId = authUser.$id;
        } catch(e) {
            if (e.code === 409) {
                console.log("User already exists in Auth. Looking up ID...");
                const list = await users.list();
                const existing = list.users.find(u => u.email === email);
                if (existing) userId = existing.$id;
            } else {
                throw e;
            }
        }
        
        try {
            await databases.createDocument(
                process.env.VITE_APPWRITE_DATABASE_ID,
                'usersProfile',
                userId,
                {
                    name: name,
                    username: username,
                    role: 'MAIN_ADMIN',
                    assignedCourseIds: []
                }
            );
            console.log(`Admin profile created in database.`);
        } catch (e) {
            if (e.code === 409) console.log("Admin profile already exists in DB.");
            else throw e;
        }
        
        console.log("Admin seeded successfully!");
    } catch(e) {
        console.error("Error seeding admin:", e);
    }
};

seedAdmin();
