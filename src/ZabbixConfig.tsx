import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface ZabbixConfigProps {
  onClose: () => void;
}

export function ZabbixConfig({ onClose }: ZabbixConfigProps) {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const zabbixConfig = useQuery(api.zabbix.getZabbixConfig);
  const saveConfig = useMutation(api.zabbix.saveZabbixConfig);
  const testConnection = useAction(api.zabbix.testZabbixConnection);

  // Pre-fill form with existing config
  useState(() => {
    if (zabbixConfig) {
      setServerUrl(zabbixConfig.serverUrl || "");
      setUsername(zabbixConfig.username || "");
    }
  });

  const handleTestConnection = async () => {
    if (!serverUrl || !username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const result = await testConnection({
        serverUrl: serverUrl.replace(/\/$/, ""), // Remove trailing slash
        username,
        password,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Connection test failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl || !username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await saveConfig({
        serverUrl: serverUrl.replace(/\/$/, ""), // Remove trailing slash
        username,
        password,
      });
      toast.success("Configuration saved successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Zabbix Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server URL
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.148.229/zabbix"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Full URL to your Zabbix server (e.g., http://192.168.148.229/zabbix)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Your Zabbix Server:</strong> Use http://192.168.148.229/zabbix as the server URL for your Zabbix instance.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Connection Issues?</strong> If you get "forbidden" errors:
            </p>
            <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-1">
              <li>Check if Zabbix frontend allows API access</li>
              <li>Verify user has API access permissions</li>
              <li>Ensure firewall allows connections from this app</li>
              <li>Try accessing {serverUrl || 'your-server'}/api_jsonrpc.php directly</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500">
          <p><strong>Example queries to try:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>"What alerts do I have?"</li>
            <li>"Show me the status of all hosts"</li>
            <li>"Are there any critical issues?"</li>
            <li>"What's the health of my servers?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
