import { registerAs } from '@nestjs/config';

function stripEnv(value?: string): string | undefined {
  if (!value) {
    return value;
  }
  return value.trim().replace(/^['"]|['"]$/g, '');
}

export default registerAs('mail', () => {
  const user = stripEnv(process.env.MAIL_USER);
  const from = stripEnv(process.env.MAIL_FROM);

  return {
    host: stripEnv(process.env.MAIL_HOST),
    port: parseInt(stripEnv(process.env.MAIL_PORT) || '587', 10) || 587,
    user,
    password: stripEnv(process.env.MAIL_PASSWORD),
    from: from || (user ? `"King Queen Live" <${user}>` : '"King Queen Live" <noreply@localhost>'),
  };
});
