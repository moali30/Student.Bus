import { Client, Users } from 'node-appwrite';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId, email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // The key APPWRITE_SECRET_KEY should be added in Vercel Environment Variables.
    // It falls back to VITE_APPWRITE_API_KEY for backward compatibility if you haven't renamed it yet.
    const secretKey = process.env.APPWRITE_SECRET_KEY || process.env.VITE_APPWRITE_API_KEY;

    if (!secretKey) {
        return res.status(500).json({ message: 'Server configuration error: Appwrite API Key is missing.' });
    }

    const client = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
      .setKey(secretKey);

    const users = new Users(client);
    
    // Create user in Appwrite Auth
    const user = await users.create(userId, email, undefined, password, name);
    
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Appwrite User Creation Error:", error);
    return res.status(error.code || 500).json({ 
      message: error.message || 'Failed to create user in Appwrite'
    });
  }
}
