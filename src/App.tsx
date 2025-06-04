import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ZabbixChatbot } from "./ZabbixChatbot";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Zabbix AI Assistant</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Authenticated>
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-primary mb-2">Zabbix AI Assistant</h1>
          <p className="text-lg text-secondary">
            Chat with your Zabbix monitoring data using AI
          </p>
        </div>
        <ZabbixChatbot />
      </Authenticated>

      <Unauthenticated>
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary mb-4">Zabbix AI Assistant</h1>
          <p className="text-xl text-secondary mb-8">
            Sign in to start chatting with your Zabbix server
          </p>
        </div>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
