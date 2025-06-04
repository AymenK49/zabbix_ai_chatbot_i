import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  chatMessages: defineTable({
    userId: v.id("users"),
    message: v.string(),
    response: v.string(),
    timestamp: v.number(),
    isFromUser: v.boolean(),
  }).index("by_user", ["userId"]),
  
  zabbixConfig: defineTable({
    userId: v.id("users"),
    serverUrl: v.string(),
    username: v.string(),
    password: v.string(), // In production, this should be encrypted
    isActive: v.boolean(),
  }).index("by_user", ["userId"]),
  
  zabbixHosts: defineTable({
    userId: v.id("users"),
    hostId: v.string(),
    hostName: v.string(),
    status: v.string(),
    lastUpdate: v.number(),
  }).index("by_user", ["userId"]),
  
  zabbixAlerts: defineTable({
    userId: v.id("users"),
    alertId: v.string(),
    hostName: v.string(),
    triggerName: v.string(),
    severity: v.string(),
    status: v.string(),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_severity", ["severity"])
    .index("by_status", ["status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
