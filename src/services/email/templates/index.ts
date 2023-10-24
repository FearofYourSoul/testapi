import fs from 'fs';
import path from 'path';
import { TRequest } from '../../../routes';

const verificationEmail = fs.readFileSync(path.join(__dirname, 'verification.template.html'), {
  encoding: 'utf8'
});
const forgotPassword = fs.readFileSync(path.join(__dirname, 'forgotPassword.template.html'), {
  encoding: 'utf8'
})

const attachments = [{
  filename: 'logo.png',
  path: path.join(__dirname, 'images/logo.png'),
  cid: 'logo-image',
}, {
  filename: 'email.png',
  path: path.join(__dirname, 'images/email.png'),
  cid: 'email-image',
}];

const templates = {
  email_verification: {
    template: verificationEmail,
    fields: '' as 'url',
    attachments,
  },
  forgot_password: {
    template: forgotPassword,
    fields: '' as 'url',
    attachments,
  }
};

export type ETemplatesType = typeof templates;
export type ETemplateKeys = keyof ETemplatesType;

export default templates;
