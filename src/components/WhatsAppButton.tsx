"use client";

import { usePathname } from "next/navigation";

/**
 * Floating "chat on WhatsApp" button. Icon-only on phones so it doesn't cover
 * form fields, and hidden on checkout and payment pages where the customer is
 * mid-task (those pages have their own WhatsApp link in context).
 */
export function WhatsAppButton({ number }: { number: string }) {
  const path = usePathname();
  if (!number || path.startsWith("/checkout") || path.startsWith("/order")) return null;
  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent("Hi, I have a question about dry fruits")}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-[#1F8F4E] text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#187A42] sm:h-auto sm:w-auto sm:px-5 sm:py-3"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
