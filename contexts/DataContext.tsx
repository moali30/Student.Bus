
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { User, Batch, Course, StudentResult } from '../types';

interface DataContextType {
  // Data
  users: User[];
  batches: Batch[];
  activeBatch: Batch | undefined;
  courses: Course[]; // Courses for active batch
  resultsCache: Record<string, StudentResult[]>; // Cache results by courseId
  
  // Status
  isInitialLoading: boolean;
  isSyncing: boolean; // Background syncing status

  // Actions
  refreshAll: () => Promise<void>;
  
  // User Actions
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (id: string) => Promise<void>;

  // Batch Actions
  addBatch: (batch: Batch) => Promise<void>;
  updateBatch: (batch: Batch) => Promise<void>;
  removeBatch: (id: string) => Promise<void>;

  // Course Actions
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (course: Course) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;

  // Result Actions
  getCourseResults: (courseId: string, forceRefresh?: boolean) => Promise<StudentResult[]>; // Added forceRefresh
  updateResultOptimistic: (result: StudentResult) => void; // Immediate UI update
  saveResultBackground: (result: StudentResult) => void; // Debounced save
  bulkSaveResults: (results: StudentResult[]) => Promise<void>; // Mass save for rosters
  deleteResult: (id: string, courseId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatch, setActiveBatch] = useState<Batch | undefined>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [resultsCache, setResultsCache] = useState<Record<string, StudentResult[]>>({});
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Initial Load & Periodic Sync ---
  useEffect(() => {
    refreshAll(false); // Initial visible load

    // Periodic Sync every 60 seconds
    const intervalId = setInterval(() => {
        // Only sync if tab is visible to save resources
        if (!document.hidden) {
            console.log("Auto-syncing data (Silent)...");
            refreshAll(true); // Pass true to indicate silent background refresh
        }
    }, 60000); 

    return () => clearInterval(intervalId);
  }, []);

