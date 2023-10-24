import axios from 'axios';

import templates, {ETemplateKeys, ETemplatesType} from './templates';

interface IEmailOptions {
  to: string;
  subject: string;
}

class EmailService {
  private readonly api_secret: string;
  constructor() {
    if (!process.env.EMAIL_SECRET_KEY) {
      throw new Error('EMAIL_SECRET_KEY required');
    }

    this.api_secret = process.env.EMAIL_SECRET_KEY;
  }

  private pushArguments<T extends ETemplateKeys>(key: T, args: Record<ETemplatesType[T]['fields'], string>) {
    let temp = templates[key].template;
    const regex = new RegExp(/\[\[.*?\]\]/g);
    const matches = temp.match(regex);
    const contents = matches?.map(match => match.slice(2, -2));
    Object.entries<string>(args).map(([key, value]) => {
      temp = temp.replace(`{{${key}}}`, value);
    });

    return temp;
  }

  async sendMessage<T extends ETemplateKeys>(
    key: T,
    args: Record<ETemplatesType[T]['fields'], string>,
    options: IEmailOptions,
  ) {
    const { attachments } = templates[key];
    const template = this.pushArguments(key, args);

    return await axios.post(
      `https://api.sparkpost.com/api/v1/transmissions`,
      {
        content: {
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_EMAIL}>`,
          subject: options.subject,
          html: template,
          attachments,
        },
        recipients: [
          {
            address: options.to,
          },
        ],
      },
      {
        headers: {
          Authorization: this.api_secret,
        },
      }
    );
  }
}

export const emailService = new EmailService();
