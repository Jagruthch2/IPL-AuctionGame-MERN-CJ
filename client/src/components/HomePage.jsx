import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import AuctionGame from './AuctionGame';
import ConnectionStatus from './ConnectionStatus';
import NotificationList from './NotificationList';

const HomePage = ({ user, onLogout }) => {
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'auction'
  const { joinGame, isConnected } = useSocket();

  // Join the game when component mounts
  useEffect(() => {
    if (isConnected && user) {
      joinGame(user);
    }
  }, [isConnected, user, joinGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100">
      {/* Connection Status and Notifications */}
      <ConnectionStatus />
      <NotificationList />

      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Auction Game
                </h1>
              </div>
              
              {/* Navigation Links */}
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={() => setCurrentView('home')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentView === 'home'
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:text-violet-600'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setCurrentView('auction')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentView === 'auction'
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:text-violet-600'
                  }`}
                >
                  Live Auction
                </button>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileCard(!showProfileCard)}
                className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium hover:from-violet-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 focus:ring-4 focus:ring-violet-200 focus:outline-none"
              >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">{user.username.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden sm:inline">{user.username}</span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${showProfileCard ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showProfileCard && (
                <div className="absolute right-0 mt-2 w-72 bg-white/90 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 py-4 px-6 z-50 transform transition-all duration-300 animate-in slide-in-from-top-2">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">{user.username}</h3>
                    <p className="text-sm text-gray-500">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 focus:ring-4 focus:ring-red-200 focus:outline-none"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentView === 'home' ? (
          <>
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <div className="relative inline-block">
                <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-4">
                  Welcome, {user.username}!
                </h1>
                <div className="absolute -top-4 -left-8 w-24 h-24 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full opacity-20 blur-xl"></div>
                <div className="absolute -top-2 -right-4 w-16 h-16 bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-full opacity-20 blur-xl"></div>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                You've successfully logged into your account. Welcome to the ultimate auction gaming experience!
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {/* Card 1 */}
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform transition-all duration-300 hover:scale-105 group">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">Experience real-time bidding with lightning-fast response times.</p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform transition-all duration-300 hover:scale-105 group">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Secure</h3>
                <p className="text-gray-600">Your data and transactions are protected with enterprise-grade security.</p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform transition-all duration-300 hover:scale-105 group">
                <div className="w-12 h-12 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Community</h3>
                <p className="text-gray-600">Join thousands of players in the most exciting auction battles.</p>
              </div>
            </div>

            {/* Action Section */}
            <div className="text-center">
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Start Playing?</h2>
                <p className="text-gray-600 mb-6">
                  Your account is set up and ready to go. Jump into exciting auctions and compete with players from around the world!
                </p>
                <button 
                  onClick={() => setCurrentView('auction')}
                  className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 focus:ring-4 focus:ring-violet-200 focus:outline-none shadow-lg"
                >
                  Start Playing Now
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Auction Game View */
          <AuctionGame user={user} />
        )}
      </main>

      {/* Background Decorations */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-fuchsia-400 to-pink-400 rounded-full opacity-3 blur-3xl"></div>
      </div>
    </div>
  );
};

export default HomePage;
