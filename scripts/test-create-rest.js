
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const createAccountREST = async (userId, email, password, name) => {
    const response = await fetch(`${process.env.VITE_APPWRITE_ENDPOINT}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': process.env.VITE_APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': process.env.VITE_APPWRITE_API_KEY
        },
        body: JSON.stringify({ userId, email, password, name })
    });
    const data = await response.json();
    if (!response.ok) {
        console.error("API Error Details:", data);
        throw new Error(data.message || 'Failed to create user account');
    }
    return data;
};

const testAddUser = async () => {
    try {
        console.log("Testing create account...");
        await createAccountREST('uniqueid123', 'testuser2@mental.edu', 'testpass123', 'Test User');
        console.log("Success!");
    } catch (e) {
        console.error("Error caught:", e);
    }
};

testAddUser();
