import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import { getUserFromReq } from '../../../utils/auth';

export default async function handler(req, res){
  await dbConnect();
  const user = await getUserFromReq(req);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'not admin' });

  if (req.method === 'GET') {
    const users = await User.find().lean();
    res.json(users);
  } else {
    res.status(405).end();
  }
}
