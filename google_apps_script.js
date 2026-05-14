
const APP_SUFFIX = "_MSR_SYS_DB";
const MAIN_DB_NAME = "MAIN_CONFIG" + APP_SUFFIX;

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Increased lock wait time to ensure consistency during high concurrency
  lock.tryLock(15000);
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;
    let result = {};
    switch (action) {
      case 'setup': result = setupSystem(); break;
      case 'login': result = handleLogin(payload); break;
      case 'getUsers': result = getGlobalData('Users'); break;
      case 'saveUser': result = saveGlobalRow('Users', payload); break;
      case 'deleteUser': result = deleteGlobalRow('Users', payload.id); break;
      case 'getBatches': result = getGlobalData('Batches'); break;
      case 'saveBatch': result = createOrUpdateBatch(payload); break;
      case 'deleteBatch': result = deleteBatch(payload.id); break;
      case 'getCourses': result = getCoursesFromBatch(payload.batchId); break;
      case 'saveCourse': result = saveCourseToBatch(payload.course, payload.batchId); break;
      case 'deleteCourse': result = deleteCourse(payload.courseId, payload.batchId); break;
      case 'getResults': result = getResults(payload.courseId, payload.batchId); break;
      case 'saveResult': result = saveResult(payload.result); break;
      case 'bulkSaveResults': result = bulkSaveResults(payload.results); break;
      case 'deleteResult': result = deleteResult(payload.id, payload.courseId, payload.batchId); break;
      case 'getAllStudentResults': result = getAllStudentResults(payload.studentId, payload.batchId); break;
      case 'getCourseStats': result = getCourseStatsBackend(payload.courseId, payload.batchId); break;
      default: throw new Error("Unknown Action");
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

// --- CORE HELPERS ---

function getOrCreateMainDB() {
  const files = DriveApp.getFilesByName(MAIN_DB_NAME);
  let ss;
  if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
  else { ss = SpreadsheetApp.create(MAIN_DB_NAME); const defaultSheet = ss.getSheetByName('Sheet1'); if(defaultSheet) ss.deleteSheet(defaultSheet); }
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) { usersSheet = ss.insertSheet('Users'); usersSheet.appendRow(['id', 'name', 'username', 'password', 'role', 'assignedCourseIds']); }
  
  // Default Admin Check
  const userData = usersSheet.getDataRange().getValues();
  let moasimFound = false;
  let anyMainAdminFound = false;
  const normalize = (val) => String(val || '').trim().toLowerCase();

  for (let i = 1; i < userData.length; i++) {
    const uName = normalize(userData[i][2]);
    const uRole = String(userData[i][4]).trim();
    if (uRole === 'MAIN_ADMIN') anyMainAdminFound = true;
    if (uName === 'moasim' && uRole === 'MAIN_ADMIN') moasimFound = true;
  }

  if (moasimFound) {
      let deletedCount = 0;
      for (let i = userData.length - 1; i >= 1; i--) {
          if (normalize(userData[i][2]) === 'admin' && String(userData[i][4]).trim() === 'MAIN_ADMIN') {
              usersSheet.deleteRow(i + 1);
              deletedCount++;
          }
      }
      if (deletedCount > 0) SpreadsheetApp.flush();
  } else if (!anyMainAdminFound) {
      usersSheet.appendRow(['admin1', 'Main Admin', 'admin', '123', 'MAIN_ADMIN', '[]']);
  }
  
  let batchesSheet = ss.getSheetByName('Batches');
  if (!batchesSheet) { batchesSheet = ss.insertSheet('Batches'); batchesSheet.appendRow(['id', 'name', 'isActive', 'isArchived', 'createdAt', 'fileId']); }
  return ss;
}

function getBatchSS(batchId) {
  const mainSS = getOrCreateMainDB();
  const batches = getDataFromSheet(mainSS.getSheetByName('Batches'));
  const batch = batches.find(b => b.id == batchId);
  if (!batch || !batch.fileId) throw new Error("Batch file not found");
  return SpreadsheetApp.openById(batch.fileId);
}

// --- DATA HANDLERS ---

function setupSystem() { getOrCreateMainDB(); return { message: "System Ready." }; }
function handleLogin(creds) {
  const users = getGlobalData('Users');
  const user = users.find(u => String(u.username).toLowerCase() === String(creds.username).toLowerCase() && String(u.password) === String(creds.password));
  return user || null;
}

