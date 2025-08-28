import { useState, useEffect } from 'react';
import { SocketProvider } from './contexts/SocketContext';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import AuctionHomePage from './components/AuctionHomePage';
import CreateAuction from './components/CreateAuction';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'signup', 'home', 'create', 'join', 'auction'
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAuction, setCurrentAuction] = useState(null);
  const [isJoinMode, setIsJoinMode] = useState(false);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem('auction_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setCurrentView('home');
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('auction_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('auction_user', JSON.stringify(userData));
    setCurrentView('home');
  };

  const handleSignupSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('auction_user', JSON.stringify(userData));
    setCurrentView('home');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentAuction(null);
    localStorage.removeItem('auction_user');
    setCurrentView('login');
  };

  const switchToSignup = () => {
    setCurrentView('signup');
  };

  const switchToLogin = () => {
    setCurrentView('login');
  };

  const handleCreateAuction = () => {
    setIsJoinMode(false);
    setCurrentView('create');
  };

  const handleJoinAuction = () => {
    setIsJoinMode(true);
    setCurrentView('create');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
  };

  const handleAuctionCreated = (auctionData) => {
    setCurrentAuction(auctionData);
    setCurrentView('auction');
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate view
  const renderView = () => {
    switch (currentView) {
      case 'signup':
        return (
          <SignupForm 
            onSignupSuccess={handleSignupSuccess}
            onSwitchToLogin={switchToLogin}
          />
        );
      case 'home':
        return (
          <SocketProvider>
            <AuctionHomePage 
              user={user}
              onLogout={handleLogout}
              onCreateAuction={handleCreateAuction}
              onJoinAuction={handleJoinAuction}
            />
          </SocketProvider>
        );
      case 'create':
        return (
          <SocketProvider>
            <CreateAuction 
              user={user}
              onBack={handleBackToHome}
              onAuctionCreated={handleAuctionCreated}
              isJoinMode={isJoinMode}
            />
          </SocketProvider>
        );
      case 'auction':
        return (
          <SocketProvider>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
              <div className="text-center text-white">
                <h1 className="text-4xl font-bold mb-4">🏏 Auction Room</h1>
                <p className="text-xl mb-4">Auction: {currentAuction?.auctionName}</p>
                <p className="text-white/80">Auction functionality coming soon...</p>
                <button
                  onClick={handleBackToHome}
                  className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </SocketProvider>
        );
      case 'login':
      default:
        return (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={switchToSignup}
          />
        );
    }
  };

  return renderView();
}

export default App;
