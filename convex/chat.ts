import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const sendMessage = mutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Store user message
    const messageId = await ctx.db.insert("chatMessages", {
      userId,
      message: args.message,
      response: "",
      timestamp: Date.now(),
      isFromUser: true,
    });

    // Schedule AI response generation
    await ctx.scheduler.runAfter(0, internal.chat.generateAIResponse, {
      userId,
      userMessage: args.message,
      messageId,
    });

    return messageId;
  },
});

export const getChatHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return messages.reverse();
  },
});

export const generateAIResponse = internalAction({
  args: {
    userId: v.id("users"),
    userMessage: v.string(),
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    try {
      // Get Zabbix data context
      const zabbixContext = await ctx.runQuery(internal.zabbix.getZabbixContext, {
        userId: args.userId,
      });

      // Generate AI response
      const aiResponse = await ctx.runAction(internal.chat.callOpenAI, {
        userMessage: args.userMessage,
        zabbixContext,
      });

      // Store AI response
      await ctx.runMutation(internal.chat.storeAIResponse, {
        messageId: args.messageId,
        response: aiResponse,
        userId: args.userId,
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      await ctx.runMutation(internal.chat.storeAIResponse, {
        messageId: args.messageId,
        response: "I'm sorry, I encountered an error while processing your request. Please try again.",
        userId: args.userId,
      });
    }
  },
});

export const callOpenAI = internalAction({
  args: {
    userMessage: v.string(),
    zabbixContext: v.string(),
  },
  handler: async (_ctx, args) => {
    const openaiApiKey = process.env.CONVEX_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openaiBaseUrl = process.env.CONVEX_OPENAI_BASE_URL;

    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch(
      openaiBaseUrl ? `${openaiBaseUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [
            {
              role: "system",
              content: `You are a helpful Zabbix monitoring assistant. You help users understand their Zabbix server data, alerts, and monitoring status. 
              
              Current Zabbix context:
              ${args.zabbixContext}
              
              Provide helpful, accurate responses about Zabbix monitoring data. If you don't have specific data, explain what information would be helpful and how to configure Zabbix integration.`,
            },
            {
              role: "user",
              content: args.userMessage,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  },
});

export const storeAIResponse = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    response: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Update the original message with the response
    await ctx.db.patch(args.messageId, {
      response: args.response,
    });

    // Also create a separate AI message entry
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      message: args.response,
      response: "",
      timestamp: Date.now(),
      isFromUser: false,
    });
  },
});
