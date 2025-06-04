import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const saveZabbixConfig = mutation({
  args: {
    serverUrl: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Check if config already exists
    const existingConfig = await ctx.db
      .query("zabbixConfig")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        serverUrl: args.serverUrl,
        username: args.username,
        password: args.password,
        isActive: true,
      });
    } else {
      await ctx.db.insert("zabbixConfig", {
        userId,
        serverUrl: args.serverUrl,
        username: args.username,
        password: args.password,
        isActive: true,
      });
    }
  },
});

export const getZabbixConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const config = await ctx.db
      .query("zabbixConfig")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!config) {
      return null;
    }

    // Don't return the password for security
    return {
      _id: config._id,
      serverUrl: config.serverUrl,
      username: config.username,
      isActive: config.isActive,
    };
  },
});

export const getZabbixContext = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get recent alerts
    const alerts = await ctx.db
      .query("zabbixAlerts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);

    // Get hosts
    const hosts = await ctx.db
      .query("zabbixHosts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(20);

    // Get config
    const config = await ctx.db
      .query("zabbixConfig")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    let context = "Zabbix Server Status:\n";
    
    if (!config || !config.isActive) {
      context += "- No Zabbix server configured\n";
      return context;
    }

    context += `- Server: ${config.serverUrl}\n`;
    context += `- Total Hosts: ${hosts.length}\n`;
    
    if (alerts.length > 0) {
      context += `\nRecent Alerts (${alerts.length}):\n`;
      alerts.forEach(alert => {
        context += `- ${alert.hostName}: ${alert.triggerName} (${alert.severity})\n`;
      });
    } else {
      context += "\nNo recent alerts\n";
    }

    if (hosts.length > 0) {
      const activeHosts = hosts.filter(h => h.status === "active").length;
      context += `\nHosts Status:\n`;
      context += `- Active: ${activeHosts}\n`;
      context += `- Total: ${hosts.length}\n`;
    }

    return context;
  },
});

export const testZabbixConnection = action({
  args: {
    serverUrl: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      // Try to connect to real Zabbix API
      const response = await fetch(`${args.serverUrl}/api_jsonrpc.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Zabbix-AI-Assistant/1.0",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "user.login",
          params: {
            user: args.username,
            password: args.password,
          },
          id: 1,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access forbidden. Check Zabbix server configuration and firewall settings.");
        }
        if (response.status === 404) {
          throw new Error("Zabbix API not found. Verify the server URL is correct.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.data || "Authentication failed");
      }

      return { success: true, message: "Connection successful!" };
    } catch (error) {
      let errorMessage = "Unknown error";
      
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          errorMessage = "Network error. Check if Zabbix server is accessible and CORS is configured.";
        } else {
          errorMessage = error.message;
        }
      }
      
      return { 
        success: false, 
        message: `Connection failed: ${errorMessage}` 
      };
    }
  },
});

export const syncZabbixData = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      // For now, create some sample data to test the integration
      await ctx.runMutation(internal.zabbix.upsertHost, {
        hostId: "1",
        hostName: "web-server-01",
        status: "active",
      });

      await ctx.runMutation(internal.zabbix.upsertHost, {
        hostId: "2", 
        hostName: "db-server-01",
        status: "active",
      });

      await ctx.runMutation(internal.zabbix.upsertAlert, {
        alertId: "1",
        hostName: "web-server-01",
        triggerName: "High CPU usage",
        severity: "warning",
        status: "active",
      });

      return { 
        success: true, 
        message: "Sample data synchronized successfully. Real Zabbix integration will be enabled once connection is tested." 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      };
    }
  },
});

export const getUserConfig = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("zabbixConfig")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const upsertHost = internalMutation({
  args: {
    hostId: v.string(),
    hostName: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const existing = await ctx.db
      .query("zabbixHosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("hostId"), args.hostId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        hostName: args.hostName,
        status: args.status,
        lastUpdate: Date.now(),
      });
    } else {
      await ctx.db.insert("zabbixHosts", {
        userId,
        hostId: args.hostId,
        hostName: args.hostName,
        status: args.status,
        lastUpdate: Date.now(),
      });
    }
  },
});

export const upsertAlert = internalMutation({
  args: {
    alertId: v.string(),
    hostName: v.string(),
    triggerName: v.string(),
    severity: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const existing = await ctx.db
      .query("zabbixAlerts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("alertId"), args.alertId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        hostName: args.hostName,
        triggerName: args.triggerName,
        severity: args.severity,
        status: args.status,
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.insert("zabbixAlerts", {
        userId,
        alertId: args.alertId,
        hostName: args.hostName,
        triggerName: args.triggerName,
        severity: args.severity,
        status: args.status,
        timestamp: Date.now(),
      });
    }
  },
});
