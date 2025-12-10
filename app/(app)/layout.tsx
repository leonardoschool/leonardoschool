export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO: Add sidebar/header */}
      <main className="py-10">
        {children}
      </main>
    </div>
  );
}
