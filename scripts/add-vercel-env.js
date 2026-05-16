import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const addVercelEnv = () => {
    const key = 'APPWRITE_SECRET_KEY';
    const value = process.env.VITE_APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
    
    if (!value) {
        console.error("No Appwrite API Key found in .env.local");
        process.exit(1);
    }
    
    // Write the key to a file without any newlines or spaces to pipe reliably
    fs.writeFileSync('temp_key.txt', value.trim());
    
    try {
        console.log(`Removing old ${key} if exists...`);
        execSync(`npx vercel env rm ${key} production preview development -y`, { stdio: 'ignore' });
    } catch (e) {}

    try {
        console.log(`Adding ${key} to production...`);
        execSync(`npx vercel env add ${key} production < temp_key.txt`, { stdio: 'inherit' });
        
        console.log(`Adding ${key} to preview...`);
        execSync(`npx vercel env add ${key} preview < temp_key.txt`, { stdio: 'inherit' });
        
        console.log("Triggering Vercel production deployment...");
        execSync(`npx vercel --prod`, { stdio: 'inherit' });
        
        console.log("Deployment completed successfully.");
    } catch (e) {
        console.error("Error running Vercel commands", e.message);
    } finally {
        if(fs.existsSync('temp_key.txt')) fs.unlinkSync('temp_key.txt');
    }
};

addVercelEnv();
