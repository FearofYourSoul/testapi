import { EDayOfWeek, Prisma, PrismaClient, WorkingHours } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

type Tg = Prisma.Prisma__WorkingHoursClient<WorkingHours, never>;

const generateWorkingHours = (place_id: string) => {
  const isWorkingAllDay = Math.random() > 0.5;
  const defaultTime = dayjs()
    .set('year', 1970)
    .set('month', 0)
    .set('date', 1)
    .set('hours', 0)
    .set('minutes', 0)
    .set('s', 0)
    .set('ms', 0);

  const getTime = (isStart = true): string => {
    const date = defaultTime
      .set('date', 1)
      .set('hours', 0)
      .add(isStart ? Math.round(Math.random() * 6) + 4 : Math.round(Math.random() * 8) + 20, 'hours');
    return date.toISOString();
  };

  return Object.keys(EDayOfWeek).map((key) => {
    const isDayOff = Math.random() > 0.8;
    return prisma.workingHours.create({
      data: {
        day: key as EDayOfWeek,
        start_time: isWorkingAllDay || isDayOff ? defaultTime.toISOString() : getTime(),
        end_time: isWorkingAllDay || isDayOff ? defaultTime.add(1, 'day').toISOString() : getTime(false),
        place_id,
        is_working_all_day: isDayOff ? false : isWorkingAllDay,
        is_day_off: isDayOff,
      },
    });
  });
};

export const addWorkingHours = async () => {
  const places = await prisma.place.findMany();

  const hours = places.reduce<Array<Tg>>((acc, place) => {
    return [...acc, ...generateWorkingHours(place.id)];
  }, []);

  prisma.$transaction(hours);
  prisma.$disconnect();
};
