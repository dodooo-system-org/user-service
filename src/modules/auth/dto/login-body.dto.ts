import { PickType } from '@nestjs/mapped-types';

import { CreateAuthDto } from './create-auth.dto';

export class LoginBodyDto extends PickType(CreateAuthDto, ['email', 'password'] as const) {}
