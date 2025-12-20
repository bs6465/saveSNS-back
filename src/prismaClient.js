// src/prismaClient.js
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. 기존 pg의 Pool을 생성 (환경변수에서 URL 가져옴)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: false,
});

// 2. Prisma용 어댑터 생성
const adapter = new PrismaPg(pool);

// 3. 어댑터를 꽂아서 PrismaClient 생성
const prisma = new PrismaClient({ adapter });

export { prisma };