function getGlobalData(sheetName) { const ss = getOrCreateMainDB(); const sheet = ss.getSheetByName(sheetName); return getDataFromSheet(sheet); }

function saveGlobalRow(sheetName, dataObj) {
  const ss = getOrCreateMainDB();
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = getDataFromSheet(sheet);
  const rowIndex = allData.findIndex(d => d.id == dataObj.id);
  const rowData = headers.map(h => { let val = dataObj[h]; if (typeof val === 'object') return JSON.stringify(val); return val; });
  if (rowIndex >= 0) sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowData]);
  else sheet.appendRow(rowData);
  return dataObj;
}

function deleteGlobalRow(sheetName, id) { const ss = getOrCreateMainDB(); const sheet = ss.getSheetByName(sheetName); const data = getDataFromSheet(sheet); const idx = data.findIndex(d => d.id == id); if (idx >= 0) sheet.deleteRow(idx + 2); return { id }; }

// --- COURSES & RESULTS ---

function getCoursesFromBatch(batchId) { const ss = getBatchSS(batchId); const sheet = ss.getSheetByName('Courses'); return getDataFromSheet(sheet); }

// *** ADVANCED SYNC: ROBUST SAVE COURSE TO BATCH ***
function saveCourseToBatch(course, batchId) {
  const ss = getBatchSS(batchId);
  let coursesSheet = ss.getSheetByName('Courses');
  
  // 1. Initial Setup if sheet doesn't exist
  if (!coursesSheet) {
      coursesSheet = ss.insertSheet('Courses');
      // Define standard keys, using plural IDs to match frontend
      coursesSheet.appendRow(['id', 'name', 'code', 'batchId', 'professorIds', 'assistantIds', 'config', 'isPublished']);
  }

  // 2. Dynamic Schema Evolution (The Fix for Disappearing Data)
  // Check the keys in the incoming 'course' object. If the sheet is missing a column for any key, add it.
  const payloadKeys = Object.keys(course);
  ensureHeaders(coursesSheet, payloadKeys);

  // 3. Re-read headers after potential update
  const headers = coursesSheet.getRange(1, 1, 1, coursesSheet.getLastColumn()).getValues()[0];
  
  // 4. Find existing row
  const allCourses = getDataFromSheet(coursesSheet);
  const rowIndex = allCourses.findIndex(c => String(c.id) === String(course.id));

  // 5. Map data safely, ensuring Arrays are JSON stringified
  const rowData = headers.map(h => {
      let val = course[h];
      
      // Fallback for singular/plural legacy mismatch (Safety Net)
      if (val === undefined) {
          if (h === 'professorId' && course['professorIds']) val = course['professorIds'];
          if (h === 'professorIds' && course['professorId']) val = course['professorId'];
          if (h === 'assistantId' && course['assistantIds']) val = course['assistantIds'];
          if (h === 'assistantIds' && course['assistantId']) val = course['assistantId'];
      }

      if (val === undefined || val === null) return '';
      if (Array.isArray(val) || typeof val === 'object') return JSON.stringify(val);
      return val;
  });

  // 6. Write Data
  if (rowIndex >= 0) {
      coursesSheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowData]);
  } else {
      coursesSheet.appendRow(rowData);
  }
  
  // 7. Ensure result sheet exists
  const sheetName = `RES_${course.id}`;
  let resSheet = ss.getSheetByName(sheetName);
  if (!resSheet) { 
      resSheet = ss.insertSheet(sheetName); 
      resSheet.appendRow(['id', 'studentId', 'studentName', 'program', 'courseId', 'batchId', 'quizScores', 'assignmentScores', 'bonusScore', 'calculatedTotal', 'isLocked']); 
  }
  
  return course;
}

function deleteCourse(courseId, batchId) {
    const ss = getBatchSS(batchId);
    const cSheet = ss.getSheetByName('Courses');
    const data = getDataFromSheet(cSheet);
    const idx = data.findIndex(c => c.id == courseId);
    if(idx >= 0) cSheet.deleteRow(idx + 2);
    const sheetName = `RES_${courseId}`;
    const resSheet = ss.getSheetByName(sheetName);
    if(resSheet) ss.deleteSheet(resSheet);
    return {id: courseId};
}

function getResults(courseId, batchId) { const ss = getBatchSS(batchId); const sheetName = `RES_${courseId}`; let sheet = ss.getSheetByName(sheetName); if (!sheet) return []; return getDataFromSheet(sheet); }

