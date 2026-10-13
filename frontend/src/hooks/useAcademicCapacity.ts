import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { capacityStorageKey, readDailyCapacity } from '../lib/analytics';

export function useAcademicCapacity() {
  const { user } = useAuth();
  const [capacity, setCapacity] = useState(() => readDailyCapacity(user?.id));
  useEffect(() => { setCapacity(readDailyCapacity(user?.id)); }, [user?.id]);
  useEffect(() => {
    if (user?.id === undefined) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === capacityStorageKey(user.id)) setCapacity(readDailyCapacity(user.id));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.id]);
  const saveCapacity = (value: number): boolean => {
    setCapacity(value);
    if (user?.id === undefined) return false;
    try {
      localStorage.setItem(capacityStorageKey(user.id), String(value));
      return true;
    } catch {
      return false;
    }
  };
  return { capacity, saveCapacity };
}
