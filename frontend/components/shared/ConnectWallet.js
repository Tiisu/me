'use client';

import { useContext } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EcoConnectContext } from '@/context/EcoConnect';

export default function ConnectWallet({ onSuccess, className }) {
  const { connectWallet, currentAccount, loading } = useContext(EcoConnectContext);

  const handleConnect = async () => {
    try {
      await connectWallet();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  if (currentAccount) {
    return (
      <Button
        variant="outline"
        className={className}
        disabled
      >
        {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" />
          Connecting...
        </>
      ) : (
        'Connect Wallet'
      )}
    </Button>
  );
}
