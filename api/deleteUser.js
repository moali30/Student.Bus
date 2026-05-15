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

  if (req.method !== 'DELETE' && req.method !== 'POST') { // Allow POST as fallback since some clients have trouble with DELETE bodies
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId } = req.body || req.query;

  if (!userId) {
    return res.status(400).json({ message: 'Missing userId parameter' });
  }

  try {
    const secretKey = process.env.APPWRITE_SECRET_KEY || process.env.VITE_APPWRITE_API_KEY;

    if (!secretKey) {
        return res.status(500).json({ message: 'Server configuration error: Appwrite API Key is missing.' });
    }

    const client = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
      .setKey(secretKey);

    const users = new Users(client);
    
    await users.delete(userId);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Appwrite User Deletion Error:", error);
    return res.status(error.code || 500).json({ 
      message: error.message || 'Failed to delete user in Appwrite'
    });
  }
}
