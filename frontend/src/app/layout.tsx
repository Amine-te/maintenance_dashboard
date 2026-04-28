import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ChatbotWidget from '@/components/ChatbotWidget';

export const metadata: Metadata = {
  title: 'Predictive Maintenance Dashboard',
  description: 'Monitor, analyze, and predict equipment health',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            {children}
          </main>
          <ChatbotWidget />
        </div>
      </body>
    </html>
  );
}
