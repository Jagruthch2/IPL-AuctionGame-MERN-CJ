import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

const AuctionHomePage = ({ user, onLogout, onCreateAuction, onJoinAuction }) => {
  const { isConnected, connectSocket } = useSocket();
  const [showProfileCard, setShowProfileCard] = useState(false);

  useEffect(() => {
    // Connect to socket when component mounts, but only once
    if (user) {
      const playerConnected = sessionStorage.getItem('playerConnected');
      if (!playerConnected) {
        connectSocket(user);
        sessionStorage.setItem('playerConnected', 'true');
      }
    }
  }, [user, connectSocket]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Simple Header */}
      <header className="p-4 bg-gray-800 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Auction Game</h1>
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg text-white"
          >
            <span>{user.username}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showProfileCard && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg p-4 z-10">
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Just the Buttons */}
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col sm:flex-row gap-6 p-4">
          {/* Create Auction Button */}
          <button
            onClick={onCreateAuction}
            className="px-8 py-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            Create Auction
          </button>

          {/* Join Auction Button */}
          <button
            onClick={onJoinAuction}
            className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            Join Auction
          </button>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="p-2 bg-gray-800 text-center text-gray-400 text-sm">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </footer>
    </div>
  );
};

export default AuctionHomePage;
