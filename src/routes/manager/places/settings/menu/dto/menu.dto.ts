import { z } from 'zod';

const menuDto = z.object({
  placeId: z.string(),
});

const categoryOptions = z.object({
  categoryId: z.string(),
});

const menuItemOptions = z.object({
  menuItemId: z.string(),
});

export const getMenuCategoriesDto = menuDto;

export const createMenuCategoryDto = z
  .object({
    name: z.string(),
  })
  .merge(menuDto);

export const updateMenuCategoryDto = z
  .object({
    name: z.string(),
  })
  .merge(categoryOptions);

export const deleteMenuCategoryDto = categoryOptions;

export const getMenuItemsDto = z
  .object({
    categories: z.string().array().optional(),
  })
  .merge(menuDto);

export const createMenuItemDto = z
  .object({
    availablePreorder: z.boolean().optional(),
    calories: z.number().optional(),
    image: z.string().optional(),
    name: z.string(),
    placeMenuCategoryId: z.string(),
    price: z.number(),
    weight: z.number(),
  })
  .merge(menuDto);

export const updateMenuItemDto = createMenuItemDto.deepPartial().merge(menuItemOptions);

export const deleteMenuItemDto = menuItemOptions;
