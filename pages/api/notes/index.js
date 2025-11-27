// pages/api/notes/index.js
import dbConnect from '../../../utils/mongoose';
import Note from '../../../models/Note';
import User from '../../../models/User';
import { getUserFromReq } from '../../../utils/auth';
import { sendNoteAddedNotification } from '../../../utils/emailService';
import { validateNote, isValidObjectId } from '../../../utils/validation';

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });

  if (req.method === 'GET') {
    // Get all notes where user is owner or collaborator
    const notes = await Note.find({
      $or: [
        { owner: user.id },
        { collaborators: user.email }
      ]
    })
      .populate('owner', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('collaboratorEdits.editedBy', 'name email')
      .sort({ pinned: -1, updatedAt: -1 }) // Pinned notes first, then by date
      .lean();

    // Remove duplicates using a Map (in case user is both owner AND in collaborators array)
    // Use note._id as the key to ensure uniqueness - this is critical to prevent duplicates
    const uniqueNotesMap = new Map();
    notes.forEach(note => {
      // Only process notes that have a valid _id
      if (note && note._id) {
        const noteId = note._id.toString();
        // Always use the first occurrence (or you could keep the most recent one)
        if (!uniqueNotesMap.has(noteId)) {
          uniqueNotesMap.set(noteId, note);
        } else {
          // Log if duplicate is detected (for debugging)
          console.warn(`Duplicate note detected in API: ${noteId} for user ${user.email}`);
        }
      }
    });

    // Convert Map back to array and format for frontend
    const formattedNotes = Array.from(uniqueNotesMap.values())
      .map(note => {
        const isOwner = note.owner && note.owner._id.toString() === user.id.toString();
        return {
          ...note,
          isOwner,
          ownerInfo: {
            name: note.owner?.name || 'Unknown',
            email: note.owner?.email || 'Unknown'
          },
          owner: note.owner?._id || note.owner, // Keep owner ID for compatibility
          // IMPORTANT: include lastEditorEmail so frontend can show collaborator email in list view
          // Prioritize lastEditorEmail (string), fallback to populated lastEditedBy.email
          lastEditorEmail: note.lastEditorEmail || (note.lastEditedBy && typeof note.lastEditedBy === 'object' ? note.lastEditedBy.email : null) || null,
          // Ensure originalContent and currentContent are included
          originalContent: note.originalContent || note.content || '',
          currentContent: note.currentContent || note.content || '',
          content: note.content || note.currentContent || note.originalContent || '', // Backward compatibility
          // Keep lastEditedBy for reference (could be object if populated or null)
          lastEditedBy: note.lastEditedBy || null,
          // CRITICAL: Include collaboratorEdits array so frontend can show the actual collaborator who edited
          // This array contains the email of each collaborator who edited the note
          collaboratorEdits: note.collaboratorEdits || [],
          // Include emailOpenedBy for tracking which collaborators opened email
          emailOpenedBy: note.emailOpenedBy || []
        };
      });

    res.json(formattedNotes);
  } else if (req.method === 'POST') {
    // Validate and sanitize note data
    const validation = validateNote(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    const sanitized = validation.sanitized;

    try {
      const note = await Note.create({
        owner: user.id,
        title: sanitized.title || '',
        content: sanitized.content || '',
        originalContent: sanitized.content || '', // Initialize originalContent with initial content
        currentContent: sanitized.content || '', // Initialize currentContent with initial content
        reminderAt: sanitized.reminderAt || null,
        collaborators: sanitized.collaborators || [],
        reminderSent: false, // Ensure reminderSent is false for new notes
        completed: false,
        lastEditedBy: user.id, // Set to creator's userId
        lastEditorEmail: user.email || null, // include creator's email so list shows owner email until edits happen
        color: req.body.color || 'default', // Default color
        pinned: req.body.pinned || false // Default not pinned
      });

      // Populate owner info for new note
      const populatedNote = await Note.findById(note._id)
        .populate('owner', 'name email')
        .lean();

      if (!populatedNote || !populatedNote.owner) {
        return res.status(500).json({ error: 'Failed to create note' });
      }

      // Send notification to collaborators (non-blocking)
      if (sanitized.collaborators && sanitized.collaborators.length > 0) {
        sendNoteAddedNotification({
          note: populatedNote,
          owner: populatedNote.owner,
          collaborators: sanitized.collaborators
        }).catch(err => console.error('Error sending note notification:', err));
      }

      const formattedNote = {
        ...populatedNote,
        isOwner: true,
        ownerInfo: {
          name: populatedNote.owner.name || 'Unknown',
          email: populatedNote.owner.email || 'Unknown'
        },
        owner: populatedNote.owner._id,
        lastEditorEmail: populatedNote.lastEditorEmail || user.email || null
      };

      res.json(formattedNote);
    } catch (error) {
      // Handle validation errors from mongoose
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          error: 'Validation failed',
          errors
        });
      }
      console.error('Note creation error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
