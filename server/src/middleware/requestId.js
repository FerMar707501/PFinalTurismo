import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  const validIncoming =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 100;

  req.id = validIncoming ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
