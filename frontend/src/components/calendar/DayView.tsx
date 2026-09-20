import React from 'react';
import { TimeGrid } from './TimeGrid';
import type { CalendarEventWithSubject } from '../../types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEventWithSubject[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithSubject) => void;
}

export const DayView: React.FC<DayViewProps> = ({ currentDate, events, onSlotClick, onEventClick }) => {
  return <TimeGrid days={[currentDate]} events={events} onSlotClick={onSlotClick} onEventClick={onEventClick} />;
};
