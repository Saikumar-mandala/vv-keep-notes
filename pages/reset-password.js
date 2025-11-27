// pages/reset-password.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { validatePassword } from '../utils/validation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    if (router.isReady) {
      if (!token) {
        setTokenValid(false);
        setError('Invalid reset link. Please request a new password reset.');
      } else {
        setTokenValid(true);
      }
    }
  }, [token, router.isReady]);

  function validateField(name, value) {
    const newErrors = { ...errors };
    
    if (name === 'password') {
      const validation = validatePassword(value);
      newErrors.password = validation.valid ? '' : validation.errors[0] || '';
      // Also validate confirm password if it has a value
      if (confirmPassword) {
        newErrors.confirmPassword = confirmPassword === value ? '' : 'Passwords do not match';
      }
    }
    
    if (name === 'confirmPassword') {
      if (!value) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (value !== password) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        newErrors.confirmPassword = '';
      }
    }
    
    setErrors(newErrors);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Validate all fields
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setErrors({ password: passwordValidation.errors[0] || '', confirmPassword: errors.confirmPassword });
      setError(passwordValidation.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ password: '', confirmPassword: 'Passwords do not match' });
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('/api/auth/reset-password', { 
        token, 
        password 
      });
      setMessage(res.data.message || 'Password has been reset successfully.');
      
      // Redirect to login after success
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to reset password';
      setError(errorMsg);
      if (err?.response?.data?.errors) {
        const fieldErrors = { password: '', confirmPassword: '' };
        err.response.data.errors.forEach(error => {
          if (error.toLowerCase().includes('password')) {
            fieldErrors.password = error;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  }

  if (tokenValid === false) {
    return (
      <>
        <div className="card p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">The password reset link is invalid or missing.</p>
              <Link href="/forgot-password" className="btn-primary inline-block">
                Request New Reset Link
              </Link>
            </div>
          </div>
      </>
    );
  }

  return (
    <>
      <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-600">Enter your new password below</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                required
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  validateField('password', e.target.value);
                }}
                onBlur={e => validateField('password', e.target.value)}
                className={`input-field ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                minLength={6}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                required
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  validateField('confirmPassword', e.target.value);
                }}
                onBlur={e => validateField('confirmPassword', e.target.value)}
                className={`input-field ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                minLength={6}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}
            
            <button 
              type="submit"
              className="btn-primary w-full" 
              disabled={loading || !token}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
            
            <div className="text-center pt-4">
              <Link 
                href="/login" 
                className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        </div>
    </>
  );
}

