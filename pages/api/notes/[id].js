// pages/api/notes/[id].js
import dbConnect from '../../../utils/mongoose';
import Note from '../../../models/Note';
import User from '../../../models/User';
import { getUserFromReq } from '../../../utils/auth';
import { sendNoteAddedNotification } from '../../../utils/emailService';
import { validateNote, isValidObjectId, sanitizeEmail } from '../../../utils/validation';

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });

  const { id } = req.query;

  // Validate note ID
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const note = await Note.findById(id)
    .populate('owner', 'name email')
    .populate('lastEditedBy', 'name email')
    .populate('collaboratorEdits.editedBy', 'name email');
  if (!note) return res.status(404).json({ error: 'not found' });

  // Check if owner exists (in case user was deleted)
  if (!note.owner) {
    return res.status(404).json({ error: 'Note owner not found' });
  }

  const isOwner = note.owner._id.toString() === user.id.toString();
  // Check if user is a collaborator (case-insensitive email comparison)
  const isCollaborator = (note.collaborators || []).some(
    email => email && email.toLowerCase() === (user.email || '').toLowerCase()
  );
  const canEdit = isOwner || isCollaborator || user.isAdmin;
  if (!canEdit) return res.status(403).json({ error: 'forbidden' });

  if (req.method === 'PUT') {
    // Prevent editing if note is completed, unless we are un-completing it
    // We allow the request if 'completed' is present in the body (toggling status)
    if (note.completed && req.body.completed === undefined) {
      return res.status(403).json({ error: 'Cannot edit completed notes' });
    }

    // Validate and sanitize note data (only validate provided fields)
    const dataToValidate = {};
    if (req.body.title !== undefined) dataToValidate.title = req.body.title;
    if (req.body.content !== undefined) dataToValidate.content = req.body.content;
    if (req.body.collaborators !== undefined) dataToValidate.collaborators = req.body.collaborators;
    if (req.body.reminderAt !== undefined) dataToValidate.reminderAt = req.body.reminderAt;

    if (Object.keys(dataToValidate).length > 0) {
      const validation = validateNote(dataToValidate);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }
    }

    const { reminderAt, collaborators, title, content, completed, lastEditorEmail, ...rest } = req.body;
    // Explicitly exclude lastEditorEmail from rest to prevent tampering - we always use authenticated user's email

    // Track old collaborators to detect new ones
    const oldCollaborators = (note.collaborators || []).map(c => String(c));
    const newCollaborators = (collaborators || []).map(c => String(c));

    // Find newly added collaborators
    const addedCollaborators = newCollaborators.filter(c => !oldCollaborators.includes(c));

    // Properly handle reminderAt date conversion
    if (reminderAt !== undefined) {
      note.reminderAt = reminderAt ? new Date(reminderAt) : null;
      // Reset reminderSent when reminder time changes
      note.reminderSent = false;
    }

    // Handle completed status
    if (completed !== undefined) {
      note.completed = completed;
    }

    // Handle content updates with robust collaborator tracking
    if (content !== undefined || title !== undefined) {
      const ownerIsEditor = note.owner._id.toString() === user.id.toString();

      if (content !== undefined) {
        // originalContent must NEVER change after creation
        note.currentContent = content || '';
        note.content = content || ''; // Keep for backward compatibility
        note.updatedAt = new Date();

        // IMPORTANT: lastEditedBy and lastEditorEmail store ONLY owner's data
        // - If owner edits: update lastEditedBy and lastEditorEmail to owner's info
        // - If collaborator edits: DO NOT update lastEditedBy/lastEditorEmail, track in collaboratorEdits only
        if (ownerIsEditor) {
          // Owner edited - update lastEditedBy and lastEditorEmail to owner's info
          note.lastEditedBy = note.owner._id;
          note.lastEditorEmail = note.owner.email || null;
        } else {
          // Collaborator edited - track in collaboratorEdits array, do NOT change lastEditedBy/lastEditorEmail
          if (!note.collaboratorEdits) note.collaboratorEdits = [];
          note.collaboratorEdits.push({
            editedBy: user.id,
            editedAt: new Date(),
            content: content || '',
            email: user.email || null
          });
          // Keep lastEditedBy and lastEditorEmail as owner's info (don't change)
        }
      }

      if (title !== undefined) {
        note.title = title;
      }

      // Update lastEditedBy for title changes too (if no content change)
      // Only update if owner edited - collaborators don't change lastEditedBy/lastEditorEmail
      if (title !== undefined && content === undefined) {
        if (ownerIsEditor) {
          // Owner edited title - update lastEditedBy and lastEditorEmail to owner's info
          note.lastEditedBy = note.owner._id;
          note.lastEditorEmail = note.owner.email || null;
        }
        // If collaborator edited title, don't change lastEditedBy/lastEditorEmail
        note.updatedAt = new Date();
      }
    }

    // Handle other fields
    if (collaborators !== undefined) {
      // Use sanitized collaborators if validation was done
      const validation = validateNote({ collaborators });
      if (validation.valid && validation.sanitized) {
        note.collaborators = validation.sanitized.collaborators || [];
      } else if (validation.valid) {
        note.collaborators = Array.isArray(collaborators)
          ? collaborators.map(email => sanitizeEmail(email))
          : [];
      } else {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }
    }

    // Handle color
    if (req.body.color !== undefined) {
      const allowedColors = ['default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray'];
      if (allowedColors.includes(req.body.color)) {
        note.color = req.body.color;
      }
    }

    // Handle pinned status
    if (req.body.pinned !== undefined) {
      note.pinned = Boolean(req.body.pinned);
    }

    // lastEditorEmail is already excluded from rest in the destructuring above
    // We always use authenticated user's email, never from request body
    // Also explicitly remove ringtone if it somehow got into rest (though it shouldn't if not in destructuring, but safety first)

    Object.assign(note, rest);
    await note.save();

    // Populate and format response
    const updatedNote = await Note.findById(note._id)
      .populate('owner', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('collaboratorEdits.editedBy', 'name email')
      .lean();

    if (!updatedNote || !updatedNote.owner) {
      return res.status(500).json({ error: 'Failed to update note' });
    }

    // Send notification to newly added collaborators (non-blocking)
    if (addedCollaborators && addedCollaborators.length > 0) {
      sendNoteAddedNotification({
        note: updatedNote,
        owner: updatedNote.owner,
        collaborators: addedCollaborators
      }).catch(err => console.error('Error sending note notification:', err));
    }

    const formattedNote = {
      ...updatedNote,
      isOwner,
      ownerInfo: {
        name: updatedNote.owner.name || 'Unknown',
        email: updatedNote.owner.email || 'Unknown'
      },
      owner: updatedNote.owner._id,
      lastEditedBy: updatedNote.lastEditedBy || null,
      lastEditorEmail: updatedNote.lastEditorEmail || null,
      // ensure content fields are present
      originalContent: updatedNote.originalContent || updatedNote.content || '',
      currentContent: updatedNote.currentContent || updatedNote.content || '',
      // Include emailOpenedBy for tracking which collaborators opened email
      emailOpenedBy: updatedNote.emailOpenedBy || []
    };

    res.json(formattedNote);
  } else if (req.method === 'DELETE') {
    // Only owner can delete notes (or admin)
    if (!isOwner && !user.isAdmin) {
      return res.status(403).json({ error: 'Only the note owner can delete this note' });
    }
    await note.remove();
    res.json({ ok: true });
  } else {
    // GET request - return note with owner info
    const formattedNote = {
      ...note.toObject(),
      isOwner,
      ownerInfo: {
        name: note.owner?.name || 'Unknown',
        email: note.owner?.email || 'Unknown'
      },
      owner: note.owner?._id || note.owner,
      lastEditedBy: note.lastEditedBy || null,
      lastEditorEmail: note.lastEditorEmail || null,
      // Ensure originalContent and currentContent are included
      originalContent: note.originalContent || note.content || '',
      currentContent: note.currentContent || note.content || '',
      content: note.content || note.currentContent || note.originalContent || '', // Backward compatibility
      // Include emailOpenedBy for tracking which collaborators opened email
      emailOpenedBy: note.emailOpenedBy || []
    };
    res.json(formattedNote);
  }
}