// Helper for strict normalization
function normalizeId(id) {
    return String(id).trim().toLowerCase();
}

// CRITICAL: Helper to add missing columns dynamically
function ensureHeaders(sheet, objectKeys) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return []; 
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const missing = objectKeys.filter(k => !headers.includes(k));
  
  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    return [...headers, ...missing]; // Return updated headers
  }
  return headers;
}

function saveResult(result) {
  const ss = getBatchSS(result.batchId);
  const sheetName = `RES_${result.courseId}`;
  let sheet = ss.getSheetByName(sheetName);
  if(!sheet) throw new Error("Course Sheet missing");

  // Dynamically ensure 'program' or any other key exists
  ensureHeaders(sheet, Object.keys(result));

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = getDataFromSheet(sheet);
  const rowIndex = allData.findIndex(r => normalizeId(r.id) === normalizeId(result.id));

  const rowData = headers.map(h => {
    let val = result[h];
    if (Array.isArray(val)) return JSON.stringify(val);
    return val;
  });

  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return result;
}

function bulkSaveResults(results) {
    if (!results || !results.length) return [];
    const ss = getBatchSS(results[0].batchId);
    const sheetName = `RES_${results[0].courseId}`;
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        const keys = Object.keys(results[0]);
        sheet.appendRow(keys);
    } else {
        // Dynamic Schema Update for existing sheets
        const sampleKeys = Object.keys(results[0]);
        ensureHeaders(sheet, sampleKeys);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idIdx = headers.indexOf('id');
    if (idIdx === -1) throw new Error("Invalid Sheet Structure: ID Column Missing");

    // Read ALL existing data range (Read Once)
    const lastRow = sheet.getLastRow();
    let existingData = [];
    if (lastRow > 1) {
       existingData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    }

    // Create Map with NORMALIZED IDs for strict detection
    const idMap = new Map();
    existingData.forEach((row, i) => {
        const normId = normalizeId(row[idIdx]);
        if(normId) idMap.set(normId, i);
    });

    const newRows = [];
    const payloadSeen = new Set();

    results.forEach(result => {
        const resultNormId = normalizeId(result.id);
        if (!resultNormId) return;

        const rowData = headers.map(h => { 
            let val = result[h]; 
            if (Array.isArray(val) || (typeof val === 'object' && val !== null)) return JSON.stringify(val); 
            return val; 
        });
        
        if (idMap.has(resultNormId)) {
            const idx = idMap.get(resultNormId);
            existingData[idx] = rowData;
        } else {
            if (!payloadSeen.has(resultNormId)) {
                newRows.push(rowData);
                payloadSeen.add(resultNormId);
            }
        }
    });

    if (existingData.length > 0) {
        sheet.getRange(2, 1, existingData.length, headers.length).setValues(existingData);
    }

    if (newRows.length > 0) {
        sheet.getRange(2 + existingData.length, 1, newRows.length, headers.length).setValues(newRows);
    }

    return results;
}

function deleteResult(id, courseId, batchId) {
    const ss = getBatchSS(batchId);
    const sheetName = `RES_${courseId}`;
    let sheet = ss.getSheetByName(sheetName);
    const data = getDataFromSheet(sheet);
    const idx = data.findIndex(r => normalizeId(r.id) === normalizeId(id));
    if(idx >= 0) sheet.deleteRow(idx + 2);
    return {id};
}

function getAllStudentResults(studentId, batchId) {
    const ss = getBatchSS(batchId);
    const cSheet = ss.getSheetByName('Courses');
    const courses = getDataFromSheet(cSheet);
    let finalResults = [];
    const targetId = normalizeId(studentId).replace(/\s+/g, ''); 

    courses.forEach(c => {
        if(c.isPublished) {
            const rSheet = ss.getSheetByName(`RES_${c.id}`);
            if(rSheet) {
                const results = getDataFromSheet(rSheet);
                const match = results.find(r => {
                    if (r.studentId === undefined || r.studentId === null) return false;
                    return normalizeId(r.studentId).replace(/\s+/g, '') === targetId;
                });
                if(match) finalResults.push({ result: match, course: c });
            }
        }
    });
    return finalResults;
}

