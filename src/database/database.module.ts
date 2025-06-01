import { Module } from '@nestjs/common';

import { DatabaseService } from './database.service';
import { databaseProvider } from './providers/database.provider';

@Module({
    imports: [databaseProvider],
    providers: [DatabaseService],
    exports: [databaseProvider],
})
export class DatabaseModule {}
