import dayjs from 'dayjs';

export const getExpiresIn = (time: string) =>
  dayjs()
    .add(parseFloat(time), time.slice(-1) as dayjs.ManipulateType)
    .toDate()
    .getTime();

export const formatToWorkingHour = (props?: { timestamp?: dayjs.Dayjs | Date | string; isNextDay?: boolean }) => {
  const { timestamp, isNextDay } = props || {};
  const defaultTime = dayjs(timestamp)
    .set('year', 1970)
    .set('month', 0)
    .set('date', isNextDay ? 2 : 1)
    .set('s', 0)
    .set('ms', 0);
  if (!timestamp) {
    return defaultTime.set('hour', 0).set('minute', 0).toDate();
  }
  return defaultTime.toDate();
};

export const getWorkingHours = ({
  endTime,
  startTime,
  isWorkingAllDay,
}: {
  endTime: string;
  startTime: string;
  isWorkingAllDay?: boolean;
}) => {
  if (isWorkingAllDay) {
    return {
      start_time: formatToWorkingHour(),
      end_time: formatToWorkingHour({ isNextDay: true }),
    };
  }
  const start = dayjs(startTime);
  const end = dayjs(endTime);

  return {
    start_time: isWorkingAllDay ? formatToWorkingHour({ timestamp: start }) : formatToWorkingHour(),
    end_time: isWorkingAllDay
      ? formatToWorkingHour({ timestamp: end, isNextDay: start.hour() > end.hour() })
      : new Date(Date.UTC(0, 0, 0)),
  };
};
