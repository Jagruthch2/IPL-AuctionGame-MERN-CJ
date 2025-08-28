import { useSocket } from '../contexts/SocketContext';

const NotificationList = () => {
  const { notifications, clearNotifications } = useSocket();

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'auction':
        return 'bg-yellow-500 border-yellow-600';
      case 'info':
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'auction':
        return '💰';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyle(notification.type)} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 animate-slideIn`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      ))}
      {notifications.length > 3 && (
        <button
          onClick={clearNotifications}
          className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors duration-200"
        >
          Clear All
        </button>
      )}
    </div>
  );
};

export default NotificationList;
