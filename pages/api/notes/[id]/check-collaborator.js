// pages/api/notes/[id]/check-collaborator.js
import dbConnect from '../../../../utils/mongoose';
import Note from '../../../../models/Note';
import { isValidEmail, sanitizeEmail, isValidObjectId } from '../../../../utils/validation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  const { id } = req.query;
  const { email } = req.body;

  // Validate note ID
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const sanitizedEmail = sanitizeEmail(email);

  try {
    const note = await Note.findById(id).lean();
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check if email is in collaborators array (case-insensitive)
    const isCollaborator = (note.collaborators || []).some(
      c => c && sanitizeEmail(c) === sanitizedEmail
    );

    res.json({ 
      isCollaborator,
      noteId: note._id.toString(),
      email: sanitizedEmail
    });
  } catch (error) {
    console.error('Error checking collaborator:', error);
    res.status(500).json({ error: 'Failed to check collaborator status' });
  }
}

