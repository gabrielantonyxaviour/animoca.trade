import { Router } from 'express';

export const analyticsRouter = Router();

// Placeholder routes - will be implemented in analytics API task
analyticsRouter.get('/', (req, res) => {
  res.json({ message: 'Analytics routes - coming soon' });
});