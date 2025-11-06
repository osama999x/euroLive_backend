import * as otpGenerator from 'otp-generator';

export class GenerateOtpUtil {
  static generate(): { otp: string; expirationTime: Date } {
    const otp = otpGenerator.generate(4, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });
    const now = new Date();
    const expirationTime = this.addMinutesToDate(now, 5);
    return { otp, expirationTime };
  }

  private static addMinutesToDate(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }
}

