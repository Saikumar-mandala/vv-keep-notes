// utils/validation.js
// Comprehensive validation utilities for the application

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  const trimmed = password.trim();

  if (trimmed.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (trimmed.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'abc123'];
  if (weakPasswords.some(weak => trimmed.toLowerCase().includes(weak))) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates name
 * @param {string} name - Name to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validateName(name) {
  const errors = [];

  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
    return { valid: false, errors };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (trimmed.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates note title
 * @param {string} title - Title to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validateNoteTitle(title) {
  const errors = [];

  if (title === null || title === undefined) {
    // Title is optional for notes
    return { valid: true, errors: [] };
  }

  if (typeof title !== 'string') {
    errors.push('Title must be a string');
    return { valid: false, errors };
  }

  if (title.length > 500) {
    errors.push('Title must be less than 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates note content
 * @param {string} content - Content to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validateNoteContent(content) {
  const errors = [];

  if (content === null || content === undefined) {
    // Content is optional
    return { valid: true, errors: [] };
  }

  if (typeof content !== 'string') {
    errors.push('Content must be a string');
    return { valid: false, errors };
  }

  if (content.length > 100000) {
    errors.push('Content must be less than 100,000 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates collaborator emails array
 * @param {Array<string>} collaborators - Array of email addresses
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validateCollaborators(collaborators) {
  const errors = [];

  if (!Array.isArray(collaborators)) {
    errors.push('Collaborators must be an array');
    return { valid: false, errors };
  }

  if (collaborators.length > 50) {
    errors.push('Cannot have more than 50 collaborators');
  }

  const emailSet = new Set();
  collaborators.forEach((email, index) => {
    if (typeof email !== 'string') {
      errors.push(`Collaborator at position ${index + 1} must be a string`);
      return;
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      errors.push(`Collaborator at position ${index + 1} cannot be empty`);
      return;
    }

    if (!isValidEmail(trimmed)) {
      errors.push(`Invalid email format: ${email}`);
      return;
    }

    if (emailSet.has(trimmed)) {
      errors.push(`Duplicate email: ${email}`);
      return;
    }

    emailSet.add(trimmed);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates reminder date
 * @param {Date|string|null} reminderAt - Reminder date
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validateReminderDate(reminderAt) {
  const errors = [];

  if (!reminderAt) {
    // Reminder is optional
    return { valid: true, errors: [] };
  }

  const date = new Date(reminderAt);

  if (isNaN(date.getTime())) {
    errors.push('Invalid date format');
    return { valid: false, errors };
  }

  // Reminder should be in the future
  if (date <= new Date()) {
    errors.push('Reminder time must be in the future');
  }

  // Reminder should not be too far in the future (e.g., 10 years)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  if (date > maxDate) {
    errors.push('Reminder time cannot be more than 10 years in the future');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes string input to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim();
}

/**
 * Sanitizes email
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates and sanitizes registration data
 * @param {object} data - Registration data
 * @returns {{valid: boolean, errors: string[], sanitized: object|null}} - Validation result
 */
export function validateRegistration(data) {
  const errors = [];
  const sanitized = {};

  // Validate name
  const nameValidation = validateName(data.name);
  if (!nameValidation.valid) {
    errors.push(...nameValidation.errors);
  } else {
    sanitized.name = sanitizeString(data.name);
  }

  // Validate email
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  } else {
    sanitized.email = sanitizeEmail(data.email);
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  } else {
    sanitized.password = data.password; // Don't trim password, keep as is
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : null
  };
}

/**
 * Validates and sanitizes login data
 * @param {object} data - Login data
 * @returns {{valid: boolean, errors: string[], sanitized: object|null}} - Validation result
 */
export function validateLogin(data) {
  const errors = [];
  const sanitized = {};

  // Validate email
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  } else {
    sanitized.email = sanitizeEmail(data.email);
  }

  // Validate password
  if (!data.password || typeof data.password !== 'string' || data.password.trim().length === 0) {
    errors.push('Password is required');
  } else {
    sanitized.password = data.password; // Don't trim password
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : null
  };
}

/**
 * Validates note creation/update data
 * @param {object} data - Note data
 * @returns {{valid: boolean, errors: string[], sanitized: object|null}} - Validation result
 */
export function validateNote(data) {
  const errors = [];
  const sanitized = {};

  // Validate title
  const titleValidation = validateNoteTitle(data.title);
  if (!titleValidation.valid) {
    errors.push(...titleValidation.errors);
  } else {
    sanitized.title = data.title ? sanitizeString(data.title) : '';
  }

  // Validate content
  const contentValidation = validateNoteContent(data.content);
  if (!contentValidation.valid) {
    errors.push(...contentValidation.errors);
  } else {
    sanitized.content = data.content ? data.content : ''; // Allow HTML content for notes
  }

  // Validate collaborators
  if (data.collaborators !== undefined) {
    const collaboratorsValidation = validateCollaborators(data.collaborators);
    if (!collaboratorsValidation.valid) {
      errors.push(...collaboratorsValidation.errors);
    } else {
      sanitized.collaborators = data.collaborators.map(email => sanitizeEmail(email));
    }
  }

  // Validate reminder date
  if (data.reminderAt !== undefined) {
    const reminderValidation = validateReminderDate(data.reminderAt);
    if (!reminderValidation.valid) {
      errors.push(...reminderValidation.errors);
    } else {
      sanitized.reminderAt = data.reminderAt || null;
    }
  }


  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : null
  };
}

/**
 * Validates ObjectId format (MongoDB)
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

