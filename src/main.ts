import { NestFactory } from "@nestjs/core"; 
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common"; // 1-IMPORTA UM VALIDADOR GLOBAL

async function bootstrap (){
  const app = await NestFactory.create(AppModule);

// 2 - HABILITA A VALIDAÂO GLOBAL 
app.useGlobalPipes(
  new ValidationPipe({
    whitelist:true, // REMOVE CAMPOS EXTRAS QUE NAO ESTIVEREM NO DTO
    forbidNonWhitelisted:true, // BLOQUEIA A REQUISIÇAO QUE ENVIAR CAMPOS NAO PERMITIDOS
    transform:true // CONVERTE TIPOS AUTOMATICAMENTE ( STRINGS, "5" VIRA NUMBER )
  }),
);
// Habilita o CORS para permitir chamadas HTML/Navegador
app.enableCors();

await app.listen(3000);

}

bootstrap();