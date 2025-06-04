import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { ZabbixConfig } from "./ZabbixConfig";

export function ZabbixChatbot() {
  const [message, setMessage] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatHistory = useQuery(api.chat.getChatHistory);
  const zabbixConfig = useQuery(api.zabbix.getZabbixConfig);
  const sendMessage = useMutation(api.chat.sendMessage);
  const syncData = useAction(api.zabbix.syncZabbixData);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage({ message: message.trim() });
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSyncData = async () => {
    try {
      await syncData();
    } catch (error) {
      console.error("Error syncing data:", error);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${zabbixConfig?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {zabbixConfig?.isActive ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <div className="flex gap-2">
          {zabbixConfig?.isActive && (
            <button
              onClick={handleSyncData}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Sync Data
            </button>
          )}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Configure
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!zabbixConfig?.isActive && (
          <div className="text-center py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">
                Please configure your Zabbix server connection to start chatting.
              </p>
              <button
                onClick={() => setIsConfigOpen(true)}
                className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              >
                Configure Now
              </button>
            </div>
          </div>
        )}

        {chatHistory?.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.isFromUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.message}</p>
              <span className="text-xs opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              zabbixConfig?.isActive 
                ? "Ask about your Zabbix server..." 
                : "Configure Zabbix connection first..."
            }
            disabled={!zabbixConfig?.isActive}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!message.trim() || !zabbixConfig?.isActive}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Try asking: "What alerts do I have?", "Show me host status", "What's the current system health?"
        </div>
      </form>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <ZabbixConfig onClose={() => setIsConfigOpen(false)} />
      )}
    </div>
  );
}
