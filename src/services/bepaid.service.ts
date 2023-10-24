import axios from 'axios';
import { decrypt } from '../utils';
import dayjs from 'dayjs';
import { ETransactionStatus } from '@prisma/client';

import { prisma } from '../utils';

interface IGetCheckoutTokenParams {
  amount: number;
  bePaidId: string;
  bookingDescription: string;
  bookingId: string;
  buttonText: string;
  currency?: string;
  customerName: string;
  customerPhoneNumber: string;
  language: string;
  secretKey: string;
  theme: 'light' | 'dark';
}

export interface IBepaidCheckoutTokenResults {
  checkout: {
    redirect_url: string;
    token: string;
  };
}

export interface IBepaidCheckoutBadTokenResults {
  error: Record<string, Array<string>>;
  message: string;
}

export interface IGetCheckoutTokenResults {
  expiredAt: string;
  redirect_url: string;
  token: string;
}

export interface IGetCheckoutBadTokenResults {
  error: Record<string, Array<string>>;
  expiredAt: string;
  message: string;
}

interface ICommonTransactionParams {
  uid: string;
  amount: number;
  bePaidId: string;
  secretKey: string;
}

export interface ICommonTransactionResponse {
  transaction: {
    uid: string;
    status: ETransactionStatus;
    message: string;
    type: string;
    receipt_url: string;
  };
}

const themeColors = {
  dark: {
    widget: {
      backgroundColor: '#1f1f1f',
      buttonsColor: '#865bff',
    },
    cardFace: {
      backgroundColor: '#000',
    },
  },
  light: {
    widget: {
      backgroundColor: '#ffffff',
      buttonsColor: '#865bff',
    },
    cardFace: {
      backgroundColor: '#ffffff',
    },
  },
};

const currentUrl = process.env.CURRENT_URL;

if (!currentUrl) {
  throw new Error('ENV: missing CURRENT_URL');
}

class BePaidService {
  public async getCheckoutToken({
    amount,
    bePaidId,
    bookingDescription,
    bookingId,
    buttonText,
    currency = 'BYN',
    customerName,
    customerPhoneNumber,
    language,
    secretKey,
    theme,
  }: IGetCheckoutTokenParams): Promise<IGetCheckoutTokenResults | IGetCheckoutBadTokenResults> {
    const headers = {
      Authorization: `Basic ${Buffer.from(bePaidId + ':' + decrypt(secretKey)).toString('base64')}`,
      'X-API-Version': 2,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const currentTheme = theme in themeColors ? themeColors[theme] : themeColors.dark;

    const settings = await prisma.appSettings.findFirst({
      orderBy: {
        created_at: 'desc',
      },
    });
    const expiredAt = dayjs()
      .add(settings?.client_transaction_time || 300, 'seconds')
      .toISOString();

    const body = {
      checkout: {
        test: !process.env.BEPAID_PRODUCTION_MODE || process.env.BEPAID_PRODUCTION_MODE !== 'true',
        transaction_type: 'authorization',
        attempts: 3,
        iframe: true,
        settings: {
          success_url: `${currentUrl}/api/bepaid/success?theme=${theme}`,
          decline_url: `${currentUrl}/api/bepaid/decline`,
          fail_url: `${currentUrl}/api/bepaid/fail`,
          cancel_url: `${currentUrl}/api/bepaid/cancel`,
          notification_url: `${currentUrl}/api/wh/bepaid?bookingId=${bookingId}`,
          button_next_text: buttonText,
          language: language,
          customer_fields: {
            read_only: ['phone', 'first_name'],
          },
          style: {
            widget: {
              backgroundColor: currentTheme.widget.backgroundColor,
              buttonsColor: currentTheme.widget.buttonsColor,
              backgroundType: -1,
              backgroundCustomLeft: 0,
              backgroundCustomRight: 0,
            },
            button: {
              borderRadius: '16px',
            },
            header: {
              display: 'none',
            },
            footer: {
              display: 'none',
            },
            cardFace: {
              backgroundColor: currentTheme.cardFace.backgroundColor,
            },
          },
        },
        payment_method: {
          types: ['credit_card'],
        },
        order: {
          currency: currency,
          amount,
          description: bookingDescription,
          expired_at: expiredAt,
        },
        customer: {
          first_name: customerName,
          phone: customerPhoneNumber,
        },
      },
    };

    const response = await axios.post<IBepaidCheckoutTokenResults | IBepaidCheckoutBadTokenResults>(
      'https://checkout.bepaid.by/ctp/api/checkouts',
      body,
      { headers }
    );

    return { ...('checkout' in response.data ? response.data.checkout : response.data), expiredAt };
  }

  public async debitFunds({
    amount,
    uid,
    bePaidId,
    secretKey,
  }: ICommonTransactionParams): Promise<ICommonTransactionResponse['transaction']> {
    const headers = {
      Authorization: `Basic ${Buffer.from(bePaidId + ':' + decrypt(secretKey)).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const body = {
      request: {
        parent_uid: uid,
        amount,
      },
    };

    const response = await axios.post<ICommonTransactionResponse>(
      'https://gateway.bepaid.by/transactions/captures',
      body,
      {
        headers,
      }
    );
    return response.data.transaction;
  }

  public async cancelAuthorization({
    amount,
    uid,
    bePaidId,
    secretKey,
  }: ICommonTransactionParams): Promise<ICommonTransactionResponse['transaction']> {
    const headers = {
      Authorization: `Basic ${Buffer.from(bePaidId + ':' + decrypt(secretKey)).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const body = {
      request: {
        parent_uid: uid,
        amount,
      },
    };

    const response = await axios.post<ICommonTransactionResponse>(
      'https://gateway.bepaid.by/transactions/voids',
      body,
      {
        headers,
      }
    );

    return response.data.transaction;
  }

  public async refund({ amount, bePaidId, secretKey, uid }: ICommonTransactionParams) {
    const headers = {
      Authorization: `Basic ${Buffer.from(bePaidId + ':' + decrypt(secretKey)).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const body = {
      request: {
        parent_uid: uid,
        amount,
        reason: "We don't have the ingredients to cook this",
      },
    };

    const response = await axios.post<ICommonTransactionResponse>(
      'https://gateway.bepaid.by/transactions/refunds',
      body,
      {
        headers,
      }
    );

    return response.data.transaction;
  }
}

export const bepaidService = new BePaidService();
