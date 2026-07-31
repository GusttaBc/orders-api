import { Controller, Post, Get, Body, Patch } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderDto } from './create-order.dto';
import { Param } from '@nestjs/common';



@Controller('orders')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async createOrder(@Body() data: CreateOrderDto) { // faz a chamada da funçao criada no service
    return this.appService.createOrder(data);
  }

  // 1. ROTA PARA LISTA TODOS OS PEDIDOS (GET /ORDERS)
  @Get()
  findAll(){
    return this.appService.findAllOrders();
  }

  @Get('/metrics') // 2. ROTA PARA OBTER AS METRICAS ( GET/ORDERS/METRICS )
  getMetrics(){
  return this.appService.getMetrics();
}

  @Get (':id') // 3. BUSCAR O PEDIDO PELO "ID"
  findOrderById(@Param('id') id:string){
  return this.appService.findOrderById(id);
}
  

  @Patch(':id/cancel') // 4. ROTA PARA CANCELAR UM PEDIDO ( PATCH / ORDERS / :ID / CANCEL )
  cancelOrder(@Param('id') id: string){
    return this.appService.cancelOrder(id);
  }

  @Patch(':id/status') // ROTA PARA ATUALIZAR APENAS O STATUS 
  updateOrderStatus(
    @Param('id') id:string,
    @Body('status') status:string){
    return this.appService.updateOrderStatus(id, status);
  }
}