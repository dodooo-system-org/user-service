import { RmqContext } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';

import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
    let controller: UserController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [{ provide: UserService, useValue: {} }],
        }).compile();

        controller = module.get<UserController>(UserController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleTestUserMessage', () => {
        it('should log and acknowledge the message', async () => {
            const data = { test: 'payload' };
            const ackMock = jest.fn();
            const getChannelRef = jest.fn(() => ({ ack: ackMock }));
            const getMessage = jest.fn(() => 'msg');
            const context = { getChannelRef, getMessage } as unknown as RmqContext;

            const result = await controller.handleTestUserMessage(data, context);
            expect(result).toBe('Message received');
            expect(getChannelRef).toHaveBeenCalled();
            expect(getMessage).toHaveBeenCalled();
            expect(ackMock).toHaveBeenCalledWith('msg');
        });
    });
});