function getCourseStatsBackend(courseId, batchId) {
    const ss = getBatchSS(batchId);
    const cSheet = ss.getSheetByName('Courses');
    const courses = getDataFromSheet(cSheet);
    const course = courses.find(c => c.id == courseId);
    if (!course) throw new Error("Course not found");
    const totalTarget = Number(course.config.totalTargetScore) || 100;
    
    const rSheet = ss.getSheetByName(`RES_${courseId}`);
    if (!rSheet) return null;
    const results = getDataFromSheet(rSheet);
    const totalStudents = results.length;
    if (totalStudents === 0) return null;

    const scores = [];
    const quizSums = {};
    const assignSums = {};
    
    results.forEach(r => {
        const s = Number(r.calculatedTotal) || 0;
        scores.push(s);
        if(r.quizScores && Array.isArray(r.quizScores)) {
            r.quizScores.forEach((qs, i) => { const qVal = (qs === null || qs === '' || qs === undefined) ? 0 : Number(qs); quizSums[i] = (quizSums[i] || 0) + qVal; });
        }
        if(r.assignmentScores && Array.isArray(r.assignmentScores)) {
            r.assignmentScores.forEach((as, i) => { const aVal = (as === null || as === '' || as === undefined) ? 0 : Number(as); assignSums[i] = (assignSums[i] || 0) + aVal; });
        }
    });

    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const totalSum = scores.reduce((a, b) => a + b, 0);
    const average = totalSum / totalStudents;
    const variance = scores.reduce((a, b) => a + Math.pow(b - average, 2), 0) / totalStudents;
    const stdDev = Math.sqrt(variance);
    const passingScore = totalTarget * 0.5;
    const passedCount = scores.filter(s => s >= passingScore).length;
    const passRate = (passedCount / totalStudents) * 100;

    const buckets = [0, 0, 0, 0, 0];
    scores.forEach(s => {
        const ratio = s / totalTarget;
        if (ratio <= 0.2) buckets[0]++; else if (ratio <= 0.4) buckets[1]++; else if (ratio <= 0.6) buckets[2]++; else if (ratio <= 0.8) buckets[3]++; else buckets[4]++;
    });

    const distributionData = [{ name: '0-20%', count: buckets[0] }, { name: '21-40%', count: buckets[1] }, { name: '41-60%', count: buckets[2] }, { name: '61-80%', count: buckets[3] }, { name: '81-100%', count: buckets[4] }];
    const passFailData = [{ name: 'Passed', value: passedCount, color: '#10B981' }, { name: 'Failed', value: totalStudents - passedCount, color: '#EF4444' }];

    const quizPerformance = [];
    const quizCount = course.config.quizCount || 0;
    for(let i=0; i<quizCount; i++) {
        const sum = quizSums[i] || 0;
        const avg = sum / totalStudents;
        const maxQ = (course.config.quizIndividualMaxScores && course.config.quizIndividualMaxScores[i]) ? course.config.quizIndividualMaxScores[i] : course.config.quizMaxScore;
        const pct = maxQ > 0 ? (avg / maxQ) * 100 : 0;
        quizPerformance.push({ name: `Q${i+1}`, percentage: pct });
    }

    const assignPerformance = [];
    const assignCount = course.config.assignmentCount || 0;
    for(let i=0; i<assignCount; i++) {
        const sum = assignSums[i] || 0;
        const avg = sum / totalStudents;
        const maxA = (course.config.assignmentIndividualMaxScores && course.config.assignmentIndividualMaxScores[i]) ? course.config.assignmentIndividualMaxScores[i] : course.config.assignmentMaxScore;
        const pct = maxA > 0 ? (avg / maxA) * 100 : 0;
        assignPerformance.push({ name: `A${i+1}`, percentage: pct });
    }

    const topStudents = results.sort((a, b) => (Number(b.calculatedTotal)||0) - (Number(a.calculatedTotal)||0)).slice(0, 5).map(s => ({ id: s.id, studentName: s.studentName, studentId: s.studentId, calculatedTotal: s.calculatedTotal }));

    return { totalStudents, average: Number(average.toFixed(1)), max, min, stdDev: Number(stdDev.toFixed(1)), passRate: Number(passRate.toFixed(1)), topStudents, distributionData, passFailData, quizPerformance, assignPerformance, totalTarget };
}

function getDataFromSheet(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => String(h).trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) { try { val = JSON.parse(val); } catch(e) {} }
      if (val === 'TRUE') val = true;
      if (val === 'FALSE') val = false;
      obj[h] = val;
    });
    return obj;
  });
}
