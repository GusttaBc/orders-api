

import {Injectable} from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer';


@Injectable()
export class MailService {
    constructor ( private readonly mailerService: MailerService){}

// Aki envia o e-mail via Nodemailer (envia um token para o email )
async sendOrderConfirmationEmail( userEmail: string , orderId: string , token: string){
    await this.mailerService.sendMail({
        to: userEmail,
        subject:'Confirme Seu Pedido',
       html: `
        <h2>Obrigado por comprar conosco!</h2>
        <p>Seu pedido <strong>#${orderId}</strong> foi criado com sucesso.</p>
        <p>Utilize o código abaixo para confirmar seu pedido:</p>
        <h1 style="color: #4CAF50; letter-spacing: 2px;">${token}</h1>
        <p><em>Este código expira em 15 minutos.</em></p>
      `,
    });
    }

}