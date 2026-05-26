import 'dotenv/config';

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './schema/*.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
