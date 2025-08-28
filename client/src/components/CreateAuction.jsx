import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

// Import IPL team logos
import cskLogo from '../assets/IPL logos/ChennaiSuperKings.png';
import dcLogo from '../assets/IPL logos/Delhi_Capitals.svg.png';
import gtLogo from '../assets/IPL logos/GujaratTitans.png';
import kkrLogo from '../assets/IPL logos/Kolkata-Knight-Riders.png';
import lsgLogo from '../assets/IPL logos/Lucknow Super Giants.png';
import miLogo from '../assets/IPL logos/MumbaiIndians.png';
import pbksLogo from '../assets/IPL logos/PunjabKings.png';
import rrLogo from '../assets/IPL logos/Rajasthan-Royals.jpg';
import rcbLogo from '../assets/IPL logos/RoyalChallengersBangalore.jpg';
import srhLogo from '../assets/IPL logos/SunrisersHyderabad.png';
import IPLAuctionInterface from './IPLAuctionInterface';

// IPL Teams data with imported logos
const iplTeams = [
  { id: 'csk', name: 'Chennai Super Kings', logo: cskLogo },
  { id: 'dc', name: 'Delhi Capitals', logo: dcLogo },
  { id: 'gt', name: 'Gujarat Titans', logo: gtLogo },
  { id: 'kkr', name: 'Kolkata Knight Riders', logo: kkrLogo },
  { id: 'lsg', name: 'Lucknow Super Giants', logo: lsgLogo },
  { id: 'mi', name: 'Mumbai Indians', logo: miLogo },
  { id: 'pbks', name: 'Punjab Kings', logo: pbksLogo },
  { id: 'rr', name: 'Rajasthan Royals', logo: rrLogo },
  { id: 'rcb', name: 'Royal Challengers Bangalore', logo: rcbLogo },
  { id: 'srh', name: 'Sunrisers Hyderabad', logo: srhLogo }
];

