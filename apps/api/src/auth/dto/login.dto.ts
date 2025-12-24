import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
