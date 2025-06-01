import { Column } from 'typeorm';

export class BaseEntity {
    @Column({
        name: 'created_at',
        type: 'timestamp with time zone',
        default: () => 'CURRENT_TIMESTAMP',
    })
    readonly createdAt: Date;

    @Column({
        name: 'updated_at',
        type: 'timestamp with time zone',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    readonly updatedAt: Date;
}
