'use client';

import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';

export default function Navbar() {
  const { userType, account } = useWeb3();

  return (
    <nav className="bg-green-600 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-xl font-bold">
          EcoConnect
        </Link>
        
        <div className="flex items-center space-x-4">
          {userType === 'user' && (
            <Link href="/user" className="text-white hover:text-green-200">
              My Dashboard
            </Link>
          )}
          
          {userType === 'agent' && (
            <Link href="/agent" className="text-white hover:text-green-200">
              Agent Dashboard
            </Link>
          )}
          
          {userType === 'admin' && (
            <Link href="/admin" className="text-white hover:text-green-200">
              Admin Dashboard
            </Link>
          )}
          
          {account && (
            <span className="text-white">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
