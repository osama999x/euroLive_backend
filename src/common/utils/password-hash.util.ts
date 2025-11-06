import * as bcrypt from 'bcrypt';

export class PasswordHashUtil {
  static async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  static async validatePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}

