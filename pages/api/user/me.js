import { getUserFromReq } from '../../../utils/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const user = await getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'unauth' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin
  });
}

