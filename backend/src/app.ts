import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';
import healthRoutes from './routes/health.routes';

const app: Application = express();

// Middlewares essenciais
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota direta de health check (útil para cloud health checks / load balancers)
app.use('/health', healthRoutes);

// Rota prefixada com /api
app.use('/api', routes);

// Middleware de rota não encontrada (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Rota não encontrada.',
  });
});

// Middleware de tratamento global de erros
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor.',
  });
});

export default app;
