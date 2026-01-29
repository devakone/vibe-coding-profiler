"use client";

import { useEffect, useState } from "react";
import { OAUTH_CONFIG, OAuthProvider } from "@/lib/platforms/oauth";
import { Loader2, Trash2, Github, Gitlab } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Bitbucket icon fallback
const BitbucketIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M2.65 3C2.3 3 2 3.3 2 3.65v.1L3.6 18.6c.1.7.7 1.25 1.45 1.25h13.9c.75 0 1.35-.55 1.45-1.25L22 3.75c0-.05 0-.1-.05-.15-.05-.35-.35-.6-.7-.6H2.65zM12 13.5l-2-2h4l-2 2z" />
  </svg>
);

type PlatformConnection = {
  platform: OAuthProvider;
  platform_username: string | null;
  platform_avatar_url: string | null;
  is_primary: boolean;
  created_at: string;
};

export function PlatformConnections() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch("/api/platforms");
      if (res.ok) {
        const data = await res.json();
        // Ensure platform is treated as OAuthProvider
        setConnections(data.platforms as PlatformConnection[]);
      }
    } catch (error) {
      console.error("Failed to fetch connections", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect(provider: OAuthProvider) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/${provider}/callback`,
        scopes: OAUTH_CONFIG[provider].scopes,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error.message,
      });
    }
  }

  async function handleDisconnect(platform: string) {
    if (!confirm("Are you sure you want to disconnect this platform? You will lose access to its repositories.")) return;
    
    setProcessing(platform);
    try {
      const res = await fetch(`/api/platforms/${platform}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.platform !== platform));
        toast({ title: "Disconnected successfully" });
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Failed to disconnect",
          description: data.error,
        });
      }
    } catch {
       toast({
          variant: "destructive",
          title: "Failed to disconnect",
          description: "An unexpected error occurred",
        });
    } finally {
      setProcessing(null);
    }
  }

  async function handleSetPrimary(platform: string) {
    setProcessing(platform);
    try {
      const res = await fetch(`/api/platforms/${platform}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: true }),
      });

      if (res.ok) {
        setConnections((prev) =>
          prev.map((c) => ({
            ...c,
            is_primary: c.platform === platform,
          }))
        );
        toast({ title: "Primary platform updated" });
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Failed to update primary",
          description: data.error,
        });
      }
    } catch {
       toast({
          variant: "destructive",
          title: "Failed to update primary",
          description: "An unexpected error occurred",
        });
    } finally {
      setProcessing(null);
    }
  }

  const getIcon = (platform: string) => {
    switch (platform) {
      case "github": return <Github className="h-5 w-5" />;
      case "gitlab": return <Gitlab className="h-5 w-5" />;
      case "bitbucket": return <BitbucketIcon className="h-5 w-5" />;
      default: return null;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const connectedPlatforms = new Set(connections.map(c => c.platform));

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="font-semibold leading-none tracking-tight">Connected Platforms</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connections to code hosting platforms.
        </p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        {/* Connected List */}
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.platform} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                {getIcon(conn.platform)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{OAUTH_CONFIG[conn.platform]?.label || conn.platform}</span>
                    {conn.is_primary && (
                      <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {conn.platform_username || "Connected"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!conn.is_primary && (
                  <button 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    onClick={() => handleSetPrimary(conn.platform)}
                    disabled={!!processing}
                  >
                    Set Primary
                  </button>
                )}
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDisconnect(conn.platform)}
                  disabled={!!processing || (connections.length === 1)}
                  title={connections.length === 1 ? "Cannot disconnect last platform" : "Disconnect"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Connection */}
        <div className="pt-4">
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">Add Connection</h4>
          <div className="flex flex-wrap gap-2">
            {!connectedPlatforms.has("github") && (
              <button 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                onClick={() => handleConnect("github")} 
                disabled={!!processing}
              >
                <Github className="mr-2 h-4 w-4" /> Connect GitHub
              </button>
            )}
            {!connectedPlatforms.has("gitlab") && (
              <button 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                onClick={() => handleConnect("gitlab")} 
                disabled={!!processing}
              >
                <Gitlab className="mr-2 h-4 w-4" /> Connect GitLab
              </button>
            )}
            {!connectedPlatforms.has("bitbucket") && (
              <button 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                onClick={() => handleConnect("bitbucket")} 
                disabled={!!processing}
              >
                <BitbucketIcon className="mr-2 h-4 w-4" /> Connect Bitbucket
              </button>
            )}
            {["github", "gitlab", "bitbucket"].every(p => connectedPlatforms.has(p as OAuthProvider)) && (
                <p className="text-sm text-muted-foreground">All supported platforms connected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
