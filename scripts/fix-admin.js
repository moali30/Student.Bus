import { Client, Databases, Users } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY);

const usersService = new Users(client);
const databases = new Databases(client);

const fixAdmin = async () => {
    try {
        const userId = '6a0637b1000a179362dc';
        
        // 1. Fix the password
        console.log("Step 1: Resetting password...");
        await usersService.updatePassword(userId, 'ilmeglio441');
        console.log("  Password reset to 'ilmeglio441' ✓");

        // 2. Fix the role in the database
        console.log("Step 2: Fixing role from ADMIN to MAIN_ADMIN...");
        await databases.updateDocument(
            process.env.VITE_APPWRITE_DATABASE_ID,
            'usersProfile',
            userId,
            { role: 'MAIN_ADMIN' }
        );
        console.log("  Role updated to MAIN_ADMIN ✓");

        // 3. Verify
        console.log("\nStep 3: Verifying...");
        const doc = await databases.getDocument(
            process.env.VITE_APPWRITE_DATABASE_ID,
            'usersProfile',
            userId
        );
        console.log(`  Profile: ${doc.username} | role: ${doc.role} | name: ${doc.name}`);
        
        console.log("\n✅ Admin account fixed! You can now login with:");
        console.log("   Username: moasim");
        console.log("   Password: ilmeglio441");
    } catch(e) {
        console.error("Error:", e);
    }
};

fixAdmin();
