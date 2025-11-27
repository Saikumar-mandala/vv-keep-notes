// pages/notes/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";

// Helper functions for parsing content
const LOG_SEPARATOR = '\n\n--- Change Log ---\n';
const TAG_REGEX = /\[edited-by:\s*([^,]+),\s*time:\s*([^\]]+)\]/g;

function parseContent(fullContent) {
  if (!fullContent) {
    return { mainText: '', changeLog: '', cleanText: '' };
  }

  const parts = fullContent.split(LOG_SEPARATOR);
  const mainText = parts[0] || '';
  const changeLog = parts[1] || '';

  // Remove tags to get clean text for editing
  const cleanText = mainText.replace(TAG_REGEX, '').trim();

  return { mainText, changeLog, cleanText };
}

// Helper function to format date for datetime-local input
function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  
  try {
    const date = new Date(dateValue);
    // Check if date is valid
    if (isNaN(date.getTime())) return "";
    
    // Get local date/time string in format: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (err) {
    console.error("Error formatting date:", err);
    return "";
  }
}

export default function NotePage() {
  const router = useRouter();
  const { id, from, email: emailParam } = router.query;
  const { token, user, logout } = useAuth();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    reminderAt: "",
    collaborators: "",
  });
  const [message, setMessage] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [redirecting, setRedirecting] = useState(false); // Prevent multiple redirects

  // Check if email from URL is a valid collaborator (when coming from email link)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (from !== 'email' || !emailParam || typeof emailParam !== 'string' || !id) {
      setCheckingEmail(false);
      return;
    }

    setCheckingEmail(true);
    const decodedEmail = decodeURIComponent(emailParam);

    // First, check if email is actually a collaborator on this note
    fetch(`/api/notes/${id}/check-collaborator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: decodedEmail }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to check collaborator status');
        }
        return res.json();
      })
      .then(async (collabData) => {
        if (!collabData.isCollaborator) {
          // Email is not a collaborator - show error and deny access
          setError("You don't have access to this note. This link is not valid for your email address.");
          setCheckingEmail(false);
          setLoading(false);
          return;
        }

        // Email is a collaborator - now check if email exists in database
        const emailCheckRes = await fetch('/api/users/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: decodedEmail }),
        });

        if (!emailCheckRes.ok) {
          throw new Error('Failed to check email');
        }

        const emailData = await emailCheckRes.json();
        if (!emailData.exists) {
          // Email is a collaborator but doesn't exist - redirect to register page
          setRedirecting(true); // Set flag to prevent multiple redirects
          const redirectUrl = `/register?email=${encodeURIComponent(decodedEmail)}&note=${encodeURIComponent(id)}&from=email`;
          // Use router.push instead of window.location.href to avoid full page reload
          router.push(redirectUrl);
          return;
        }
        // Email is a collaborator and exists - proceed with normal auth check
        setCheckingEmail(false);
      })
      .catch((err) => {
        console.error('Error checking collaborator:', err);
        setError("Failed to verify access. Please contact the note owner.");
        setCheckingEmail(false);
        setLoading(false);
        setCheckingAuth(false); // Stop auth checking to prevent redirect loop
      });
  }, [from, emailParam, id, router]);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkingEmail) return; // Wait for email check to complete
    if (error) return; // Don't redirect if there's an error (e.g., not a collaborator)
    if (redirecting) return; // Prevent multiple redirects

    const timer = setTimeout(() => {
      setCheckingAuth(false);
      if (!token && !redirecting) {
        setRedirecting(true); // Set flag to prevent multiple redirects
        // If coming from email link and email exists, redirect to login with note info
        if (from === 'email' && emailParam) {
          const decodedEmail = decodeURIComponent(emailParam);
          const noteId = id || '';
          // Use router.push instead of window.location.href to avoid full page reload
          router.push(`/login?email=${encodeURIComponent(decodedEmail)}&note=${encodeURIComponent(noteId)}&from=email`);
        } else {
          router.push("/login");
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [token, checkingEmail, from, emailParam, id, error, redirecting, router]);

  // Track email opens and load note when ID is available
  useEffect(() => {
    if (!id || !token || checkingAuth) return;

    setLoading(true);
    setError(null);

    // If user accessed via email link, track the email opener
    if (from === 'email' && emailParam && typeof emailParam === 'string') {
      fetch(`/api/notes/${id}/track-email-open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ email: decodeURIComponent(emailParam) }),
      }).catch(err => console.error('Failed to track email open:', err));
    }

    fetch(`/api/notes/${id}`, {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          if (res.status === 404) {
            setError("Note not found");
          } else if (res.status === 403) {
            setError("You don't have permission to view this note");
          } else {
            setError(errorText || "Failed to load note");
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setNote(data);
          // Use currentContent for editing (or fallback to content for backward compatibility)
          const contentToEdit = data.currentContent || data.content || "";
          // Parse content to get clean text for editing (without tags and log)
          const { cleanText } = parseContent(contentToEdit);
          
          setForm({
            title: data.title || "",
            content: cleanText, // Use clean text for editing
            reminderAt: formatDateForInput(data.reminderAt),
            collaborators: (data.collaborators || []).join(", "),
          });
        }
      })
      .catch((err) => {
        console.error("Fetch note error", err);
        setError("Failed to load note");
      })
      .finally(() => setLoading(false));
  }, [id, token, checkingAuth, from, emailParam]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token || !note) return;

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
    };

    try {
      const res = await fetch(`/api/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error updating note");
      }

      const updatedNote = await res.json();
      setNote(updatedNote);
      setEditing(false);
      setMessage("Note updated successfully");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.message || err.toString()));
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/notes/${note._id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });

      if (!res.ok) throw new Error(await res.text());

      // Redirect to notes list after deletion
      router.push("/");
    } catch (err) {
      console.error("delete error", err);
      alert("Delete failed");
    }
  }

  function cancelEdit() {
    setEditing(false);
    if (note) {
      // Use currentContent for editing (or fallback to content for backward compatibility)
      const contentToEdit = note.currentContent || note.content || "";
      // Parse content to get clean text for editing
      const { cleanText } = parseContent(contentToEdit);
      
      setForm({
        title: note.title || "",
        content: cleanText, // Use clean text for editing
        reminderAt: formatDateForInput(note.reminderAt),
        collaborators: (note.collaborators || []).join(", "),
      });
    }
  }

  // Don't render content until email check is complete
  // But allow redirect to happen even if no token
  if (checkingEmail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-600">Verifying access...</div>
        </div>
      </div>
    );
  }

  // If checking auth and no token, show brief loading before redirect
  if (checkingAuth && !token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If not logged in and not checking auth, return null (redirect will happen)
  if (!token && !checkingAuth) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-600">Loading note...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link href="/" className="btn-primary inline-block">
          Back to Notes
        </Link>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  const isOwner = note.isOwner;

  // Check if current user is a collaborator
  // The note API should return isOwner flag, but we also need to check collaborator status
  const userEmail = user?.email?.toLowerCase();
  const noteCollaborators = (note.collaborators || []).map(c => c?.toLowerCase());
  const isCollaborator = userEmail && noteCollaborators.includes(userEmail);
  const canEdit = isOwner || isCollaborator;
  const canDelete = isOwner; // Only owners can delete

  async function handleToggleComplete() {
    if (!token || !note) return;
    try {
      const res = await fetch(`/api/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ completed: !note.completed }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error updating note");
      }

      const updatedNote = await res.json();
      setNote(updatedNote);
      setMessage(note.completed ? "Note marked as incomplete" : "Note marked as complete");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setMessage("Error: " + (err.message || err.toString()));
      setTimeout(() => setMessage(""), 3000);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Notes</span>
        </Link>

        {!editing && canEdit && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleComplete}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                note.completed
                  ? "text-orange-600 hover:bg-orange-50 border border-orange-200"
                  : "text-green-600 hover:bg-green-50 border border-green-200"
              }`}
            >
              {note.completed ? "Mark Incomplete" : "Mark Complete"}
            </button>
            {!note.completed && canDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            )}
            {!note.completed && (
              <button
                onClick={() => setEditing(true)}
                className="btn-primary"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Completed Status Badge */}
      {note.completed && (
        <div className="mb-4 flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg border border-green-300 dark:border-green-700">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-medium">This note is completed and read-only</span>
        </div>
      )}

      {/* Note Content */}
      {editing ? (
        <form onSubmit={handleSubmit} className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Note</h2>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Note title..."
                className="input-field text-lg font-medium"
              />
            </div>

            <div>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="Take a note..."
                rows={10}
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Reminder</span>
                  </span>
                </label>
                <input
                  name="reminderAt"
                  type="datetime-local"
                  value={form.reminderAt}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Collaborators</span>
                </span>
              </label>
              <input
                name="collaborators"
                value={form.collaborators}
                onChange={handleChange}
                placeholder="Comma-separated emails"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
            </div>


            <div className="flex items-center justify-between pt-2">
              <button type="submit" className="btn-primary">
                Update Note
              </button>
              {message && (
                <div className={`text-sm font-medium ${message.includes("Error") ? "text-red-600" : "text-green-600"
                  }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className="card p-8">
          {/* Ownership badge */}
          {!isOwner && note.ownerInfo && (
            <div className="mb-4 flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full border border-purple-300 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Shared with me</span>
              </div>
              <span className="text-sm text-gray-600">
                by {note.ownerInfo.name || note.ownerInfo.email}
              </span>
            </div>
          )}

          {/* Title */}
          {note.title && (
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {note.title}
            </h1>
          )}

          {/* Content - Show Original and Updated sections */}
          {(() => {
            const originalContent = note.originalContent || note.content || '';
            const currentContent = note.currentContent || note.content || '';
            const hasChanges = originalContent !== currentContent;

            // Get owner info
            const ownerName = note.ownerInfo?.name || note.owner?.name || note.ownerInfo?.email || note.owner?.email || 'Unknown';

            // Helper: get most recent collaborator email from collaboratorEdits
            function getLatestCollaboratorEmail(edits = []) {
              if (!Array.isArray(edits) || edits.length === 0) return null;
              // Get the most recent edit (last in array)
              const latestEdit = edits[edits.length - 1];
              if (!latestEdit) return null;
              // Try to get email from the edit
              if (latestEdit.email) return latestEdit.email;
              if (latestEdit.editedBy && typeof latestEdit.editedBy === 'object' && latestEdit.editedBy.email) {
                return latestEdit.editedBy.email;
              }
              return null;
            }

            // Determine who to display as "Last edited by"
            // Priority: 1) Most recent collaborator edit email, 2) Owner's email
            let lastEditorName = ownerName; // Default to owner
            const latestCollaboratorEmail = getLatestCollaboratorEmail(note.collaboratorEdits);

            if (latestCollaboratorEmail) {
              // Show collaborator email if there are collaborator edits
              lastEditorName = latestCollaboratorEmail;
            } else {
              // No collaborator edits - show owner's email
              lastEditorName = note.ownerInfo?.name || note.ownerInfo?.email || ownerName;
            }

            return (
              <div className="space-y-4 mb-6">
                {/* Original Content Section */}
                <div className="border-l-4 border-yellow-400 pl-4 py-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-r">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg
                      className="w-4 h-4 text-yellow-700 dark:text-yellow-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                      Original (Created by {ownerName})
                    </span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {originalContent || <span className="text-gray-400 italic">Empty note</span>}
                  </div>
                </div>

                {/* Updated Content Section */}
                {hasChanges ? (
                  <div className="border-l-4 border-blue-400 pl-4 py-3 bg-blue-50 dark:bg-blue-900/10 rounded-r">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg
                        className="w-4 h-4 text-blue-700 dark:text-blue-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        Updated (Last edited by {lastEditorName})
                      </span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {currentContent || <span className="text-gray-400 italic">Empty note</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No changes from original
                  </div>
                )}
              </div>
            );
          })()}

          {/* Legacy content display (for backward compatibility with old format) */}
          {!note.originalContent && !note.currentContent && note.content && (() => {
            const { mainText, changeLog } = parseContent(note.content);

            // Split text by tags to render them inline
            // Using a regex with capturing groups - split includes the matches
            const tagPattern = /(\[edited-by:\s*[^,]+\s*,\s*time:\s*[^\]]+\])/g;
            const parts = mainText.split(tagPattern);

            return (
              <div className="mb-6">
                <div className="prose max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {parts.map((part, idx) => {
                      // Check if this part is a tag (format: [edited-by: name, time: timestamp])
                      const tagMatch = part.match(/^\[edited-by:\s*([^,]+),\s*time:\s*([^\]]+)\]$/);
                      if (tagMatch) {
                        const collaborator = tagMatch[1].trim();
                        const timestamp = tagMatch[2].trim();
                        return (
                          <span
                            key={idx}
                            className="inline-block ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 font-mono"
                            title={`Edited by ${collaborator} at ${timestamp}`}
                          >
                            [edited-by: {collaborator}, time: {timestamp}]
                          </span>
                        );
                      }
                      return <span key={idx}>{part}</span>;
                    })}
                  </div>
                </div>

                {/* Change Log */}
                {changeLog && changeLog.trim() && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Change Log</span>
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-600 whitespace-pre-wrap">
                      {changeLog.trim()}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Metadata */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {note.reminderAt && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">
                    Reminder: {new Date(note.reminderAt).toLocaleString()}
                  </span>
                </div>
              )}

              {note.collaborators && note.collaborators.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {note.collaborators.map((email, idx) => (
                    <div key={idx} className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-medium text-sm">{email}</span>
                    </div>
                  ))}
                </div>
              )}

              {!isOwner && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="font-medium">Can edit</span>
                </div>
              )}

              <div className="text-gray-500">
                Last updated: {new Date(note.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

