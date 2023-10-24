import { EDayOfWeek, WorkingHours } from '@prisma/client';

export const sortWorkingHours = <T extends Partial<WorkingHours>[]>(workingHours: T) => {
  const weekdays = Object.values(EDayOfWeek);

  return workingHours.sort((a, b) => {
    return weekdays.findIndex((value) => value === a.day) - weekdays.findIndex((value) => value === b.day);
  });
};
