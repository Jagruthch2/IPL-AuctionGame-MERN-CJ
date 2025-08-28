import { useSocket } from '../contexts/SocketContext';

const ConnectionStatus = () => {
  const { isConnected, playersCount } = useSocket();

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg shadow-lg backdrop-blur-lg border ${
        isConnected 
          ? 'bg-green-500/90 border-green-400 text-white' 
          : 'bg-red-500/90 border-red-400 text-white'
      } transition-all duration-300`}>
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-200 animate-pulse' : 'bg-red-200'
          }`}></div>
          <span className="font-medium text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Players Count */}
        {isConnected && (
          <>
            <div className="w-px h-4 bg-white/30"></div>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              <span className="font-medium text-sm">{playersCount}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
