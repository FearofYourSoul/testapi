export type FilterMap<T extends string, K> = {
  [key in T]: K;
};

export const createFilterWhereInput: <T extends string, K>(
  filterMap: FilterMap<T, K>,
  filters: { [key in string]: string | string[] | undefined }
) => K = (filtersMap, filters) => {
  return {
    AND: Object.entries(filtersMap)
      .filter(([key]) => {
        if (typeof filters[key] === 'object' && !filters[key]?.length) return false;
        return filters[key] !== undefined;
      })
      .map(([_, value]) => {
        return value;
      }),
  } as any;
};
