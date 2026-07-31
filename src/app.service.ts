//REGRA DE NEGOCIO COMEÇA AKI !!

import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "./prisma.service"; 
import { CreateOrderDto } from "./create-order.dto";


@Injectable()
export class AppService { 
  constructor(private readonly prisma: PrismaService) {}

    async updateOrderStatus (id: string, status:string){ 
    const order = await this.prisma.order.findUnique({ // verificaçao sem o pedido e existente 
      where:{id}
    });

    if (!order){ 
      throw new NotFoundException('Pedido Não Encontrado !!');
    }

    if (order.status === 'CANCELED'){
      throw new BadRequestException ('Não e possivel alterar o status de um pedido cancelado');
    }

    return await this.prisma.order.update({ 
      where:{id},
      data:{status},
      });
  }


  async findOrderById (id: string){ // PROCURAR O USUARIO PELO "ID"
    const order = await this.prisma.order.findUnique({
      where:{id},
      include:{
       customer:true,
       product:true, 
      }
      });

      if(!order){
        throw new NotFoundException('Pedido não encontrado')
      }
      return order;
      }

  //OBTER METRICAS DO SISTEMA 
 async getMetrics (){
// 1. CONTA QUANTOS CLIENTES EXITE NA TABELA CUSTOMER
  const totalCustomers = await this.prisma.customer.count();
// 2. CONTA QUANTOS PRODUTOS EXISTE NA TABELA 
  const totalProducts = await this.prisma.product.count();
// 3.CONTA APENAS OS PEDIDOS COM STATUS DE COMPLETO
  const totalCompletedOrders = await this.prisma.order.count({

  where:{ status:'COMPLETED'},
 });
 // QUANTIDADE DE CANCELAMENTO 
 const totalCancelledOrders = await this.prisma.order.count({
  where:{status:'CANCELLED'},
 });
 
 return{ // RETORNA UM OBJETO LIMPO COM TODAS AS METRICAS 
  totalCustomers,
  totalProducts,
  totalCompletedOrders,
  totalCancelledOrders,
 };
 }
 
 
  async cancelOrder (id:string){ // CANCELAMENTO DO PRODUTO PELO ID
    const order = await this.prisma.order.findUnique({
      where: {id},
    });

    if(!order) { // SE O PEDIDO NAO FOR ENCONTRADO ERRO 
      throw new NotFoundException('Pedido nao Encontrado');
    }
    if (order.status === 'CANCELLED'){ // SE O STATUS FOR IGUAL CANCELADO 
      throw new BadRequestException ('Este Pedido Esta Cancelado');
    }

    return await this.prisma.$transaction([ // $transaction EXECULTA MULTIPLOS COMANDO DE FORMA ALTOMATICA ("SE UM FALHAR TODOS SOFRE ROLLBACK")
      this.prisma.order.update({
        where: {id },
        data: { status:'CANCELLED'},
      }),
      this.prisma.product.update({ // LOGICA PARA O PEDIDO VOLTAR AO ESTOQUE 
        where:{id: order.productId}, 
        data: {
          stockQuantity:{
            increment: order.quantity, // ALMENTA A QUANTIDADE NO BANCO
          },
        },
      }),

    ]);

  }
  // Todo o nosso código e validações ficam protegidos dentro deste método:
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

    // 5. Transação no Banco de Dados (Tudo ou nada!)
    return this.prisma.$transaction(async (tx) => {  // evita erro e retorna o banco ao estado original outudo roda com sucesso ou nada acontece 
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: product.stockQuantity - quantity,
        },
      });

      // C) Cadastrar o pedido
      const order = await tx.order.create({
        data: {
          customerId,
          productId, 
          quantity,
        },

        include: {
          customer: true,
          product: true,
        },
      });

      return {
        message: 'Pedido realizado com sucesso!',
        order,
      };
    });
  } 

// BUSCAR TODOS OS PEDIDOS
 async findAllOrders (){
  return this.prisma.order.findMany({
    include:{
      customer:true,
      product:true,
    },
    orderBy:{
      createdAt:'desc',
    },
  });
 }
}
  