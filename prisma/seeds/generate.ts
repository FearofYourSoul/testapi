import { faker } from '@faker-js/faker';
import { EDepositInteraction, EEmployeeRole, EPlaceExpensiveness, EPlaceTableShape, Prisma } from '@prisma/client';
import fs from 'fs';
import dayjs from 'dayjs';
import * as bcrypt from 'bcryptjs';

const sectionsSizes = [160, 220, 280, 300, 320, 340, 400];

const generators = {
  Owner: {
    _qty: 5,
    name: faker.name.firstName,
    email: faker.internet.email,
    password: faker.internet.password,
    phone_number: () => faker.phone.number('+375 29 ### ## ##'),
    is_email_verified: false,
    is_phone_verified: false,
  },

  Client: {
    _qty: 70,
    first_name: faker.name.firstName,
    last_name: faker.name.lastName,
    email: faker.internet.email,
    phone_number: () => faker.phone.number('+###(##)###-##-##'),
    verification_code: () => faker.random.numeric(6),
  },

  Employee: {
    _qty: 30,
    name: faker.name.fullName,
    email: faker.internet.email,
    phone_number: () => faker.phone.number('+############'),
    role: () => (Math.random() < 0.5 ? EEmployeeRole.administrator : EEmployeeRole.hostess),
    password: faker.internet.password,
    login: faker.name.firstName,
    is_email_verified: () => (Math.random() < 0.5 ? true : false),
    is_phone_verified: () => (Math.random() < 0.5 ? true : false),
    owner_id: 'Owner',
  },

  Admin: {
    _qty: 1,
    email: () => 'testacc@gmail.com',
    password: () => bcrypt.hashSync('newTestPass666', Number(process.env.SALT)),
  },

  Address: {
    _qty: 120,
    address_line1: () => faker.address.streetAddress(true),
    country_code: () => (Math.random() > 0.5 ? 'RU' : 'BY'),
    city: faker.address.city,
    postal_code: () => faker.address.zipCode('#####'),
    region: faker.address.state,
    latitude: () => 53.893009 + Math.random() * 2 - 1,
    longitude: () => 27.567444 + Math.random() * 2 - 1,
  },

  IikoPlace: {
    _qty: 0,
  },

  ReservesSettings: { _qty: 80, response_time: () => Math.round(Math.random() * 4) * 300 + 300 },

  Place: {
    _qty: 50,
    logo_url: () => faker.image.abstract(128, 128, true),
    name: faker.company.name,
    phone_number: () => faker.phone.number('+375 29 ### ## ##'),
    description: () => faker.random.words(Math.round(Math.random() * 50) + 20),
    expensiveness: () =>
      Object.keys(EPlaceExpensiveness)[Math.floor(Math.random() * Object.keys(EPlaceExpensiveness).length)],
    bepaid_id: () => '363',
    bepaid_secret_key: () =>
      'U2FsdGVkX19W71/tFKYtb6khw98LszWZSpmtujprM2fbnEEAARcO1/XWrGBuJL20I1jvKv/CoWm+sYJ3oTPVWsDJOkAcsh31wEpYS3ih2q42HPGR7UAiGUa1SCugdbLv',
    owner_id: 'Owner',
    reserves_settings_id: 'ReservesSettings',
    address_id: 'Address',
    is_published: () => (Math.random() > 0.5 ? true : false),
    PlaceSubscription: (planId: string) => ({
      create: {
        start_time: dayjs().toDate(),
        end_time: dayjs().add(1, 'year').toDate(),
        status: 'ACTIVE',
        place_id: '',
        SubscriptionPlan: {
          connect: {
            id: planId,
          },
        },
      },
    }),
  },

  PlaceMenuCategory: {
    _qty: 50,
    name: faker.company.bsBuzz,
    place_id: 'Place',
  },

  PlaceMenuItem: {
    _qty: 100,
    available_preorder: () => true,
    name: faker.company.bsBuzz,
    price: () => parseInt(faker.random.numeric(4)),
    weight: () => parseInt(faker.random.numeric(3)),
    calories: () => parseInt(faker.random.numeric(4)),
    place_menu_category_id: 'PlaceMenuCategory',
    place_id: 'Place',
    image_id: 'Image',
  },

  Deposit: {
    _qty: 50,
    person_price: () => Math.round(Math.random() * 10000),
    table_price: () => Math.round(Math.random() * 10000),
    is_table_price: () => true,
    is_person_price: () => true,
    interaction: () => (Math.random() < 0.5 ? EDepositInteraction.TAKE_MORE : EDepositInteraction.SUMMARIZE),
    place_id: 'Place',
  },

  DepositException: {
    _qty: 50,
    deposit_id: 'Deposit',
    person_price: () => Math.round(Math.random() * 10000),
    table_price: () => Math.round(Math.random() * 10000),
    is_table_price: () => true,
    is_person_price: () => true,
    for_days_of_week: () => false,
    is_all_day: () => true,
    start_date: () => dayjs().hour(0).set('minute', 0).set('second', 0).set('millisecond', 0).toDate(),
    end_date: () =>
      dayjs()
        .add(Math.round(Math.random() * 5), 'days')
        .hour(0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0)
        .toDate(),
  },

  ClientRatingField: {
    _qty: 100,
    name: faker.company.bsBuzz,
    place_id: 'Place',
  },

  Kitchen: {
    _qty: 0,
  },

  PlaceKitchen: {
    _qty: 100,
    place_id: 'Place',
    kitchen_id: 'Kitchen',
  },

  Image: {
    _qty: 922, // (static tables = 322) + (gen. tables = 600). The rest images in Image_static.json
    small: () => 'tables/287bf16e-ab8a-4407-b7de-472ce5cd195d-small.jpg',
    medium: () => 'tables/287bf16e-ab8a-4407-b7de-472ce5cd195d-medium.jpg',
    large: () => 'tables/287bf16e-ab8a-4407-b7de-472ce5cd195d-large.jpg',
    base: () => 'tables/287bf16e-ab8a-4407-b7de-472ce5cd195d-base.jpg',
    place_table_id: 'PlaceTable',
  },

  PlaceSection: {
    _qty: 100,
    name: faker.commerce.productName,
    width: () => sectionsSizes[Math.round(Math.random() * (sectionsSizes.length - 1))],
    height: () => sectionsSizes[Math.round(Math.random() * (sectionsSizes.length - 1))],
    place_id: 'Place',
  },

  PlaceTable: {
    _qty: 600,
    name: faker.random.word,
    seats: () => parseInt(faker.random.numeric()),
    external_id: () => faker.random.alphaNumeric(32),
    x: () => parseFloat((Math.random() * 0.75).toFixed(3)),
    y: () => parseFloat((Math.random() * 0.75).toFixed(3)),
    width: () => parseFloat((Math.random() * 0.2 + 0.05).toFixed(3)),
    height: () => parseFloat((Math.random() * 0.2 + 0.05).toFixed(3)),
    shape: () => Object.keys(EPlaceTableShape)[Math.floor(Math.random() * Object.keys(EPlaceTableShape).length)],
    place_section_id: 'PlaceSection',
  },

  Category: {
    _qty: 0,
  },

  CategoryPlace: {
    _qty: 150,
    category_id: 'Category',
    place_id: 'Place',
  },

  Booking: {
    _qty: 50,
    start_time: () => new Date(),
    end_time: () => new Date(Date.now() + parseInt(faker.random.numeric()) * 3600 * 1000),
    number_persons: () => parseInt(faker.random.numeric()),
    booking_number: () => Math.round(Math.random() * 50),
    place_table_id: 'PlaceTable',
    client_id: 'Client',
  },
};

// Get Prisma models list with metadata
const queue = [...Prisma.dmmf.datamodel.models];

const generateSeeds = async () => {
  queue.forEach((model) => {
    // take current model generators
    const modelGenerators = generators[model.name as keyof typeof generators] as any;

    const seeds = [];

    if (!modelGenerators) return;

    // Finally generate seeds for particular model
    for (let i = 0; i < modelGenerators._qty; i++) {
      const seed = model.fields.reduce((seedData, field) => {
        const generator = modelGenerators[field.name as keyof typeof modelGenerators] as string | Function | undefined;

        if (typeof generator === 'function') {
          return {
            ...seedData,
            [field.name]: generator(),
          };
        }

        if (typeof generator === 'string') {
          return {
            ...seedData,
            [field.name]: { type: generator },
          };
        }

        return seedData;
      }, {});

      seeds.push(seed);
    }

    // Format and write to json file.
    const json = JSON.stringify(seeds, null, 2);
    fs.writeFile(`${__dirname}/data/${model.name}.json`, json, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });
};

generateSeeds()
  .then(() => {
    console.log('Generated new seed data to prisma/seeds/data directory');
  })
  .catch((err) => {
    console.log(err);
  });
