import { useState } from 'react';
import { authAPI } from '../services/api';

const SignupForm = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.signup({
        username: formData.username,
        password: formData.password
      });
      if (response.success) {
        onSignupSuccess(response.user);
      }
    } catch (error) {
      setErrors({ general: error.message || 'Signup failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Main Container */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 transform transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                Join Us Today
              </h2>
              <div className="absolute -top-2 -left-4 w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-20 blur-lg"></div>
              <div className="absolute -top-1 -right-2 w-12 h-12 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full opacity-20 blur-lg"></div>
            </div>
            <p className="text-gray-600 mt-2">Create your account to get started</p>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg animate-pulse">
              <p className="text-red-700 text-sm font-medium">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-emerald-600">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 bg-white/50 backdrop-blur-sm
                    ${focusedField === 'username' 
                      ? 'border-emerald-500 ring-4 ring-emerald-100 shadow-lg' 
                      : 'border-gray-200 hover:border-emerald-300'
                    }
                    focus:outline-none placeholder-gray-400 text-gray-700 font-medium`}
                  placeholder="Choose a username"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 -z-10 transition-opacity duration-300 group-focus-within:opacity-10"></div>
              </div>
              {errors.username && (
                <p className="mt-2 text-red-500 text-sm font-medium">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-emerald-600">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 bg-white/50 backdrop-blur-sm
                    ${focusedField === 'password' 
                      ? 'border-emerald-500 ring-4 ring-emerald-100 shadow-lg' 
                      : 'border-gray-200 hover:border-emerald-300'
                    }
                    focus:outline-none placeholder-gray-400 text-gray-700 font-medium`}
                  placeholder="Create a password"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 -z-10 transition-opacity duration-300 group-focus-within:opacity-10"></div>
              </div>
              {errors.password && (
                <p className="mt-2 text-red-500 text-sm font-medium">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-emerald-600">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 bg-white/50 backdrop-blur-sm
                    ${focusedField === 'confirmPassword' 
                      ? 'border-emerald-500 ring-4 ring-emerald-100 shadow-lg' 
                      : 'border-gray-200 hover:border-emerald-300'
                    }
                    focus:outline-none placeholder-gray-400 text-gray-700 font-medium`}
                  placeholder="Confirm your password"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 -z-10 transition-opacity duration-300 group-focus-within:opacity-10"></div>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-red-500 text-sm font-medium">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl font-bold text-white text-lg
                bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600
                hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700
                focus:ring-4 focus:ring-emerald-200 focus:outline-none
                transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                relative overflow-hidden group"
            >
              <span className="relative z-10">
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <span className="px-4 text-gray-500 text-sm font-medium">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600 mb-3">Already have an account?</p>
            <button
              onClick={onSwitchToLogin}
              className="inline-flex items-center px-6 py-2 rounded-lg font-semibold text-emerald-600 
                bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300
                transition-all duration-300 hover:scale-105 focus:ring-4 focus:ring-emerald-100 focus:outline-none"
            >
              <span>Sign In</span>
              <svg className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-10 blur-xl"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full opacity-10 blur-xl"></div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
