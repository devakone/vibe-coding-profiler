"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Link2, Share2, Download } from "lucide-react";
import { SHARE_FORMATS, downloadSharePng, downloadShareSvg, downloadBlob } from "./share-image";
import type { ShareActionsProps, ShareFormat } from "./types";

// Brand icons (Lucide doesn't include these)
const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const RedditIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/**
 * ShareActions - Reusable share action bar with copy, download, and social buttons
 */
export function ShareActions({
  shareUrl,
  shareText,
  shareCaption,
  shareHeadline,
  shareTemplate,
  entityId,
  disabled = false,
  storyEndpoint,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>("og");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const [storyDownloading, setStoryDownloading] = useState(false);

  useEffect(() => {
    setSupportsNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const openSharePopup = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=800,height=600");
  };

  const handleShareTwitter = () => {
    if (!shareUrl) return;
    const u = new URL("https://twitter.com/intent/tweet");
    u.searchParams.set("text", shareCaption);
    u.searchParams.set("url", shareUrl);
    openSharePopup(u.toString());
  };

  const handleShareFacebook = () => {
    if (!shareUrl) return;
    const u = new URL("https://www.facebook.com/sharer/sharer.php");
    u.searchParams.set("u", shareUrl);
    if (shareCaption) u.searchParams.set("quote", shareCaption);
    openSharePopup(u.toString());
  };

  const handleShareLinkedIn = () => {
    if (!shareUrl) return;
    const u = new URL("https://www.linkedin.com/sharing/share-offsite/");
    u.searchParams.set("url", shareUrl);
    openSharePopup(u.toString());
  };

  const handleShareReddit = () => {
    if (!shareUrl) return;
    const u = new URL("https://www.reddit.com/submit");
    u.searchParams.set("url", shareUrl);
    if (shareHeadline) u.searchParams.set("title", shareHeadline);
    openSharePopup(u.toString());
  };

  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const u = new URL("https://wa.me/");
    u.searchParams.set("text", `${shareCaption}\n${shareUrl}`.trim());
    openSharePopup(u.toString());
  };

  const handleNativeShare = async () => {
    if (!shareUrl || !shareHeadline) return;
    if (!("share" in navigator)) return;
    try {
      await navigator.share({
        title: shareHeadline,
        text: shareCaption,
        url: shareUrl,
      });
    } catch {
      // User cancelled or share failed silently
    }
  };

  const handleDownloadPng = async () => {
    if (!shareTemplate) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadSharePng(shareTemplate, shareFormat, entityId);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "download_failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!shareTemplate) return;
    setDownloadError(null);
    downloadShareSvg(shareTemplate, shareFormat, entityId);
  };

  const handleDownloadStory = async () => {
    if (!storyEndpoint) return;
    setDownloadError(null);
    setStoryDownloading(true);
    try {
      const res = await fetch(storyEndpoint, { cache: "no-store" });
      if (!res.ok) throw new Error("story_failed");
      const blob = await res.blob();
      downloadBlob(blob, `${entityId}-story.png`);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "story_download_failed");
    } finally {
      setStoryDownloading(false);
    }
  };

  const isDisabled = disabled || !shareUrl;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Download Section */}
        {shareTemplate ? (
          <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white p-1">
            <select
              className="h-7 rounded border-0 bg-transparent px-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-0"
              value={shareFormat}
              onChange={(e) => setShareFormat(e.target.value as ShareFormat)}
            >
              {Object.entries(SHARE_FORMATS).map(([key, f]) => (
                <option key={key} value={key}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleDownloadPng}
              disabled={downloading}
              title="Download PNG"
            >
              <Download size={14} />
              PNG
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
              onClick={handleDownloadSvg}
              title="Download SVG"
            >
              <Download size={14} />
              SVG
            </button>
            {storyEndpoint ? (
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleDownloadStory}
                disabled={storyDownloading}
                title="Download Story"
              >
                <Download size={14} />
                Story
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Copy Section */}
        <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white p-1">
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            onClick={handleCopyText}
            title="Copy share text"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            Text
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleCopyLink}
            disabled={isDisabled}
            title="Copy link"
          >
            {copiedLink ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
            Link
          </button>
        </div>

        {/* Social Share Section */}
        <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white p-1">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleShareTwitter}
            disabled={isDisabled}
            title="Share on X"
          >
            <XIcon size={14} />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleShareLinkedIn}
            disabled={isDisabled}
            title="Share on LinkedIn"
          >
            <LinkedInIcon size={14} />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleShareFacebook}
            disabled={isDisabled}
            title="Share on Facebook"
          >
            <FacebookIcon size={14} />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleShareReddit}
            disabled={isDisabled}
            title="Share on Reddit"
          >
            <RedditIcon size={14} />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleShareWhatsApp}
            disabled={isDisabled}
            title="Share on WhatsApp"
          >
            <WhatsAppIcon size={14} />
          </button>
        </div>

        {/* Native Share Button */}
        {supportsNativeShare ? (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleNativeShare}
            disabled={isDisabled}
          >
            <Share2 size={14} />
            Share
          </button>
        ) : null}
      </div>

      {/* Download Error */}
      {downloadError ? (
        <p className="text-xs text-red-600">Download failed: {downloadError}</p>
      ) : null}
    </div>
  );
}