const CreateAuction = ({ onBack, onAuctionCreated, user, isJoinMode = false }) => {
  const { socket, joinGame } = useSocket();
  const [numberOfPlayers, setNumberOfPlayers] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [takenTeams, setTakenTeams] = useState([]);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(isJoinMode ? 'join' : 'create');
  const [showAuction, setShowAuction] = useState(false);

  useEffect(() => {
    // Register player with server when component mounts, but only once
    if (socket && user && !roomCreated) {
      // Using a flag to ensure we only call this once
      const playerRegistered = sessionStorage.getItem('playerRegistered');
      if (!playerRegistered) {
        joinGame(user);
        sessionStorage.setItem('playerRegistered', 'true');
      }
    }

    if (socket) {
      // Listen for room creation success
      socket.on('auction:created', (roomData) => {
        setRoomCreated(true);
        setRoomCode(roomData.roomCode);
        setCurrentRoom(roomData);
        setPlayers([{ 
          id: socket.id, 
          username: user.username, 
          team: null,
          isCreator: true 
        }]);
        setIsRoomCreator(true);
      });

      // Listen for join success
      socket.on('auction:joinSuccess', (roomData) => {
        const currentPlayer = roomData.players.find(p => p.id === socket.id);
        if (currentPlayer) {
          setRoomCreated(true);
          setRoomCode(roomData.roomCode);
          setCurrentRoom(roomData);
          setPlayers(roomData.players);
          setTakenTeams(roomData.players.map(p => p.team).filter(Boolean));
          setSelectedTeam(currentPlayer.team);
          setIsRoomCreator(currentPlayer.isCreator);
          setIsJoining(false);
        }
      });

      // Listen for join errors
      socket.on('auction:joinError', (errorMsg) => {
        setError(errorMsg);
        setIsJoining(false);
      });

      // Listen for player joins
      socket.on('auction:playerJoined', (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });

      // Listen for team selection updates
      socket.on('auction:teamSelected', ({ playerId, teamId, updatedPlayers }) => {
        setPlayers(updatedPlayers);
        setTakenTeams(prev => [...prev, teamId]);
      });

      // Listen for room updates
      socket.on('auction:roomUpdate', (roomData) => {
        setCurrentRoom(roomData);
        setPlayers(roomData.players);
        setTakenTeams(roomData.players.map(p => p.team).filter(Boolean));
      });

      // Listen for auction start
      socket.on('auction:started', (data) => {
        setShowAuction(true);
      });

      return () => {
        socket.off('auction:created');
        socket.off('auction:joinSuccess');
        socket.off('auction:joinError');
        socket.off('auction:playerJoined');
        socket.off('auction:teamSelected');
        socket.off('auction:roomUpdate');
        socket.off('auction:started');
      };
    }
  }, [socket, user, joinGame]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numberOfPlayers || numberOfPlayers < 2 || numberOfPlayers > 10) {
      return;
    }

    setIsCreating(true);

    try {
      // Generate unique auction ID and room code
      const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const generatedRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const auctionData = {
        auctionName: `Auction Room ${numberOfPlayers} Players`,
        maxPlayers: parseInt(numberOfPlayers),
        budget: 100,
        timePerBid: 30,
        auctionId,
        roomCode: generatedRoomCode,
        createdAt: new Date(),
        createdBy: user.username,
        players: []
      };

      // Emit to socket
      if (socket) {
        socket.emit('auction:create', auctionData);
      }
    } catch (error) {
      console.error('Error creating auction:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) return;

    setIsJoining(true);
    setError('');

    if (socket) {
      socket.emit('auction:join', { roomCode: joinRoomCode.trim().toUpperCase() });
    }
  };

  const handleTeamSelect = (teamId) => {
    if (takenTeams.includes(teamId) || selectedTeam === teamId) return;
    
    setSelectedTeam(teamId);
    if (socket && currentRoom) {
      socket.emit('auction:selectTeam', {
        roomCode: currentRoom.roomCode,
        teamId,
        playerId: socket.id
      });
    }
  };

  const handleStartAuction = () => {
    if (socket && currentRoom && isRoomCreator) {
      socket.emit('auction:start', {
        roomCode: currentRoom.roomCode
      });
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    // You could add a toast notification here
  };

  // If auction has started, show auction interface
  if (showAuction && roomCreated) {
    const teams = players.map(player => {
      const teamInfo = iplTeams.find(team => team.id === player.team);
      return {
        id: player.team,
        name: teamInfo?.name || player.team,
        playerId: player.id,
        playerName: player.username
      };
    });

    return (
      <IPLAuctionInterface
        roomCode={roomCode}
        teams={teams}
        user={user}
        isCreator={isRoomCreator}
      />
    );
  }

  if (!roomCreated) {
    // Initial creation/join form
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* Back button positioned absolutely */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 hover:scale-105 group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </button>

        {/* Main card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 space-y-8">
            {/* Glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-purple-500/50 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
            
            {/* Header */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-2">
                {activeTab === 'create' ? 'Create Auction' : 'Join Auction'}
              </h1>
              <p className="text-white/70 text-sm">
                {activeTab === 'create' ? 'Set up your auction room' : 'Enter room code to join'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-white/20">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-3 text-center ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white font-medium'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-3 text-center ${
                  activeTab === 'join'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-500 text-white font-medium'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Join Room
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="relative bg-red-500/20 border border-red-400/50 rounded-xl p-4">
                <p className="text-red-200 text-center text-sm">{error}</p>
              </div>
            )}

            {/* Create Form */}
            {activeTab === 'create' && (
              <form onSubmit={handleSubmit} className="relative space-y-6">
                {/* Number of Players Input */}
                <div className="space-y-2">
                  <label className="block text-white/90 font-medium text-sm tracking-wide">
                    Number of Players
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={numberOfPlayers}
                      onChange={(e) => setNumberOfPlayers(e.target.value)}
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-lg font-medium placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-300 backdrop-blur-sm"
                      placeholder="Enter number of players"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <p className="text-white/50 text-xs">Choose between 2-10 players</p>
                </div>

                {/* Create Button */}
                <button
                  type="submit"
                  disabled={isCreating || !numberOfPlayers || numberOfPlayers < 2 || numberOfPlayers > 10}
                  className="relative w-full group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-bold text-lg rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100">
                    {isCreating ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Create</span>
                      </div>
                    )}
                  </div>
                </button>
              </form>
            )}

            {/* Join Form */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoinByCode} className="relative space-y-6">
                {/* Room Code Input */}
                <div className="space-y-2">
                  <label className="block text-white/90 font-medium text-sm tracking-wide">
                    Room Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={joinRoomCode}
                      onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-lg font-mono text-center placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 backdrop-blur-sm tracking-wider"
                      placeholder="ENTER ROOM CODE"
                      maxLength={6}
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <p className="text-white/50 text-xs">Ask the room creator for the 6-character code</p>
                </div>

                {/* Join Button */}
                <button
                  type="submit"
                  disabled={isJoining || !joinRoomCode.trim()}
                  className="relative w-full group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-lg rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100">
                    {isJoining ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Joining...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                        </svg>
                        <span>Join Room</span>
                      </div>
                    )}
                  </div>
                </button>
              </form>
            )}

            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full opacity-60 animate-ping"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full opacity-60 animate-ping delay-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Room created - show team selection and players
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Header with room code */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Auction Room Created!</h1>
              <p className="text-white/70">Share the room code with other players</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-white/70 text-sm mb-1">Room Code</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-purple-300 bg-white/10 px-4 py-2 rounded-lg">
                    {roomCode}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    title="Copy room code"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Select Your Team</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {iplTeams.map((team) => {
                  const isTaken = takenTeams.includes(team.id);
                  const isSelected = selectedTeam === team.id;
                  
                  return (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      disabled={isTaken}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 scale-105'
                          : isTaken
                          ? 'border-red-500/50 bg-red-500/10 cursor-not-allowed opacity-50'
                          : 'border-white/20 bg-white/5 hover:border-purple-400 hover:bg-purple-400/10 hover:scale-105'
                      }`}
                    >
                      <div className="aspect-square mb-2 rounded-lg overflow-hidden bg-white p-2">
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-white text-xs font-medium text-center leading-tight">
                        {team.name}
                      </p>
                      {isTaken && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                          <span className="text-red-400 font-bold text-xs">TAKEN</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Players ({players.length}/{currentRoom?.maxPlayers})
              </h2>
              <div className="space-y-3">
                {players.map((player) => {
                  const playerTeam = iplTeams.find(team => team.id === player.team);
                  
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {player.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {player.username}
                          {player.isCreator && (
                            <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                              Creator
                            </span>
                          )}
                        </p>
                        {playerTeam && (
                          <p className="text-white/70 text-sm">{playerTeam.name}</p>
                        )}
                      </div>
                      {playerTeam && (
                        <div className="w-6 h-6 bg-white rounded overflow-hidden">
                          <img
                            src={playerTeam.logo}
                            alt={playerTeam.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Start Auction Button */}
              {!isRoomCreator && (
                <div className="mt-6 p-3 bg-blue-500/20 border border-blue-400/50 rounded-lg">
                  <p className="text-blue-200 text-sm text-center">
                    Waiting for room creator to start the auction...
                  </p>
                </div>
              )}
            </div>
            {/* Single Start Auction Button for Room Creator */}
            {isRoomCreator && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleStartAuction}
                  disabled={players.length < 2 || players.some(p => !p.team)}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🏏 Start IPL Auction
                </button>
                <p className="text-white/70 text-sm mt-2">
                  {players.every(p => p.team) 
                    ? `All teams ready • ${players.length} players joined`
                    : `Waiting for all players to select teams (${players.filter(p => !p.team).length} remaining)`
                  }
                </p>
              </div>
            )}

            {(!players.every(p => p.team) && players.length >= 2) && (
              <div className="mt-6 text-center">
                <p className="text-yellow-400 font-semibold">
                  ⏳ Waiting for all players to select their teams...
                </p>
                <p className="text-white/70 text-sm">
                  {players.filter(p => !p.team).length} players still need to select teams
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAuction;
