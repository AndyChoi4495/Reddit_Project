import { IsEmail, Length } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, Index, In, OneToMany, BeforeInsert } from 'typeorm';
import bcrypt from 'bcryptjs';
import Post from './Post';
import Vote from './Vote';
import BaseEntity from './Entity';

@Entity('users')
export class User extends BaseEntity {
    @Index()
    @IsEmail(undefined, { message: 'Wrong Format' })
    @Length(1, 255, { message: 'Cannot be empty' })
    @Column({ unique: true })
    email: string;

    @Index()
    @Length(3, 32, { message: 'Username must be more than 3.' })
    @Column({ unique: true })
    username: string;

    @Column()
    @Length(6, 255, { message: 'Password must be more than 6 digits.' })
    password: string;

    @OneToMany(() => Post, (post) => post.user)
    posts: Post[];

    @OneToMany(() => Vote, (vote) => vote.user)
    votes: Vote[];

    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 6);
    }
}
