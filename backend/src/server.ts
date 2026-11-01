import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Servidor backend rodando com sucesso na porta ${env.PORT}!`);
  console.log(`📡 Health check disponível em: http://localhost:${env.PORT}/health e http://localhost:${env.PORT}/api/health`);
  console.log(`🌱 Ambiente: ${env.NODE_ENV}`);
});

export default server;
