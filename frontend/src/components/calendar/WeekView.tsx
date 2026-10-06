import React from 'react';
import { TimeGrid } from './TimeGrid';
import { getWeekDays } from '../../lib/calendar';
import type { CalendarEventWithSubject } from '../../types';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEventWithSubject[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithSubject) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({ currentDate, events, onSlotClick, onEventClick }) => {
  const days = getWeekDays(currentDate);
  return <TimeGrid days={days} events={events} onSlotClick={onSlotClick} onEventClick={onEventClick} />;
};
