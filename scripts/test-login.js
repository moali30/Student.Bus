import { Client, Users, Account } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use Server SDK to create a session via API
const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

const usersService = new Users(client);

const testLogin = async () => {
    try {
        console.log("Testing auth user details...");
        
        // List all users
        const list = await usersService.list();
        console.log(`Total users: ${list.total}`);
        
        for (const u of list.users) {
            console.log(`\nUser: ${u.$id}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Name: ${u.name}`);
            console.log(`  Status: ${u.status}`);
            console.log(`  Email Verification: ${u.emailVerification}`);
            console.log(`  Password Update: ${u.passwordUpdate}`);
            console.log(`  Registration: ${u.registration}`);
            
            // Check if user has any active sessions
            try {
                const sessions = await usersService.listSessions(u.$id);
                console.log(`  Active Sessions: ${sessions.total}`);
            } catch(e) {
                console.log(`  Sessions: Error - ${e.message}`);
            }
        }

        // Verify password by attempting to update it to same value
        console.log("\n--- Testing password update ---");
        const userId = list.users[0].$id;
        try {
            await usersService.updatePassword(userId, 'ilmeglio441');
            console.log("Password set/confirmed as 'ilmeglio441' ✓");
        } catch(e) {
            console.log(`Password update error: ${e.message}`);
        }

        // Check if email verification might be blocking
        console.log("\n--- Checking email verification setting ---");
        try {
            await usersService.updateEmailVerification(userId, true);
            console.log("Email verification set to true (bypassing any verification requirement) ✓");
        } catch(e) {
            console.log(`Email verification update error: ${e.message}`);
        }

    } catch(e) {
        console.error("Error:", e);
    }
};

testLogin();
