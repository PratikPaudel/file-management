'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FilePickerHeader() {
  const [showPopup, setShowPopup] = useState(false);

  const handleAddAccount = () => {
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000); // Auto hide after 3 seconds
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {/* Stack AI Logo */}
          <Image
            src="/assets/google-drive.png"
            alt="Stack AI Logo"
            width={24}
            height={24}
            className="object-contain"
          />
          
          {/* Title, Badge, and Email */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-medium text-gray-900">Google Drive</h1>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">stackaitest@gmail.com</div>
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Add Account Button */}
          <Button variant="outline" size="sm" className="text-sm" onClick={handleAddAccount}>
            <Plus className="w-4 h-4 mr-2" />
            Add account
          </Button>
        </div>
      </div>

      {/* Popup for Add Account */}
      {showPopup && (
        <div className="absolute top-full right-6 mt-2 z-50">
          <Alert className="w-80 bg-white border shadow-lg">
            <AlertDescription>
              Sorry, this feature is not yet implemented. Thanks for checking though! 😊
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
} 