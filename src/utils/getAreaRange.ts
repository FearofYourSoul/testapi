const radians = (degrees: number) => {
  return degrees * (Math.PI / 180);
};

export const getAreaRange = ({ lat, lng, distance }: { lat: number; lng: number;  distance: number /** km */ }) => {
  const lngStart = lng - distance / Math.abs(Math.cos(radians(lat)) * 111.045);
  const lngEnd = lng + distance / Math.abs(Math.cos(radians(lat)) * 111.045);
  const latStart = lat - distance / 111.045;
  const latEnd = lat + distance / 111.045;

  return {
    start: {
      lat: latStart,
      lng: lngStart,
    },
    end: {
      lat: latEnd,
      lng: lngEnd,
    },
  };
};
