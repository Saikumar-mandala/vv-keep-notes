// utils/editTracking.js
// Utility functions for tracking collaborator edits with metadata tags and change logs
// Combined: editTrackingConstants.js, textParsing.js

// ==================== Constants ====================
export const LOG_SEPARATOR = '\n\n--- Change Log ---\n';
export const TAG_REGEX = /\[edited-by:\s*([^,]+),\s*time:\s*([^\]]+)\]/g;

// ==================== Text Parsing Utilities ====================
/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for use in RegExp
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * Parses content into main text and change log
 */
export function parseContent(fullContent) {
  if (!fullContent) {
    return { mainText: '', changeLog: '' };
  }

  const parts = fullContent.split(LOG_SEPARATOR);
  return {
    mainText: parts[0] || '',
    changeLog: parts[1] || ''
  };
}

/**
 * Extracts all metadata tags from text
 */
export function extractTags(text) {
  const tags = [];
  let match;
  const regex = new RegExp(TAG_REGEX);

  while ((match = regex.exec(text)) !== null) {
    tags.push({
      fullMatch: match[0],
      collaborator: match[1].trim(),
      timestamp: match[2].trim(),
      index: match.index,
      length: match[0].length
    });
  }

  return tags;
}

/**
 * Removes all metadata tags from text (for clean display)
 */
export function removeTags(text) {
  return text.replace(TAG_REGEX, '').trim();
}

/**
 * Finds the position where a tag should be inserted/updated
 * For simplicity, we'll append tags at the end of paragraphs or at the end of content
 */
export function findTagPosition(text, blockEndIndex) {
  // If we have a specific block end index, use it
  if (blockEndIndex !== undefined && blockEndIndex >= 0) {
    return blockEndIndex;
  }

  // Otherwise, append at the end of the text
  return text.length;
}

/**
 * Updates or appends a metadata tag for a specific collaborator
 * If the collaborator already has a tag, it updates it; otherwise, appends a new one
 */
export function updateMetadataTag(content, collaboratorName, timestamp, blockEndIndex = null) {
  const { mainText, changeLog } = parseContent(content);

  // Create the new tag
  const newTag = `[edited-by: ${collaboratorName}, time: ${timestamp}]`;

  // Check if this collaborator already has a tag
  const collaboratorTagRegex = new RegExp(`\\[edited-by:\\s*${escapeRegex(collaboratorName)},\\s*time:[^\\]]+\\]`, 'g');

  let updatedMainText = mainText;

  if (collaboratorTagRegex.test(mainText)) {
    // Update existing tag
    updatedMainText = mainText.replace(collaboratorTagRegex, newTag);
  } else {
    // Append new tag
    const insertPosition = blockEndIndex !== null ? blockEndIndex : mainText.length;
    const before = mainText.slice(0, insertPosition).trim();
    const after = mainText.slice(insertPosition).trim();

    if (after) {
      updatedMainText = `${before} ${newTag}\n${after}`;
    } else {
      updatedMainText = `${before} ${newTag}`;
    }
  }

  return { mainText: updatedMainText, changeLog };
}

/**
 * Adds an entry to the change log
 */
export function addChangeLogEntry(changeLog, timestamp, collaboratorName, summary) {
  const entry = `- ${timestamp}: ${collaboratorName} edited "${summary}"`;

  if (!changeLog || changeLog.trim() === '') {
    return entry;
  }

  return `${changeLog.trim()}\n${entry}`;
}

/**
 * Combines main text and change log into full content
 */
export function combineContent(mainText, changeLog) {
  if (!changeLog || changeLog.trim() === '') {
    return mainText;
  }

  return `${mainText}${LOG_SEPARATOR}${changeLog}`;
}

/**
 * Detects changes between old and new content
 * Returns information about what was edited
 */
export function detectChanges(oldContent, newContent) {
  const { mainText: oldMain, changeLog: oldLog } = parseContent(oldContent);
  const { mainText: newMain, changeLog: newLog } = parseContent(newContent);

  const oldClean = removeTags(oldMain);
  const newClean = removeTags(newMain);

  return {
    contentChanged: oldClean !== newClean,
    oldText: oldClean,
    newText: newClean,
    summary: generateSummary(oldClean, newClean)
  };
}

/**
 * Generates a brief summary of what was edited
 */
function generateSummary(oldText, newText) {
  if (!oldText) return 'new content';
  if (!newText) return 'deleted content';

  const oldWords = oldText.split(/\s+/).length;
  const newWords = newText.split(/\s+/).length;

  if (newWords > oldWords) {
    return `added ${newWords - oldWords} words`;
  } else if (newWords < oldWords) {
    return `removed ${oldWords - newWords} words`;
  } else {
    return 'modified content';
  }
}

/**
 * Main function to process an edit and return updated content with tags and log
 */
export function processEdit(content, newContent, collaboratorName, isOwner = false) {
  // Format timestamp as YYYY-MM-DD HH:mm
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

  // Use "owner" for the original owner
  const editorName = isOwner ? 'owner' : collaboratorName;

  // Parse existing content
  const { mainText: existingMain, changeLog: existingLog } = parseContent(content || '');

  // Remove tags and log separator from incoming content to get clean text
  const cleanNewContent = removeTags(newContent.split(LOG_SEPARATOR)[0]).trim();
  const cleanExistingMain = removeTags(existingMain).trim();

  // Check if content actually changed
  if (cleanNewContent === cleanExistingMain) {
    // No content change, return as is
    return content || '';
  }

  // Create the new tag
  const newTag = `[edited-by: ${editorName}, time: ${timestamp}]`;

  // Check if this collaborator already has a tag in the existing content
  const collaboratorTagRegex = new RegExp(`\\[edited-by:\\s*${escapeRegex(editorName)},\\s*time:[^\\]]+\\]`, 'g');

  let finalMainText;
  if (collaboratorTagRegex.test(existingMain)) {
    // Update existing tag - replace the old tag with new tag
    // First, remove all tags to get clean text, then add back only the new tag
    const textWithoutTags = removeTags(existingMain);
    finalMainText = cleanNewContent ? `${cleanNewContent} ${newTag}` : newTag;
  } else {
    // Append new tag after the content
    finalMainText = cleanNewContent ? `${cleanNewContent} ${newTag}` : newTag;
  }

  // Generate summary for change log
  const oldWords = cleanExistingMain.split(/\s+/).filter(w => w).length;
  const newWords = cleanNewContent.split(/\s+/).filter(w => w).length;
  let summary = 'content';
  if (!cleanExistingMain) {
    summary = 'new content';
  } else if (!cleanNewContent) {
    summary = 'deleted content';
  } else if (newWords > oldWords) {
    summary = `added ${newWords - oldWords} words`;
  } else if (newWords < oldWords) {
    summary = `removed ${oldWords - newWords} words`;
  } else {
    summary = 'modified content';
  }

  // Add to change log
  const updatedLog = addChangeLogEntry(existingLog, timestamp, editorName, summary);

  // Combine and return
  return combineContent(finalMainText, updatedLog);
}

