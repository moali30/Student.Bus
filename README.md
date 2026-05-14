<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1iB1jq9Lzf68kwtKBEoTJE6D7-3nsMzTh

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Appwrite Data Pipeline

The app now includes an optimized data pipeline for import/export with Appwrite:

- Chunked upsert for student results (reduces API overload on large imports)
- Cursor-based pagination for large collections
- In-memory TTL cache for frequent reads (`users`, `batches`, `courses`, `results`)
- Import/Export job tracking collections (`importJobs`, `exportJobs`)
- CSV export generation with job status lifecycle

### Required Appwrite collections

- `batches`
- `courses`
- `usersProfile`
- `studentResults`
- `importJobs`
- `exportJobs`

### Setup script

Run:

`node scripts/setup-appwrite.js`

Then ensure `.env.local` has:

- `VITE_APPWRITE_DATABASE_ID=main_db`
- `VITE_APPWRITE_COLLECTION_IMPORT_JOBS=importJobs`
- `VITE_APPWRITE_COLLECTION_EXPORT_JOBS=exportJobs`
