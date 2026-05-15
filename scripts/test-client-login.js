// Test login using Appwrite Client SDK (same as frontend)
import { Client, Account } from 'appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);

const testClientLogin = async () => {
    const email = 'moasim@mental.edu';
    const password = 'ilmeglio441';
    
    console.log(`Testing login with: ${email} / ${password}`);
    
    try {
        // This is the exact same call the frontend makes
        const session = await account.createEmailPasswordSession(email, password);
        console.log("✅ LOGIN SUCCESSFUL!");
        console.log(`Session ID: ${session.$id}`);
        console.log(`User ID: ${session.userId}`);
        console.log(`Provider: ${session.provider}`);
        
        // Now get current user
        const user = await account.get();
        console.log(`\nLogged in as: ${user.name} (${user.email})`);
        
        // Clean up - delete the session we just created
        await account.deleteSession('current');
        console.log("Session cleaned up ✓");
    } catch(e) {
        console.error("❌ LOGIN FAILED:", e.message);
        console.error("Full error:", e);
    }
};

testClientLogin();
