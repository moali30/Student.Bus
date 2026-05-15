import { Client, Databases, Users, Query } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

const checkAdmin = async () => {
    try {
        console.log("=== Checking Auth Users ===");
        const authList = await users.list();
        authList.users.forEach(u => {
            console.log(`  Auth User: ${u.$id} | ${u.email} | ${u.name} | status: ${u.status}`);
        });

        console.log("\n=== Checking Profile Documents ===");
        const profiles = await databases.listDocuments(
            process.env.VITE_APPWRITE_DATABASE_ID,
            'usersProfile'
        );
        profiles.documents.forEach(doc => {
            console.log(`  Profile: ${doc.$id} | ${doc.username} | ${doc.name} | role: ${doc.role}`);
        });
        
        console.log("\n=== Looking for moasim specifically ===");
        const moasimProfile = await databases.listDocuments(
            process.env.VITE_APPWRITE_DATABASE_ID,
            'usersProfile',
            [Query.equal('username', 'moasim')]
        );
        if (moasimProfile.documents.length > 0) {
            const doc = moasimProfile.documents[0];
            console.log(`  Found moasim profile: ID=${doc.$id}, role=${doc.role}, name=${doc.name}`);
            
            // Check if the auth user ID matches the profile ID
            try {
                const authUser = await users.get(doc.$id);
                console.log(`  Auth user match: ${authUser.email} | status: ${authUser.status}`);
            } catch(e) {
                console.log(`  WARNING: No auth user with ID ${doc.$id}! Mismatch!`);
            }
        } else {
            console.log("  moasim profile NOT FOUND!");
        }

    } catch(e) {
        console.error("Error:", e);
    }
};

checkAdmin();
