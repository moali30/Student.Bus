import { Client, Databases, Users, ID } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY);

const usersService = new Users(client);
const databases = new Databases(client);

const recreateAdmin = async () => {
    const userId = '6a0637b1000a179362dc';
    const email = 'moasim@mental.edu';
    const password = 'ilmeglio441';
    const name = 'Admin Moasim';

    try {
        // Step 1: Delete old profile document
        console.log("Step 1: Deleting old profile document...");
        try {
            await databases.deleteDocument(process.env.VITE_APPWRITE_DATABASE_ID, 'usersProfile', userId);
            console.log("  Old profile deleted ✓");
        } catch(e) {
            console.log("  No profile to delete (OK)");
        }

        // Step 2: Delete old auth user
        console.log("Step 2: Deleting old auth user...");
        try {
            await usersService.delete(userId);
            console.log("  Old auth user deleted ✓");
        } catch(e) {
            console.log("  No auth user to delete (OK)");
        }

        // Step 3: Wait a moment
        await new Promise(r => setTimeout(r, 2000));

        // Step 4: Create fresh auth user
        console.log("Step 3: Creating fresh auth user...");
        const newUserId = ID.unique();
        const authUser = await usersService.create(newUserId, email, undefined, password, name);
        console.log(`  Auth user created: ${authUser.$id} ✓`);

        // Step 5: Create fresh profile document
        console.log("Step 4: Creating fresh profile document...");
        await databases.createDocument(
            process.env.VITE_APPWRITE_DATABASE_ID,
            'usersProfile',
            authUser.$id,
            {
                name: name,
                username: 'moasim',
                role: 'MAIN_ADMIN',
                assignedCourseIds: []
            }
        );
        console.log("  Profile created ✓");

        // Step 6: Verify
        console.log("\nStep 5: Verifying...");
        const verifyUser = await usersService.get(authUser.$id);
        console.log(`  Auth: ${verifyUser.email} | status: ${verifyUser.status}`);
        
        const doc = await databases.getDocument(process.env.VITE_APPWRITE_DATABASE_ID, 'usersProfile', authUser.$id);
        console.log(`  Profile: ${doc.username} | role: ${doc.role}`);

        console.log("\n✅ Admin recreated successfully!");
        console.log("   Username: moasim");
        console.log("   Password: ilmeglio441");
    } catch(e) {
        console.error("Error:", e);
    }
};

recreateAdmin();
