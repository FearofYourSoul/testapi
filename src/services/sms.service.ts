import phone from 'phone';
import TelegramBot from 'node-telegram-bot-api';

import { authService } from './auth.service';
import { prisma } from '../utils/prisma';

interface IVerificationCodeProps {
  code: string;
  phoneNumber: string;
}

// TODO remove after add sms service
const token = process.env.TELEGRAM_API_TOKEN;
const bot = process.env.ENABLED_TELEGRAM_BOT === 'true' ? new TelegramBot(token || '', { polling: true }) : undefined;
const chatIds: Array<number> = [];

bot?.onText(/[\d\D]*/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId);
  }
  await bot.sendMessage(chatId, `Hi, ${msg.from?.first_name} ${msg.from?.last_name}`);
});

class SmsService {
  public async sendVerificationCode({ phoneNumber, clientId }: { phoneNumber: string; clientId?: string }) {
    const phone_number = clientId ? undefined : phone(phoneNumber).phoneNumber;

    if (!phone_number) {
      return;
    }

    const code = authService.generateVerificationCode();
    console.log(code);
    if (process.env.TELEGRAM_API_TOKEN && bot) {
      await Promise.all(chatIds.map((id) => bot.sendMessage(id, `Your code: ${code}`)));
    }
    const hashedCode = authService.hash(code);
    await prisma.client.upsert({
      where: {
        id: clientId,
        phone_number,
      },
      create: {
        verification_code: hashedCode,
        phone_number,
      },
      update: {
        verification_code: hashedCode,
        phone_number,
      },
    });

    return code;
  }

  public async checkVerificationCode({ code, phoneNumber }: IVerificationCodeProps) {
    const client = await prisma.client.findUnique({
      where: {
        phone_number: phoneNumber,
      },
      select: {
        id: true,
        phone_number: true,
        verification_code: true,
        first_name: true,
      },
    });

    return client && authService.compare({ str: code, hash: client.verification_code || '' });
  }
}

export const smsService = new SmsService();
