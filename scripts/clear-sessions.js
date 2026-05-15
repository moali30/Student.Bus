import { Client, Users } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

const usersService = new Users(client);

const clearAndTest = async () => {
    const userId = '6a068d65002cda533356';
    
    // Clear all sessions
    console.log("Clearing all sessions...");
    await usersService.deleteSessions(userId);
    console.log("All sessions cleared ✓");
    
    // Verify user details
    const user = await usersService.get(userId);
    console.log(`User: ${user.email}, Status: ${user.status}, EmailVerified: ${user.emailVerification}`);
    console.log("Now try logging in on the browser!");
};

clearAndTest().catch(e => console.error(e));
