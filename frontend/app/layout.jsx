import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { QueryProvider } from '@/lib/query-provider'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata = {
  title: 'MediKeep — Medical Dashboard',
  description: 'Healthcare management platform for doctors and patients',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
