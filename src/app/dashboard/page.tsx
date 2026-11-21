import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl rounded-xl border bg-white p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to Mailops, {session.user.name}
        </h1>

        <p className="mt-2 text-gray-500">
          You are successfully authenticated.
        </p>

        <div className="mt-8 rounded-lg bg-gray-50 p-5">
          <h2 className="font-semibold">Authenticated User</h2>

          <p className="mt-3 text-sm">
            <strong>User ID:</strong> {session.user.id}
          </p>

          <p className="mt-2 text-sm">
            <strong>Email:</strong> {session.user.email}
          </p>

          <p className="mt-2 text-sm">
            <strong>Verified:</strong>{" "}
            {session.user.emailVerified ? "Yes" : "No"}
          </p>
        </div>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}