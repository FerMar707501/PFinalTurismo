import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  conversationDetailQuery,
  conversationIdParams,
  listConversationsQuery,
  sendMessageBody,
} from './chat.schemas.js';
import {
  getConversation,
  listConversations,
  sendChatMessage,
} from './chat.service.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate({ body: sendMessageBody }),
  async (req, res) => {
    const result = await sendChatMessage(req.user, req.body);
    res.set('Cache-Control', 'no-store');
    res.status(201).json(result);
  },
);

router.get(
  '/conversations',
  validate({ query: listConversationsQuery }),
  async (req, res) => {
    const result = await listConversations(req.user.id, req.validatedQuery);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  },
);

router.get(
  '/conversations/:id',
  validate({
    params: conversationIdParams,
    query: conversationDetailQuery,
  }),
  async (req, res) => {
    const result = await getConversation(
      req.user.id,
      req.params.id,
      req.validatedQuery,
    );
    res.set('Cache-Control', 'no-store');
    res.json(result);
  },
);

export default router;
