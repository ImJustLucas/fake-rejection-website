// src/app.tsx
import { AdminPage } from './components/admin/admin-page';
import { DateExperience } from './date-experience';

export default function App() {
  const isAdmin = new URLSearchParams(window.location.search).has('admin');
  if (isAdmin) {
    return (
      <main className="min-h-screen w-full flex items-start justify-center p-4 bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
        <AdminPage />
      </main>
    );
  }
  return <DateExperience />;
}
