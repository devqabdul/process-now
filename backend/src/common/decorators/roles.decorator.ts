import { Reflector } from '@nestjs/core';
import type { RoleKey } from '../roles.js';

export const Roles = Reflector.createDecorator<RoleKey[]>();
