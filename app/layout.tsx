import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'BridgeHaul | Task Desk', description:'Your team’s work, on track. Recurring duties and operational accountability.',icons:{icon:'/favicon.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
