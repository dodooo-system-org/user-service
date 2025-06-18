import { Logger, Module, OnModuleInit } from '@nestjs/common';

import { databaseProvider } from './providers/database.provider';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { upperCase } from 'lodash';

@Module({
    imports: [databaseProvider],
    exports: [databaseProvider],
})
export class DatabaseModule implements OnModuleInit {
    private readonly logger = new Logger(DatabaseModule.name);
    
        constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
    
        async onModuleInit() {
            type QueryResult = {
                current_time: string;
            };
            if (this.dataSource.isInitialized) {
                this.logger.verbose('Database connection is already initialized');
                const result: QueryResult[] = await this.dataSource.query('SELECT now() as current_time;');
                this.logger.log(`Current time from database: ${upperCase(result?.[0]?.['current_time'])}`);
            } else {
                this.logger.fatal('Database connection is not initialized');
            }
        }
}
