"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProfileView } from "@/components/ProfileView";

function ProfileFromQuery() {
  const params = useSearchParams();
  const uid = params.get("id");
  return <ProfileView uid={uid} />;
}

export default function SharedProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-sapphire" />
        </div>
      }
    >
      <ProfileFromQuery />
    </Suspense>
  );
}
