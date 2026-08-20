// REGRA DE NEGOCIO COMEÇA AKI !!

import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "./prisma.service"; 
import { MailService } from "./mail.service"; 
import { CreateOrderDto } from "./create-order.dto";
import { randomBytes } from "crypto";
import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition"; // Biblioteca Responsavel pela Facial (AWS)
import * as QRCode from 'qrcode'; // responsavel por gerar um qr code

@Injectable()
export class AppService {
  
  // Instância do Rekognition 
  private rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || 'us-east-1', // Qual data center responssavel da AWS serao Processadas ( Respossavel por fazer a Comparaçao Facial)
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService, 
  ) {}

  async confimOrderWithFacial(token: string, imageBase64: string) {
    // 1. Busca o Pedido Pelo Token
    const order = await this.prisma.order.findFirst({
      where: { confirmationToken: token }, // Onde ele vai Procurar  e Espera que Retorne Um Token 
      include: { customer: true }, // Verifica se O pedido e Vedadeiro 
    });

    if (!order) {
      throw new NotFoundException('Token de confirmação inválido ou expirado.'); // Se o pedido Nao For encontrado 
    }

    if (order.tokenExpiresAt && order.tokenExpiresAt < new Date()) { // Se o Token Tiver Passado Dos 15 Minutos 
      throw new BadRequestException('Token Expirado.');
    }

    if (!order.customer.avatarUrl) { // Verifica se Ocliente Tem Uma Foto no Cadastro 
      throw new BadRequestException('Cliente não possui foto cadastrada para reconhecimento facial.');
    }

    // 2. Converte a foto tirada na hora para Buffer
    const capturedImageBuffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''),// Converte a Imagen enviada no Formato DATA URL para BUFFER ou (Binario)
      'base64',
    );

    // 3. Converte a foto do cadastro do cliente para Buffer
    const registeredImageBuffer = Buffer.from(
      order.customer.avatarUrl.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );

    // 4. Compara as Faces na AWS Rekognition
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: registeredImageBuffer }, // Foto de Cadastro 
      TargetImage: { Bytes: capturedImageBuffer },   // Foto Capturada na Hora
      SimilarityThreshold: 80,                       // Exige 80%+ de similaridade
    });

    const response = await this.rekognition.send(command);

    // 5. Valida se encontrou combinação
    const faceMatches = response.FaceMatches || [];
    if (faceMatches.length === 0) {
      throw new BadRequestException('Reconhecimento Facial Falhou: Rosto não reconhecido!');
    }

    const similarity = faceMatches[0].Similarity;

    // 6. Atualiza o status do Pedido para CONFIRMED
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        confirmationToken: null,
        tokenExpiresAt: null,
      },
    });

    return {
      message: 'Pedido confirmado com sucesso via Biometria Facial!',
      similarityScore: `${similarity?.toFixed(2)}%`,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    };
  }

   async generatrFacialQrCode(token:string){
    // Busca o Pedido pelo Token 
    const order = await this.prisma.order.findFirst({
      where:{ confirmationToken: token}
    });

    if (!order){
      throw new NotFoundException('Token inválido ou pedido não encontrado.');
    }
    // URL Que o celular Vai abrir ao Ler o QR code
    // Subistitua pelo Ip Local 
    const mobileUrl = `http://192.168.1.5/facial-mobile.html?token=${token}`;
   
  
    // Gera a Imagem Em Formato Data URL (Base64)
    const qrCodeDataUrl =  await QRCode.toDataURL(mobileUrl);

    return{
      messege: 'QR code Gerado Com Sucesso',
      token,
      qrCodeUrl:qrCodeDataUrl,
      mobileUrl,
    };
  }

  async updateOrderStatus(id: string, status: string) { 
    const order = await this.prisma.order.findUnique({ // verificação se o pedido é existente 
      where: { id }
    });

    if (!order) { 
      throw new NotFoundException('Pedido Não Encontrado !!');
    }

    if (order.status === 'CANCELED' || order.status === 'CANCELLED') { // Se o status for Cancelado dispara o erro
      throw new BadRequestException('Não é possível alterar o status de um pedido cancelado');
    }

    return await this.prisma.order.update({ // Retorna os Dados do Banco 
      where: { id }, // Qual coluna Procurar 
      data: { status }, // Quais Dados Carregar 
    });
  }


  async findOrderById(id: string) { // PROCURAR O PEDIDO PELO "ID"
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true, 
      }
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return order;
  }


  async confirmOrder(token: string) {
    // Busca o pedido pelo Token enviado pelo Cliente
    const order = await this.prisma.order.findFirst({
      where: { confirmationToken: token },
    });

    if (!order) {
      throw new NotFoundException('Token de confirmação inválido ou não encontrado.');
    }

    // Verifica se o Token já expirou (15 minutos)
    if (order.tokenExpiresAt && order.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Token expirado. Por favor, solicite um novo código.');
    }

    // Atualiza o Status do Pedido para CONFIRMED e limpa o Token
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        confirmationToken: null, 
        tokenExpiresAt: null,
      },
    });

    return {
      message: 'Pedido Confirmado',
      orderId: updatedOrder.id,   
      status: updatedOrder.status, 
    };
  }


  async deleteOrder(id: string) { // Busca o pedido para saber qual quantidade devolver
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Pedido Nao encontrado');
    } 

    await this.prisma.$transaction([ // Deleta o pedido e Devolve o produto ao estoque
      this.prisma.order.delete({
        where: { id },
      }),

      this.prisma.product.update({
        where: { id: order.productId },
        data: {
          stockQuantity: {
            increment: order.quantity, // Incrementa a quantidade no estoque
          },
        },
      }),
    ]);

    return { message: 'Pedido Cancelado e Produto Devolvido ao Estoque com Sucesso' };
  }


  // OBTER METRICAS DO SISTEMA 
  async getMetrics() {
    // 1. CONTA QUANTOS CLIENTES EXISTEM NA TABELA CUSTOMER
    const totalCustomers = await this.prisma.customer.count();
    // 2. CONTA QUANTOS PRODUTOS EXISTEM NA TABELA 
    const totalProducts = await this.prisma.product.count();
    // 3. CONTA APENAS OS PEDIDOS COM STATUS DE COMPLETO
    const totalCompletedOrders = await this.prisma.order.count({
      where: { status: 'COMPLETED' },
    });
    // QUANTIDADE DE CANCELAMENTOS 
    const totalCancelledOrders = await this.prisma.order.count({
      where: { status: 'CANCELLED' },
    });
    
    return { // RETORNA UM OBJETO LIMPO COM TODAS AS METRICAS 
      totalCustomers,
      totalProducts,
      totalCompletedOrders,
      totalCancelledOrders,
    };
  }


  async cancelOrder(id: string) { // CANCELAMENTO DO PRODUTO PELO ID
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) { // SE O PEDIDO NAO FOR ENCONTRADO ERRO 
      throw new NotFoundException('Pedido nao Encontrado');
    }
    if (order.status === 'CANCELLED') { // SE O STATUS FOR IGUAL CANCELADO 
      throw new BadRequestException('Este Pedido Esta Cancelado');
    }

    return await this.prisma.$transaction([ // $transaction EXECUTA MULTIPLOS COMANDOS DE FORMA AUTOMATICA
      this.prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.product.update({ // LOGICA PARA O PEDIDO VOLTAR AO ESTOQUE 
        where: { id: order.productId }, 
        data: {
          stockQuantity: {
            increment: order.quantity, // AUMENTA A QUANTIDADE NO BANCO
          },
        },
      }),
    ]);
  }


  // Método de criação de pedido completo e validado
  async createOrder(data: CreateOrderDto) {  
    const { customerId, productId, quantity } = data; // data = requisiçoes do body 

    // 1. Validar quantidade
    if (quantity <= 0) {
      throw new BadRequestException('A Quantidade Do Pedido Deve Ser Maior Que Zero');
    }

    // 2. Buscar e validar se cliente existe
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId }, 
    });
    
    if (!customer) {
      throw new NotFoundException('Cliente nao Encontrado no Banco de Dados');
    }

    // 3. Buscar e validar se produto existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produto nao Encontrado no Banco de Dados');
    }

    // 4. Validar quantidade de estoque
    if (product.stockQuantity < quantity) {
      throw new BadRequestException(
        `Estoque insuficiente. Quantidade disponível: ${product.stockQuantity}`
      );
    }

    // 5. Gera Token e Data de Expiração (15 Minutos) 👈 FORA DO IF DO ESTOQUE
    const confirmationToken = randomBytes(3).toString('hex').toUpperCase(); // Exemplo: 'B4F9A1'
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos em ms

    // 6. Transação no Banco de Dados (RollBack / Tudo ou Nada)
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: product.stockQuantity - quantity,
        },
      });

      // Cadastra o Pedido Pendente Com Token 
      const order = await tx.order.create({
        data: {
          customerId,
          productId,
          quantity,
          status: 'PENDING',
          confirmationToken,
          tokenExpiresAt,
        }, 
        include: {
          customer: true,
          product: true,
        },
      });
      
      return order; 
    });
    
    // 7. Envia e-mail com o Token de Confirmação para o cliente 
    if (customer.email) {
      await this.mailService.sendOrderConfirmationEmail(
        customer.email,
        result.id,
        confirmationToken,
      );
    }

    return {
      message: 'Pedido realizado com sucesso! Verifique seu e-mail para confirmar.',
      order: result,
      confirmationToken, // Retornando aqui para facilitar nos testes do Http Client
    };
  } 
  

  // BUSCAR TODOS OS PEDIDOS
  async findAllOrders() {
    return this.prisma.order.findMany({
      include: {
        customer: true,
        product: true,
      },
      orderBy: {
        createdAt: 'desc', // Devolve a Data e a Hora exata que foi feita a consulta 
      },
    });
  }
}