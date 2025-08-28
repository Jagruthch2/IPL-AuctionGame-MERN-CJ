require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const auctionService = require('./services/auctionService');
const tournamentService = require('./services/tournamentService');

const app = express();
const httpServer = http.createServer(app);
// Define allowed origins
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5174", 
  "https://dazzling-mochi-d70ba6.netlify.app",
  "https://ipl-auctiongame-mern-cj.onrender.com"
];

// If there's an environment variable for client URL, add it
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// Allow all origins in development, or if specified in environment variable
const corsOrigin = process.env.CORS_ALLOW_ALL === 'true' ? '*' : allowedOrigins;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  // Check if the origin is in our allowed list
  const origin = req.headers.origin;
  if (corsOrigin === '*' || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // For localhost or other development environments
    res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Socket.IO connection handling
const connectedPlayers = new Map(); // Store connected players
const auctionRooms = new Map(); // Store auction rooms

io.on('connection', (socket) => {
  console.log(`🎮 Player connected: ${socket.id}`);
  
  // Handle player joining with user data
  socket.on('player:join', (userData) => {
    // Check if this player already exists with the same username
    // If so, update their socket ID but don't re-register them
    const existingPlayer = Array.from(connectedPlayers.values()).find(
      player => player.username === userData.username && player.socketId !== socket.id
    );
    
    if (existingPlayer) {
      // Update the existing player's socket ID
      connectedPlayers.delete(existingPlayer.socketId);
      console.log(`🔄 Player ${userData.username} reconnected with new socket ID: ${socket.id}`);
    } else {
      console.log(`📝 Player ${userData.username} (${socket.id}) joined the game`);
      
      // Broadcast to all clients that a new player joined
      socket.broadcast.emit('player:joined', {
        username: userData.username,
        playersCount: connectedPlayers.size + 1 // +1 because we haven't added to map yet
      });
    }
    
    // Add or update player in the connected players map
    connectedPlayers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      joinedAt: new Date()
    });
    
    // Send current players count to the joining player
    socket.emit('game:playersCount', connectedPlayers.size);
  });

  // Handle auction room creation
  socket.on('auction:create', (auctionData) => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log(`🏟️ ${player.username} creating auction room: ${auctionData.roomCode}`);
      
      // Create room data
      const roomData = {
        ...auctionData,
        createdBy: player.username,
        creatorId: socket.id,
        players: [{
          id: socket.id,
          username: player.username,
          team: null,
          isCreator: true,
          joinedAt: new Date()
        }],
        status: 'waiting',
        createdAt: new Date()
      };
      
      // Store room
      auctionRooms.set(auctionData.roomCode, roomData);
      
      // Join the socket to the room
      socket.join(auctionData.roomCode);
      
      // Send confirmation to creator
      socket.emit('auction:created', roomData);
      
      console.log(`✅ Auction room ${auctionData.roomCode} created successfully`);
    }
  });

  // Handle joining auction room
  socket.on('auction:join', (joinData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(joinData.roomCode);
    
    if (!player) {
      socket.emit('auction:joinError', 'Player not found');
      return;
    }
    
    if (!room) {
      socket.emit('auction:joinError', 'Room not found');
      return;
    }
    
    if (room.players.length >= room.maxPlayers) {
      socket.emit('auction:joinError', 'Room is full');
      return;
    }
    
    if (room.players.find(p => p.id === socket.id)) {
      socket.emit('auction:joinError', 'You are already in this room');
      return;
    }
    
    console.log(`🚪 ${player.username} joining auction room: ${joinData.roomCode}`);
    
    // Add player to room
    const newPlayer = {
      id: socket.id,
      username: player.username,
      team: null,
      isCreator: false,
      joinedAt: new Date()
    };
    
    room.players.push(newPlayer);
    
    // Join the socket to the room
    socket.join(joinData.roomCode);
    
    // Update room data
    auctionRooms.set(joinData.roomCode, room);
    
    // Send join success to the player who joined
    socket.emit('auction:joinSuccess', room);
    
    // Notify all players in the room
    io.to(joinData.roomCode).emit('auction:playerJoined', room.players);
    io.to(joinData.roomCode).emit('auction:roomUpdate', room);
    
    console.log(`✅ ${player.username} joined room ${joinData.roomCode} successfully`);
  });

  // Handle team selection
  socket.on('auction:selectTeam', (teamData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(teamData.roomCode);
    
    if (!player || !room) {
      socket.emit('auction:teamSelectError', 'Room or player not found');
      return;
    }
    
    // Check if team is already taken
    const teamTaken = room.players.find(p => p.team === teamData.teamId);
    if (teamTaken && teamTaken.id !== socket.id) {
      socket.emit('auction:teamSelectError', 'Team already selected');
      return;
    }
    
    console.log(`🏏 ${player.username} selecting team: ${teamData.teamId}`);
    
    // Update player's team
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      // If player previously had a team, mark it as available
      const previousTeam = room.players[playerIndex].team;
      
      // Set the new team
      room.players[playerIndex].team = teamData.teamId;
    }
    
    // Update room data
    auctionRooms.set(teamData.roomCode, room);
    
    // Notify all players in the room about the team selection
    io.to(teamData.roomCode).emit('auction:teamSelected', {
      playerId: socket.id,
      teamId: teamData.teamId,
      updatedPlayers: room.players
    });
    
    // Send a full room update to ensure all clients have the same state
    io.to(teamData.roomCode).emit('auction:roomUpdate', room);
    
    console.log(`✅ ${player.username} selected team ${teamData.teamId} successfully`);
  });
  
  // Handle auction start
  socket.on('auction:start', (startData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(startData.roomCode);
    
    if (!player || !room) {
      socket.emit('auction:startError', 'Room or player not found');
      return;
    }
    
    if (room.creatorId !== socket.id) {
      socket.emit('auction:startError', 'Only room creator can start auction');
      return;
    }
    
    if (room.players.length < 2) {
      socket.emit('auction:startError', 'Need at least 2 players to start');
      return;
    }
    
    if (room.players.some(p => !p.team)) {
      socket.emit('auction:startError', 'All players must select a team');
      return;
    }
    
    console.log(`🚀 ${player.username} starting auction in room: ${startData.roomCode}`);
    
    // Initialize auction
    const teams = room.players.map(p => ({
      id: p.team,
      name: p.team, // This should be the team name from your IPL teams
      playerId: p.id,
      playerName: p.username
    }));
    
    const auctionState = auctionService.initializeAuction(startData.roomCode, teams);
    
    // Update room status
    room.status = 'auction';
    room.startedAt = new Date();
    room.auctionState = auctionState;
    auctionRooms.set(startData.roomCode, room);
    
    // Notify all players in the room
    io.to(startData.roomCode).emit('auction:started', {
      room,
      auctionState
    });
    
    console.log(`✅ Auction started in room ${startData.roomCode}`);
  });

  // Handle auction bidding
  socket.on('auction:bid', (bidData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(bidData.roomCode);
    
    if (!player || !room) {
      socket.emit('auction:bidError', 'Room or player not found');
      return;
    }

    const playerInRoom = room.players.find(p => p.id === socket.id);
    if (!playerInRoom) {
      socket.emit('auction:bidError', 'You are not in this auction');
      return;
    }

    const result = auctionService.placeBid(bidData.roomCode, playerInRoom.team, bidData.amount);
    
    if (result.success) {
      // Get updated team stats after the bid
      const teamStats = auctionService.getTeamStats(bidData.roomCode);
      
      // Broadcast bid to all players in room
      io.to(bidData.roomCode).emit('auction:bidPlaced', {
        bidder: player.username,
        team: playerInRoom.team,
        amount: bidData.amount,
        auctionState: result.auctionState,
        teamStats: teamStats,
        message: result.message
      });
    } else {
      socket.emit('auction:bidError', result.error);
    }
  });

  // Handle auction pass
  socket.on('auction:pass', (passData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(passData.roomCode);
    
    if (!player || !room) {
      socket.emit('auction:passError', 'Room or player not found');
      return;
    }

    const playerInRoom = room.players.find(p => p.id === socket.id);
    if (!playerInRoom) {
      socket.emit('auction:passError', 'You are not in this auction');
      return;
    }

    const result = auctionService.passBid(passData.roomCode, playerInRoom.team);
    
    if (result.success) {
      io.to(passData.roomCode).emit('auction:passed', {
        passer: player.username,
        team: playerInRoom.team,
        auctionState: result.auctionState,
        teamStats: result.teamStats,
        playerSold: result.playerSold // Flag to indicate if a player was sold due to all teams passing
      });
    } else {
      socket.emit('auction:passError', result.error);
    }
  });

  // Handle auction pause/resume
  socket.on('auction:pause', (pauseData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(pauseData.roomCode);
    
    if (!player || !room || room.creatorId !== socket.id) {
      socket.emit('auction:pauseError', 'Only room creator can pause auction');
      return;
    }

    const result = auctionService.pauseAuction(pauseData.roomCode);
    if (result.success) {
      io.to(pauseData.roomCode).emit('auction:paused', result.auctionState);
    }
  });

  socket.on('auction:resume', (resumeData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(resumeData.roomCode);
    
    if (!player || !room || room.creatorId !== socket.id) {
      socket.emit('auction:resumeError', 'Only room creator can resume auction');
      return;
    }

    const result = auctionService.resumeAuction(resumeData.roomCode);
    if (result.success) {
      io.to(resumeData.roomCode).emit('auction:resumed', result.auctionState);
    }
  });

  // Handle auction end
  socket.on('auction:end', (endData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(endData.roomCode);
    
    if (!player || !room || room.creatorId !== socket.id) {
      socket.emit('auction:endError', 'Only room creator can end auction');
      return;
    }

    const result = auctionService.endAuction(endData.roomCode);
    if (result.success) {
      // Pass removed teams information with the auction ended event
      io.to(endData.roomCode).emit('auction:ended', {
        ...result.auctionState,
        removedTeams: result.teamsRemoved
      });
    }
  });

  // Handle tournament start
  socket.on('tournament:start', (tournamentData) => {
    const player = connectedPlayers.get(socket.id);
    const room = auctionRooms.get(tournamentData.roomCode);
    
    if (!player || !room || room.creatorId !== socket.id) {
      socket.emit('tournament:startError', 'Only room creator can start tournament');
      return;
    }

    const auctionState = auctionService.getAuctionState(tournamentData.roomCode);
    if (!auctionState || auctionState.auctionStatus !== 'ended') {
      socket.emit('tournament:startError', 'Auction must be completed first');
      return;
    }

    // Initialize tournament
    const tournament = tournamentService.initializeTournament(tournamentData.roomCode, auctionState.teams);
    
    // Simulate tournament
    const completedTournament = tournamentService.simulateFullTournament(tournamentData.roomCode);
    
    room.tournament = completedTournament;
    auctionRooms.set(tournamentData.roomCode, room);
    
    io.to(tournamentData.roomCode).emit('tournament:completed', {
      tournament: completedTournament,
      summary: tournamentService.getTournamentSummary(tournamentData.roomCode)
    });
  });

  // Handle getting auction state
  socket.on('auction:getState', (stateData) => {
    const auctionState = auctionService.getAuctionState(stateData.roomCode);
    const teamStats = auctionService.getTeamStats(stateData.roomCode);
    
    socket.emit('auction:stateUpdate', {
      auctionState,
      teamStats
    });
  });
  
  // Function to broadcast team stats updates to all clients in a room
  const broadcastTeamStats = (roomCode) => {
    const teamStats = auctionService.getTeamStats(roomCode);
    if (teamStats) {
      io.to(roomCode).emit('auction:teamStatsUpdate', teamStats);
    }
  };
  
  // Handle auction bid events
  socket.on('auction:bid', (bidData) => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log(`💰 ${player.username} placed a bid: $${bidData.amount}`);
      
      // Broadcast the bid to all other players
      socket.broadcast.emit('auction:newBid', {
        username: player.username,
        amount: bidData.amount,
        timestamp: new Date(),
        playerId: socket.id
      });
    }
  });
  
  // Handle game state updates
  socket.on('game:update', (gameData) => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log(`🎯 Game update from ${player.username}:`, gameData);
      
      // Broadcast game state to all players
      io.emit('game:stateUpdate', {
        ...gameData,
        updatedBy: player.username,
        timestamp: new Date()
      });
    }
  });
  
  // Handle chat messages
  socket.on('chat:message', (messageData) => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log(`💬 ${player.username}: ${messageData.message}`);
      
      // Broadcast message to all players
      io.emit('chat:newMessage', {
        username: player.username,
        message: messageData.message,
        timestamp: new Date(),
        playerId: socket.id
      });
    }
  });
  
  // Handle player disconnect
  socket.on('disconnect', () => {
    const player = connectedPlayers.get(socket.id);
    if (player) {
      console.log(`👋 Player ${player.username} (${socket.id}) disconnected`);
      
      // Remove player from auction rooms
      for (const [roomCode, room] of auctionRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          console.log(`🚪 Removing ${player.username} from auction room ${roomCode}`);
          room.players.splice(playerIndex, 1);
          
          // If room is empty, delete it
          if (room.players.length === 0) {
            auctionRooms.delete(roomCode);
            console.log(`🗑️ Deleted empty auction room ${roomCode}`);
          } else {
            // If disconnected player was creator, assign new creator
            if (room.creatorId === socket.id && room.players.length > 0) {
              room.creatorId = room.players[0].id;
              room.players[0].isCreator = true;
              console.log(`👑 ${room.players[0].username} is now the room creator`);
            }
            
            // Update room and notify remaining players
            auctionRooms.set(roomCode, room);
            io.to(roomCode).emit('auction:playerLeft', {
              leftPlayer: player.username,
              updatedPlayers: room.players,
              roomData: room
            });
            io.to(roomCode).emit('auction:roomUpdate', room);
          }
          break;
        }
      }
      
      connectedPlayers.delete(socket.id);
      
      // Notify remaining players
      socket.broadcast.emit('player:left', {
        username: player.username,
        playersCount: connectedPlayers.size
      });
    } else {
      console.log(`🔌 Socket ${socket.id} disconnected`);
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Routes
app.options('/api/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.use('/api', authRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Connect to MongoDB and start server
const connectDB = async () => {
  try {
    if (process.env.DBURL) {
      await mongoose.connect(process.env.DBURL);
      console.log('🍃 Connected to MongoDB Atlas');
    } else {
      console.log('⚠️ MongoDB connection skipped - running in development mode');
    }
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
      console.log(`⚡ Socket.IO Server: ws://localhost:${PORT}`);
      console.log(`👥 Ready for multiplayer connections!`);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.log('⚠️ Starting server without database connection...');
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (No DB)`);
      console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
      console.log(`⚡ Socket.IO Server: ws://localhost:${PORT}`);
      console.log(`👥 Ready for multiplayer connections!`);
    });
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

connectDB();
