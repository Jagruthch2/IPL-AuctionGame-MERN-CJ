import { useState } from 'react';
import { authAPI } from '../services/api';

const LoginForm = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login(formData);
      if (response.success) {
        onLoginSuccess(response.user);
      }
    } catch (error) {
      setErrors({ general: error.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Main Container */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 transform transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h2>
              <div className="absolute -top-2 -left-4 w-16 h-16 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-20 blur-lg"></div>
              <div className="absolute -top-1 -right-2 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 blur-lg"></div>
            </div>
            <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-indigo-600">
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
                      ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-lg' 
                      : 'border-gray-200 hover:border-indigo-300'
                    }
                    focus:outline-none placeholder-gray-400 text-gray-700 font-medium`}
                  placeholder="Enter your username"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 -z-10 transition-opacity duration-300 group-focus-within:opacity-10"></div>
              </div>
              {errors.username && (
                <p className="mt-2 text-red-500 text-sm font-medium">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-indigo-600">
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
                      ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-lg' 
                      : 'border-gray-200 hover:border-indigo-300'
                    }
                    focus:outline-none placeholder-gray-400 text-gray-700 font-medium`}
                  placeholder="Enter your password"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 -z-10 transition-opacity duration-300 group-focus-within:opacity-10"></div>
              </div>
              {errors.password && (
                <p className="mt-2 text-red-500 text-sm font-medium">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl font-bold text-white text-lg
                bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700
                focus:ring-4 focus:ring-indigo-200 focus:outline-none
                transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                relative overflow-hidden group"
            >
              <span className="relative z-10">
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <span className="px-4 text-gray-500 text-sm font-medium">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-600 mb-3">Don't have an account?</p>
            <button
              onClick={onSwitchToSignup}
              className="inline-flex items-center px-6 py-2 rounded-lg font-semibold text-indigo-600 
                bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-300
                transition-all duration-300 hover:scale-105 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
            >
              <span>Sign Up</span>
              <svg className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-10 blur-xl"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 blur-xl"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
