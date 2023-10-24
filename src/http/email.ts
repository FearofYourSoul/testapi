import { TRPCError } from "@trpc/server";
import { RequestHandler } from "express";
import jwt from 'jsonwebtoken';
import { prisma } from '../utils';

export const verifyEmail: RequestHandler = async (req, res) => {
  const payload = jwt.verify(
    req.query.token?.toString() || '',
    process.env.VERIFICATION_JWT_SECRET_KEY || ''
  ) as jwt.JwtPayload | null;

  if (!payload) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
    });
  }

  await prisma.client.update({
    where: { id: payload.id },
    data: {
      is_email_verified: true,
    },
  });

  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(
      req.headers['user-agent'] || ''
    )
  ) {
    return res.writeHead(301, { Location: `${process.env.CLIENT_MOBILE_REDIRECT}://` }).end();
  }
  res.send(`<script>window.close();</script>`);
}