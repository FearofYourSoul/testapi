import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { logger } from '../log';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

interface ISendNotification {
  data?: Record<string, string | number>;
  message: string;
  pushToken: string;
  title?: string;
}

class ExpoPushNotifications {
  public async sendNotification({ pushToken, data, message, title }: ISendNotification) {
    if (!Expo.isExpoPushToken(pushToken)) {
      logger.error(`Push token ${pushToken} is not a valid Expo push token. Message ${message}`);
      return;
    }

    const messages: Array<ExpoPushMessage> = [
      {
        to: pushToken,
        sound: 'default',
        title,
        body: message,
        data,
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: Array<ExpoPushTicket[]> = [];
    for (const chunk of chunks) {
      try {
        const ticket = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(ticket);
      } catch (error) {
        logger.error(`Push notification was't sent. Error ${error}`);
      }
    }
    return tickets[0];
  }
}

export const expoPushService = new ExpoPushNotifications();
