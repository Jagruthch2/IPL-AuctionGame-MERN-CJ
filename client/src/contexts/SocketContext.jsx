import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playersCount, setPlayersCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [gameState, setGameState] = useState({
    currentBid: 0,
    currentBidder: null,
    isAuctionActive: false,
    auctionItem: null
  });
  const [auctionState, setAuctionState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('https://ipl-auctiongame-mern-cj.onrender.com/', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🎮 Connected to game server:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
    });

    // Game event handlers
    newSocket.on('game:playersCount', (count) => {
      setPlayersCount(count);
    });

    newSocket.on('player:joined', (data) => {
      setPlayersCount(data.playersCount);
      addNotification(`🎉 ${data.username} joined the game!`, 'success');
    });

    newSocket.on('player:left', (data) => {
      setPlayersCount(data.playersCount);
      addNotification(`👋 ${data.username} left the game`, 'info');
    });

    newSocket.on('auction:newBid', (bidData) => {
      setGameState(prev => ({
        ...prev,
        currentBid: bidData.amount,
        currentBidder: bidData.username
      }));
      addNotification(`💰 ${bidData.username} bid $${bidData.amount}!`, 'auction');
    });

    newSocket.on('game:stateUpdate', (data) => {
      setGameState(prev => ({
        ...prev,
        ...data
      }));
      if (data.updatedBy) {
        addNotification(`🎯 Game updated by ${data.updatedBy}`, 'info');
      }
    });

    newSocket.on('chat:newMessage', (messageData) => {
      setMessages(prev => [...prev, messageData]);
    });

    // Auction event handlers
    newSocket.on('auction:started', (data) => {
      setAuctionState(data.auctionState);
      addNotification(`🏏 Auction has started!`, 'auction');
    });

    newSocket.on('auction:bidPlaced', (data) => {
      setAuctionState(data.auctionState);
      addNotification(`💰 ${data.bidder} bids ${data.message.split(' ').pop()}`, 'auction');
    });

    newSocket.on('auction:passed', (data) => {
      setAuctionState(data.auctionState);
      addNotification(`👋 ${data.passer} passed`, 'auction');
    });

    newSocket.on('auction:paused', (data) => {
      setAuctionState(data);
      addNotification(`⏸️ Auction paused`, 'info');
    });

    newSocket.on('auction:resumed', (data) => {
      setAuctionState(data);
      addNotification(`▶️ Auction resumed`, 'info');
    });

    newSocket.on('auction:ended', (data) => {
      setAuctionState(data);
      addNotification(`🛑 Auction ended`, 'info');
    });

    newSocket.on('tournament:completed', (data) => {
      addNotification(`🏆 Tournament completed! Winner: ${data.tournament.tournamentWinner?.name}`, 'success');
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const joinGame = (userData) => {
    if (socket && isConnected && (!currentUser || currentUser.username !== userData.username)) {
      console.log('Joining game with user:', userData.username);
      socket.emit('player:join', userData);
      setCurrentUser(userData);
    }
  };

  const placeBid = (amount) => {
    if (socket && isConnected) {
      socket.emit('auction:bid', { amount });
    }
  };

  const updateGameState = (newState) => {
    if (socket && isConnected) {
      socket.emit('game:update', newState);
    }
  };

  const sendMessage = (message) => {
    if (socket && isConnected) {
      socket.emit('chat:message', { message });
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const connectSocket = (userData) => {
    if (socket && isConnected && (!currentUser || currentUser.username !== userData.username)) {
      console.log('Connecting socket with user:', userData.username);
      socket.emit('player:join', userData);
      setCurrentUser(userData);
    }
  };

  const value = {
    socket,
    isConnected,
    playersCount,
    gameState,
    auctionState,
    messages,
    notifications,
    currentUser,
    joinGame,
    placeBid,
    updateGameState,
    sendMessage,
    clearNotifications,
    addNotification,
    connectSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
