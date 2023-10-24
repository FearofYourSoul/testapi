import { Booking, EBookingStatus, EDayOfWeek, PlaceTable, Prisma, PrismaClient, WorkingHours } from '@prisma/client';
import dayjs, { Dayjs } from 'dayjs';

interface IReservesTime {
  start_time: Dayjs;
  end_time: Dayjs;
}

interface IGenerateAllReserves {
  tables: PlaceTable[];
  client_id: string;
  reserveTime: IReservesTime;
}

interface IGenerateReserves {
  table_id: string;
  client_id: string;
}

const prisma = new PrismaClient();

type Tg = Prisma.Prisma__BookingClient<Booking, never>;

const date = dayjs(process.env.RESERVES_DATE);

const reservesTime: IReservesTime[] = [
  {
    start_time: date.set('hours', 3).set('minutes', 15),
    end_time: date.set('hours', 4).set('minutes', 30),
  },
  {
    start_time: date.set('hours', 4).set('minutes', 30),
    end_time: date.set('hours', 6).set('minutes', 0),
  },
  {
    start_time: date.set('hours', 6).set('minutes', 0),
    end_time: date.set('hours', 8).set('minutes', 15),
  },
  {
    start_time: date.set('hours', 8).set('minutes', 15),
    end_time: date.set('hours', 9).set('minutes', 45),
  },
  {
    start_time: date.set('hours', 9).set('minutes', 45),
    end_time: date.set('hours', 11).set('minutes', 45),
  },
  {
    start_time: date.set('hours', 11).set('minutes', 45),
    end_time: date.set('hours', 13).set('minutes', 0),
  },
  {
    start_time: date.set('hours', 14).set('minutes', 0),
    end_time: date.set('hours', 15).set('minutes', 30),
  },
  {
    start_time: date.set('hours', 15).set('minutes', 30),
    end_time: date.set('hours', 16).set('minutes', 45),
  },
  {
    start_time: date.set('hours', 16).set('minutes', 45),
    end_time: date.set('hours', 18).set('minutes', 15),
  },
  {
    start_time: date.set('hours', 18).set('minutes', 15),
    end_time: date.set('hours', 19).set('minutes', 30),
  },
  {
    start_time: date.set('hours', 19).set('minutes', 30),
    end_time: date.set('hours', 20).set('minutes', 45),
  },
  {
    start_time: date.set('hours', 20).set('minutes', 45),
    end_time: date.set('hours', 22).set('minutes', 0),
  },
];

const generateReservesTime = (workingHours: WorkingHours) => {
  if (workingHours?.is_working_all_day) return reservesTime;

  const start_time = date
    .set('hours', dayjs(workingHours.start_time).get('hours'))
    .set('minutes', dayjs(workingHours.start_time).get('minutes'));
  let end_time = date
    .set('hours', dayjs(workingHours.end_time).get('hours'))
    .set('minutes', dayjs(workingHours.end_time).get('minutes'));

  if (end_time.get('hours') < start_time.get('hours')) {
    console.log('yes');
    end_time = end_time.add(2, 'day');
  }

  const newReservesTime = reservesTime.filter((time) => start_time <= time.start_time && end_time >= time.end_time);

  return newReservesTime;
};

const generateReserves = ({ table_id, client_id }: IGenerateReserves) => {
  return prisma.booking.create({
    data: {
      start_time: date.set('hours', 13).toISOString(),
      end_time: date.set('hours', 14).toISOString(),
      place_table_id: table_id,
      booking_number: Math.round(Math.random() * 100),
      status: EBookingStatus.ACCEPTED,
      number_persons: Math.round(Math.random() * 5),
      client_id,
    },
  });
};

const generateAllReserves = ({ tables, client_id, reserveTime }: IGenerateAllReserves) => {
  return tables.map((table) => {
    return prisma.booking.create({
      data: {
        start_time: reserveTime.start_time.toISOString(),
        end_time: reserveTime.end_time.toISOString(),
        place_table_id: table.id,
        booking_number: Math.round(Math.random() * 100),
        status: EBookingStatus.ACCEPTED,
        number_persons: Math.round(Math.random() * 5),
        client_id,
      },
    });
  });
};

export const addReserves = async () => {
  const client = await prisma.client.findFirst();
  const section = await prisma.placeSection.findUnique({
    where: {
      id: process.env.SECTION_ID,
    },
    include: {
      PlaceTable: true,
    },
  });

  const workingHours = await prisma.workingHours.findFirst({
    where: {
      place_id: section?.place_id,
      day: date.format('dddd').toLowerCase() as EDayOfWeek,
    },
  });

  if (workingHours?.is_day_off) {
    console.log('This day is off for this place');
    return;
  }

  const newReservesTime = (workingHours && generateReservesTime(workingHours)) || reservesTime;

  const reserves = section?.PlaceTable.reduce<Array<Tg>>((acc, table) => {
    return [...acc, generateReserves({ table_id: table.id, client_id: client!.id })];
  }, []);

  const allReserves = newReservesTime.reduce<Array<Tg>>((acc, reserveTime) => {
    return [
      ...acc,
      ...generateAllReserves({
        tables: section?.PlaceTable.slice(0, Math.round(Math.random() * (section.PlaceTable.length - 1)) + 1) || [],
        client_id: client!.id,
        reserveTime,
      }),
    ];
  }, []);

  prisma.$transaction(reserves || []);
  prisma.$transaction(allReserves);
};

addReserves();
