import { UUID } from 'crypto';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AuthEntity } from './auth.entity';
import { BaseEntity } from './base.entity';

@Entity({ name: 'users', comment: 'User details' })
export class UserEntity extends BaseEntity {
    @PrimaryGeneratedColumn('uuid', {
        name: 'user_id',
    })
    readonly userId: UUID;

    @Column({ name: 'first_name', type: 'varchar', length: 50, nullable: true })
    readonly firstName: string;

    @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
    readonly lastName: string;

    @Column({ name: 'middle_name', type: 'varchar', length: 50, nullable: true })
    readonly midName: string;

    @Column({
        name: 'phone',
        type: 'varchar',
        length: 15,
        unique: true,
        nullable: true,
    })
    readonly phone: string;

    @Column({
        name: 'identity_number',
        type: 'varchar',
        length: 11,
        unique: true,
        nullable: true,
    })
    readonly identityNumber: string;

    @Column({ name: 'birth_date', type: 'date', nullable: true })
    readonly birthDate: Date | null;

    @Column({ name: 'avatar', type: 'varchar', nullable: true })
    readonly avatar: string | null;

    @OneToOne(() => AuthEntity, (auth) => auth.authId, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        nullable: false,
    })
    @JoinColumn({ name: 'auth_id', referencedColumnName: 'authId' })
    readonly auth: AuthEntity;
}
