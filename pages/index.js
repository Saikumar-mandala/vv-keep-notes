// pages/index.js
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import NoteCard from "../components/NoteCard";
import NoteForm from "../components/NoteForm";

export default function NotesPage() {
  const { token, user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({
    title: "",
    content: "",
    reminderAt: "",
    collaborators: "",
    color: "default",
  });
  const { addToast } = useToast();
  const [editing, setEditing] = useState(null);
  const [fetchToggle, setFetchToggle] = useState(0);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Give a moment for token to load from localStorage
    const timer = setTimeout(() => {
      setCheckingAuth(false);
      if (!token) {
        window.location.href = "/login";
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [token]);

  // load notes - must be called before any conditional return
  useEffect(() => {
    if (!token || checkingAuth) return;
    setLoading(true);
    fetch("/api/notes", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        // Additional deduplication on frontend as a safeguard
        const uniqueNotesMap = new Map();
        data.forEach(note => {
          if (note && note._id) {
            const noteId = note._id.toString();
            if (!uniqueNotesMap.has(noteId)) {
              uniqueNotesMap.set(noteId, note);
            } else {
              console.warn('Duplicate note in API response (frontend dedup):', noteId, note.title || 'no title');
            }
          }
        });
        const uniqueNotes = Array.from(uniqueNotesMap.values());
        console.log('Total notes after deduplication:', uniqueNotes.length, 'from', data.length, 'original');
        
        // Sort notes: owned notes first, then shared notes (both sorted by updatedAt)
        const sortedNotes = uniqueNotes.sort((a, b) => {
          // First, prioritize pinned notes
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;

          // Then, prioritize owned notes
          if (a.isOwner && !b.isOwner) return -1;
          if (!a.isOwner && b.isOwner) return 1;
          // If both have same ownership status, sort by updatedAt (newest first)
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        setNotes(sortedNotes);
      })
      .catch((err) => console.error("Fetch notes error", err))
      .finally(() => setLoading(false));
  }, [token, fetchToggle, checkingAuth]);

  // Check for due reminders when page loads and periodically
  useEffect(() => {
    if (!token || checkingAuth) return;

    // Check immediately
    fetch("/api/reminders/check", { method: "POST" }).catch(() => { });

    // Then check every 2 minutes
    const interval = setInterval(() => {
      fetch("/api/reminders/check", { method: "POST" }).catch(() => { });
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [token, checkingAuth]);

  // Don't render content until auth check is complete
  if (checkingAuth || !token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return;

    const payload = {
      title: form.title,
      content: form.content,
      reminderAt: form.reminderAt
        ? new Date(form.reminderAt).toISOString()
        : null,
      collaborators: form.collaborators
        ? form.collaborators
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        : [],
      color: form.color || 'default',
    };


    try {
      let res;
      if (editing) {
        const idToUpdate = editing.realId || editing._id;
        res = await fetch(`/api/notes/${idToUpdate}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error saving note");
      }

      addToast("Note saved successfully", "success");
      setForm({
        title: "",
        content: "",
        reminderAt: "",
        collaborators: "",
        color: "default",
      });
      setEditing(null);
      // toggle reload notes
      setFetchToggle((t) => t + 1);
    } catch (err) {
      console.error(err);
      addToast("Error: " + (err.message || err.toString()), "error");
    }
  }

  function startEdit(note) {
    // Don't allow editing completed notes
    if (note.completed) {
      alert("Cannot edit completed notes. Please mark as incomplete first.");
      return;
    }
    setEditing(note);
    setForm({
      title: note.title || "",
      content: note.content || "",
      reminderAt: note.reminderAt
        ? new Date(note.reminderAt).toISOString().slice(0, 16)
        : "",
      collaborators: (note.collaborators || []).join(", "),
      color: note.color || "default",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(note) {
    if (!confirm("Delete this note?")) return;
    try {
      const idToDelete = note.realId || note._id;
      const res = await fetch(`/api/notes/${idToDelete}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error(await res.text());
      setFetchToggle((t) => t + 1);
      addToast("Note deleted", "success");
    } catch (err) {
      console.error("delete error", err);
      addToast("Delete failed", "error");
    }
  }

  function cancelEdit() {
    setEditing(null);
    setForm({
      title: "",
      content: "",
      reminderAt: "",
      collaborators: "",
      color: "default",
    });
  }

  // Separate active and completed notes
  // Additional deduplication to prevent duplicates (safety check)
  const uniqueActiveNotesMap = new Map();
  const uniqueCompletedNotesMap = new Map();
  
  notes.forEach(note => {
    if (!note || !note._id) return;
    const noteId = note._id.toString();
    if (note.completed) {
      if (!uniqueCompletedNotesMap.has(noteId)) {
        uniqueCompletedNotesMap.set(noteId, note);
      } else {
        console.warn('Duplicate completed note detected in initial processing:', noteId);
      }
    } else {
      if (!uniqueActiveNotesMap.has(noteId)) {
        uniqueActiveNotesMap.set(noteId, note);
      } else {
        console.warn('Duplicate active note detected in initial processing:', noteId, note.title || 'no title');
      }
    }
  });
  
  const activeNotes = Array.from(uniqueActiveNotesMap.values());
  const completedNotes = Array.from(uniqueCompletedNotesMap.values());

  // Process active notes for display
  const displayNotes = [];
  const processedNoteIds = new Set(); // Track processed notes to prevent duplicates
  
  console.log('Processing', activeNotes.length, 'active notes for display');
  
  activeNotes.forEach((note, index) => {
    // Skip if this note was already processed
    if (!note || !note._id) {
      console.warn('Skipping invalid note at index', index);
      return;
    }
    const noteId = note._id.toString();
    if (processedNoteIds.has(noteId)) {
      console.warn('Duplicate note detected and skipped (already processed):', noteId, note.title || 'no title');
      return;
    }
    processedNoteIds.add(noteId);
    console.log('Processing note:', noteId, note.title || 'no title', 'isOwner:', note.isOwner, 'hasCollaboratorEdits:', note.collaboratorEdits?.length || 0);
    // If owner, check for granular collaborator edits
    if (note.isOwner) {
      // Check for granular collaborator edits (multiple edits)
      const hasCollaboratorEdits = note.collaboratorEdits && Array.isArray(note.collaboratorEdits) && note.collaboratorEdits.length > 0;
      const hasContentChanges = note.originalContent && note.currentContent && note.originalContent !== note.currentContent;
      
      // Always show a single card with both original and updated content
      // This prevents duplicate cards - the NoteCard component displays both sections in one card
      // This is simpler and prevents the duplicate issue
      displayNotes.push({
        ...note,
        _id: note._id, // Use real note ID - ensures only one card per note
        realId: note._id,
        // Keep both originalContent and currentContent so the card can display both
        content: note.currentContent || note.content, // Default to current for display
        originalContent: note.originalContent || note.content,
        currentContent: note.currentContent || note.content,
        // Set flags appropriately
        isOriginalVersion: !hasContentChanges, // True if no changes
        isCollaboratorVersion: false,
        isVirtual: false // Always a real card, not virtual
      });
    } else {
      // Standard display for non-owners (they just see the latest state or their own view - currently simplified to latest)
      displayNotes.push(note);
    }
  });

  // Final deduplication of display notes by their _id (including virtual IDs)
  // Also check for duplicate real notes (same realId) to prevent showing the same note twice
  const finalDisplayNotesMap = new Map();
  const realNoteIdsSeen = new Set(); // Track real note IDs to prevent duplicates
  
  displayNotes.forEach(note => {
    if (!note || !note._id) return;
    const displayId = note._id.toString();
    const realId = (note.realId || note._id).toString();
    
    // For non-virtual cards (regular cards), check if we've already seen this real note
    // Virtual cards are allowed to have the same realId (they're different views of the same note)
    if (!note.isVirtual && realNoteIdsSeen.has(realId)) {
      console.warn('Duplicate real note detected and removed (non-virtual):', realId, note.title || 'no title');
      return; // Skip this duplicate
    }
    
    // Only keep the first occurrence of each display note (by displayId)
    if (!finalDisplayNotesMap.has(displayId)) {
      finalDisplayNotesMap.set(displayId, note);
      // Track real note IDs for non-virtual cards
      if (!note.isVirtual) {
        realNoteIdsSeen.add(realId);
      }
    } else {
      console.warn('Duplicate display note detected and removed (same displayId):', displayId, note.title || 'no title');
    }
  });
  const uniqueDisplayNotes = Array.from(finalDisplayNotesMap.values());

  // Sort display notes: Owned first, then shared
  const sortedDisplayNotes = uniqueDisplayNotes.sort((a, b) => {
    // If both are the same real note (split versions), put Original first
    if (a.realId && b.realId && a.realId === b.realId) {
      return a.isOriginalVersion ? -1 : 1;
    }
    // If one is a split part and the other is the same real note (shouldn't happen with current logic but good safety)
    if (a.realId === b._id) return 1; // a is virtual original, b is real (collaborator). Wait, realId is set on virtual.

    // Standard sort
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  async function handleToggleComplete(note, status) {
    // If it's a virtual note (original version), use the real note ID
    const id = note.realId || note._id;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          completed: status
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFetchToggle(t => t + 1);
    } catch (err) {
      console.error("Error toggling complete", err);
      addToast("Error updating status", "error");
    }
  }

  async function handleTogglePin(note) {
    const id = note.realId || note._id;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFetchToggle((t) => t + 1);
    } catch (err) {
      console.error("toggle pin error", err);
      addToast("Failed to update note", "error");
    }
  }

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6 sm:mb-8 lg:mb-10 pb-6 sm:pb-8 border-b-2 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 sm:mb-3">
              My Notes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">
              Organize your thoughts and ideas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {user?.email && (
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm truncate max-w-[200px] sm:max-w-none">
                {user.email}
              </span>
            )}
            <button
              onClick={logout}
              className="btn-secondary flex items-center shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="red"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>

          </div>
        </div>
      </div>

      {/* Responsive Layout: Stacked on mobile, Side-by-Side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Note Form - Full width on mobile, 50% on desktop */}
        <div className="w-full lg:w-1/2">
          <NoteForm
            form={form}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            editing={editing}
            cancelEdit={cancelEdit}
            user={user}
          />
        </div>

        {/* Notes Grid - Full width on mobile, 50% on desktop */}
        <div className="w-full lg:w-1/2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 dark:text-gray-400">Loading notes...</p>
              </div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No notes yet</h3>
              <p className="text-gray-600 dark:text-gray-400">Create your first note to get started!</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Active Notes */}
              {sortedDisplayNotes.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-5 flex items-center space-x-2">
                    <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                    <span>Active Notes</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {sortedDisplayNotes.map((n) => (
                      <NoteCard
                        key={n._id}
                        note={n}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        onToggleComplete={() => handleToggleComplete(n, true)}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Notes */}
              {completedNotes.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-5 flex items-center space-x-2">
                    <div className="w-8 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
                    <span>Completed</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 opacity-75">
                    {completedNotes.map((n) => (
                      <NoteCard
                        key={n._id}
                        note={n}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        onToggleComplete={() => handleToggleComplete(n, false)}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