  const refreshAll = async (isBackground = false) => {
    // Only set full loading on first run if it's not a background sync
    if (users.length === 0 && !isBackground) setIsInitialLoading(true);
    
    // CRITICAL: If this is a background auto-sync, DO NOT trigger the global isSyncing spinner.
    // This keeps the UI stable and prevents "kicking" the user out of inputs.
    if (!isBackground) setIsSyncing(true);

    try {
      // Parallel Fetching for speed
      const [fetchedUsers, fetchedBatches] = await Promise.all([
        StorageService.getUsers(),
        StorageService.getBatches()
      ]);

      setUsers(fetchedUsers);
      setBatches(fetchedBatches);

      const active = fetchedBatches.find(b => b.isActive);
      
      // Optimization: Only update activeBatch if the ID actually changed to prevent unmounting components
      setActiveBatch(prev => {
          if (prev?.id !== active?.id) return active;
          return prev; // Return existing reference to prevent re-renders
      });

      if (active) {
        const fetchedCourses = await StorageService.getCourses(active.id);
        setCourses(fetchedCourses);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error("Initialization Failed", error);
    } finally {
      setIsInitialLoading(false);
      // Only turn off syncing if we explicitly turned it on (i.e., not background)
      if (!isBackground) setIsSyncing(false);
    }
  };

  // --- User Logic ---
  const addUser = async (user: User) => {
    setUsers(prev => [...prev, user]); // Optimistic
    setIsSyncing(true);
    const saved = await StorageService.saveUser(user);
    setUsers(prev => prev.map(u => u.id === user.id ? saved : u));
    setIsSyncing(false);
  };

  const updateUser = async (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u)); // Optimistic
    setIsSyncing(true);
    const saved = await StorageService.saveUser(user);
    setUsers(prev => prev.map(u => u.id === user.id ? saved : u));
    setIsSyncing(false);
  };

  const removeUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id)); // Optimistic
    setIsSyncing(true);
    await StorageService.deleteUser(id);
    setIsSyncing(false);
  };

  // --- Batch Logic ---
  const addBatch = async (batch: Batch) => {
    setBatches(prev => [...prev, batch]);
    setIsSyncing(true);
    const saved = await StorageService.saveBatch(batch);
    setBatches(prev => prev.map(b => b.id === batch.id ? saved : b));
    if (batches.length === 0 || saved.isActive) await refreshAll(); 
    else setIsSyncing(false);
  };

  const updateBatch = async (batch: Batch) => {
    const needsFullRefresh = batch.isActive && activeBatch?.id !== batch.id;
    
    setBatches(prev => prev.map(b => b.id === batch.id ? batch : b));
    if (batch.isActive) {
        setBatches(prev => prev.map(b => b.id === batch.id ? batch : { ...b, isActive: false }));
    }

    setIsSyncing(true);
    const saved = await StorageService.saveBatch(batch);
    setBatches(prev => prev.map(b => b.id === batch.id ? saved : b));
    
    if (needsFullRefresh) {
        await refreshAll();
    } else {
        setIsSyncing(false);
    }
  };

  const removeBatch = async (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
    setIsSyncing(true);
    await StorageService.deleteBatch(id);
    setIsSyncing(false);
  };

  // --- Course Logic ---
  const addCourse = async (course: Course) => {
    setCourses(prev => [...prev, course]); // Optimistic
    setIsSyncing(true);
    try {
        const saved = await StorageService.saveCourse(course);
        setCourses(prev => prev.map(c => c.id === course.id ? saved : c));
    } catch(e) {
        console.error("Failed to add course", e);
    } finally {
        setIsSyncing(false);
    }
  };

  const updateCourse = async (course: Course) => {
    setCourses(prev => prev.map(c => c.id === course.id ? course : c));
    
    setIsSyncing(true);
    try {
        const saved = await StorageService.saveCourse(course);
        setCourses(prev => prev.map(c => c.id === course.id ? saved : c));
    } catch(e) {
        console.error("Failed to update course", e);
    } finally {
        setIsSyncing(false);
    }
  };

  const removeCourse = async (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    setIsSyncing(true);
    if (activeBatch) await StorageService.deleteCourse(id, activeBatch.id);
    setIsSyncing(false);
  };

  // --- Result Logic (The heavy part) ---
  const getCourseResults = useCallback(async (courseId: string, forceRefresh = false) => {
    // If cached and not forced, return cache
    if (!forceRefresh && resultsCache[courseId]) {
      return resultsCache[courseId]; 
    }
    
    // Fetch if not cached or forced
    if (!activeBatch) return [];
    
    try {
      const results = await StorageService.getResults(courseId, activeBatch.id);
      setResultsCache(prev => ({ ...prev, [courseId]: results }));
      return results;
    } catch (e) {
        console.error("Error fetching results", e);
        return [];
    }
  }, [activeBatch, resultsCache]);

  const updateResultOptimistic = (result: StudentResult) => {
    setResultsCache(prev => {
      const courseResults = prev[result.courseId] || [];
      const index = courseResults.findIndex(r => r.id === result.id);
      let newResults;
      
      if (index >= 0) {
        newResults = [...courseResults];
        newResults[index] = result;
      } else {
        newResults = [...courseResults, result];
      }
      
      return { ...prev, [result.courseId]: newResults };
    });
  };

  // Debounced save map to prevent spamming API
  const saveTimeouts = React.useRef<Record<string, any>>({});

  const saveResultBackground = (result: StudentResult) => {
    // 1. Optimistic Update first (Updates the Cache, but NOT the UI Sync State yet to prevent jitter)
    updateResultOptimistic(result);
    
    // 2. Clear pending save for this student
    if (saveTimeouts.current[result.id]) {
        clearTimeout(saveTimeouts.current[result.id]);
    }

    // 3. Set new timeout
    saveTimeouts.current[result.id] = setTimeout(async () => {
        setIsSyncing(true); // Only trigger sync spinner when ACTUALLY saving (User Action)
        try {
            await StorageService.saveResult(result);
        } catch (e) {
            console.error("Failed to save result in background", e);
        } finally {
            setIsSyncing(false); 
        }
    }, 2000); // Increased debounce to 2s for smoother typing
  };

  const bulkSaveResults = async (results: StudentResult[]) => {
      if (results.length === 0) return;
      const courseId = results[0].courseId;

      // 1. Optimistic Update Cache
      setResultsCache(prev => {
          const existing = prev[courseId] || [];
          const existingMap = new Map(existing.map(r => [r.id, r]));
          results.forEach(r => existingMap.set(r.id, r));
          return { ...prev, [courseId]: Array.from(existingMap.values()) };
      });

      // 2. API Call
      setIsSyncing(true);
      try {
          await StorageService.bulkSaveResults(results);
      } catch (e) {
          console.error("Bulk save failed", e);
      } finally {
          setIsSyncing(false);
      }
  };

  const deleteResult = async (id: string, courseId: string) => {
     // Optimistic
     setResultsCache(prev => ({
         ...prev,
         [courseId]: (prev[courseId] || []).filter(r => r.id !== id)
     }));
     
     setIsSyncing(true);
     if (activeBatch) await StorageService.deleteResult(id, courseId, activeBatch.id);
     setIsSyncing(false);
  };


  return (
    <DataContext.Provider value={{
      users, batches, activeBatch, courses, resultsCache,
      isInitialLoading, isSyncing, refreshAll,
      addUser, updateUser, removeUser,
      addBatch, updateBatch, removeBatch,
      addCourse, updateCourse, removeCourse,
      getCourseResults, updateResultOptimistic, saveResultBackground, bulkSaveResults, deleteResult
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
