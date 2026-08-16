import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { MailService } from './mail.service'; //Importado o seu MailService

@Module({ 
  imports: [
    // Responsável por testes com envio de e-mail 
    MailerModule.forRoot({
      transport: {
        host: 'smtp.ethereal.email', // Corrigido de .eamil para .email
        port: 587,
        auth: {
          user: 'seu_usuario_ethereal', // Substitua pelas credenciais do seu Ethereal
          pass: 'sua_senha_ethereal',
        },
      },
      defaults: {
        from: '"Suporte Orders API" <no-reply@ordersapi.com>',
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService, 
    MailService, // Registrado o MailService nos providers do módulo
  ], 
})
export class AppModule {}