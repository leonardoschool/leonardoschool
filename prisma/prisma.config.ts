import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Carica il file .env dalla root del progetto
config({ path: resolve(__dirname, '../.env') });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
