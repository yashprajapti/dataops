import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="bg-grid mask-radial pointer-events-none fixed inset-0 opacity-50" />
      <div className="relative text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <div className="text-grad mt-6 text-8xl font-semibold tracking-tighter">404</div>
        <p className="mt-3 text-mute">This query returned zero rows.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-ghost">Home</Link>
          <Link href="/dashboard" className="btn-primary">Go to workspace</Link>
        </div>
      </div>
    </main>
  );
}
