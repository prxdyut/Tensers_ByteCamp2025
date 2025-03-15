import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.send('WhatsApp Bot is running!');
});

export default router; 