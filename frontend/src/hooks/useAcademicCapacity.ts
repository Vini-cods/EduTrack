import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { validDailyCapacity } from '../lib/analytics';

export function useAcademicCapacity() {
  const { value, update, ready, saving } = useUserPreferences();
  const saveCapacity = (capacity: number): Promise<boolean> => validDailyCapacity(capacity)
    ? update({ daily_capacity_hours: capacity }) : Promise.resolve(false);
  return { capacity: value.daily_capacity_hours, saveCapacity, ready, saving };
}
