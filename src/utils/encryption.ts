import crypto from 'crypto';
import CryptoJS from 'crypto-js';

const cryptoOptions = {
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
};

const secretKey = process.env.ENCRYPTION_KEY;

if (!secretKey) {
  throw new Error('ENV: missing ENCRYPTION_KEY');
}

const key = crypto.createHash('sha512').update(secretKey).digest('hex').substring(0, 32);

export const encrypt = (data: string) => {
  return CryptoJS.AES.encrypt(data, key, cryptoOptions).toString();
};

export const decrypt = (encryptedData: string) => {
  try {
    return CryptoJS.AES.decrypt(encryptedData, key, cryptoOptions).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return '';
  }
};
