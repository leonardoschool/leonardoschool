import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: './schema.prisma',
  seed: {
    command: 'tsx seed.ts',
  },
});
