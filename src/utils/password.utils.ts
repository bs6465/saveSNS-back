import argon2 from 'argon2';
import logger from '../config/logger.ts';

const options = {
  type: argon2.argon2id,
  memoryCost: 2 ** 14,
  timeCost: 3,
  parallelism: 1,
};

async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hash = await argon2.hash(plainPassword, options);
    return hash;
  } catch (err) {
    logger.error({ err }, 'Password hashing failed');
    throw new Error('Error hashing password');
  }
}

async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    const isMatch = await argon2.verify(hashedPassword, plainPassword);
    return isMatch;
  } catch (err) {
    logger.error({ err }, 'Password comparison failed');
    return false;
  }
}

export default { hashPassword, comparePassword };
