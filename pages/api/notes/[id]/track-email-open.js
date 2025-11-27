// pages/api/notes/[id]/track-email-open.js
import dbConnect from '../../../../utils/mongoose';
import Note from '../../../../models/Note';
import { getUserFromReq } from '../../../../utils/auth';
import { isValidEmail, sanitizeEmail, isValidObjectId } from '../../../../utils/validation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  await dbConnect();
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  
  // Validate note ID
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const sanitizedEmail = sanitizeEmail(email);

  try {
    const note = await Note.findById(id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Verify the email is actually a collaborator on this note
    const isCollaborator = (note.collaborators || []).some(
      c => c && sanitizeEmail(c) === sanitizedEmail
    );

    if (!isCollaborator) {
      return res.status(403).json({ error: 'Email is not a collaborator on this note' });
    }

    // Add email to emailOpenedBy array if not already present (case-insensitive check)
    if (!note.emailOpenedBy) {
      note.emailOpenedBy = [];
    }

    const alreadyTracked = note.emailOpenedBy.some(
      e => e && sanitizeEmail(e) === sanitizedEmail
    );

    if (!alreadyTracked) {
      // Use the original email format from collaborators array for consistency
      const originalEmail = (note.collaborators || []).find(
        c => c && sanitizeEmail(c) === sanitizedEmail
      ) || sanitizedEmail;
      
      note.emailOpenedBy.push(originalEmail);
      await note.save();
    }

    res.json({ ok: true, emailOpenedBy: note.emailOpenedBy });
  } catch (error) {
    console.error('Error tracking email open:', error);
    res.status(500).json({ error: 'Failed to track email open' });
  }
}

