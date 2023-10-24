import { Prisma, PrismaClient } from '@prisma/client';
import { addWorkingHours, addPaymentPlans } from './scripts';

const SERVICE_FIELDS = ['__no_auto'];

const queue = [...Prisma.dmmf.datamodel.models];

const prisma = new PrismaClient();

const decapitalize = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

const seed = async () => {
  const plan = await addPaymentPlans();

  const noAutoIds: string[] = [];

  while (queue.length) {
    const model = queue.shift();

    if (!model) break;

    // get data for current model from json
    let generated = [];
    let staticData = [];
    try {
      generated = require(`./seeds/data/${model.name}.json`);
      staticData = require(`./seeds/data/${model.name}_static.json`);
    } catch (e) {}

    const data = [...staticData, ...generated];

    const firstItem = data[0];
    let relations = [] as string[];

    // take required relations from seed json's
    if (firstItem) {
      relations = Object.keys(firstItem).reduce((relations, dataKey) => {
        const value = firstItem[dataKey];
        if (typeof value.type === 'string') return [...relations, value.type];
        return relations;
      }, [] as string[]);
    }

    // is some of required relations is still in queue, so not yet populated
    const relationRequired = relations.some((relation) => {
      return queue.map((model) => model.name).includes(relation.split('.')[0]);
    });

    if (relationRequired) {
      // if there is lack or required relations, push model back to the end of the queue and skip the rest of iteration
      queue.push(model);
      continue;
    }

    // take existing relations from the database and push them to array. e.g. [[...addressRecords], [...productRecords], ...]
    const relationsData = await Promise.all(
      relations.map(async (relation) => {
        const key = decapitalize(relation).split('.')[0] as keyof typeof prisma;
        try {
          return (prisma[key] as any).findMany({});
        } catch (e) {
          console.log('error for key:', key);
          throw e;
        }
      })
    );

    // map relations records arrays to apppropriate model names. e.g. { Address: [...addressRecords], Product: [...productRecords] }
    const relationsMap = relations.reduce((relationsMap, relation, index) => {
      return {
        ...relationsMap,
        [relation.split('.')[0]]: relationsData[index],
      };
    }, {} as { [key: string]: any[] });

    // extract needed relations for each item and write to the database
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const relations = Object.keys(item).reduce((relations, fieldName) => {
        if (item[fieldName].type) {
          const type = item[fieldName].type.split('.')[0];
          const relationField = item[fieldName].type.split('.')[1] || 'id';
          const relationData: any[] = relationsMap[type];
          const autoRelationData = relationData.filter((item) => !noAutoIds.includes(item.id));

          let relationItem;
          if (item[fieldName].where) {
            const where = item[fieldName].where;
            const index = relationData.findIndex((item) => {
              return Object.keys(where).every((key) => item[key] === where[key]);
            });
            relationItem = relationData[index];
          } else {
            const index = i % autoRelationData.length;
            relationItem = autoRelationData[index];
          }

          return {
            ...relations,
            [fieldName]: relationItem[relationField],
          };
        }
        return relations;
      }, {} as Record<string, any>);

      const key = decapitalize(model.name) as keyof typeof prisma;

      const isNoAutoItem = !!item.__no_auto;
      // Remove service fields from an item before database create query
      SERVICE_FIELDS.forEach((field) => {
        delete item[field];
      });

      if (key === 'place') {
        Object.entries(relations).forEach(([key, value]) => {
          if (key.includes('_id')) {
            const splittedKey = key.split('_');
            const relationName = splittedKey
              .map((v) => v.split('').reduce<string>((val, cur, i) => (i === 0 ? cur.toUpperCase() : val + cur), ''))
              .slice(0, splittedKey.length - 1)
              .join('');
            relations[relationName] = {
              connect: {
                id: value,
              },
            };
            delete relations[key];
            delete item[key];
          }
        });
      }

      if (item['PlaceSubscription']) {
        item['PlaceSubscription'].create.SubscriptionPlan.connect.id = plan.id;
      }

      try {
        const dbItem = await (prisma[key] as any).create({
          data: {
            ...item,
            ...relations,
          },
        });
        if (isNoAutoItem) noAutoIds.push(dbItem.id);
      } catch (e) {
        // If we log each seed item, it will slow down the process a lot, so we log only the error
        console.error('\x1b[31m%s\x1b[0m', 'error creating seed record for key: ', key);
        throw e;
      }
    }
  }
  await addWorkingHours();
  await prisma.appSettings.create({ data: {} });
  console.log('end');
};

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
