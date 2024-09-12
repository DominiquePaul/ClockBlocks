import React from 'react';
import { Trash2, PlusCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { TimeBox } from "../types";
import { renameTimeBox, addTimeBox, deleteTimeBox, toggleVisibilityTimeBox } from "../dbInteraction";
import { ask } from '@tauri-apps/api/dialog';
import GoogleSignInButton from './GoogleSignIn';

function SettingsPage({ 
  timeBoxes, 
  setBoxes, 
  isAuthenticated, 
  handleGoogleSignIn,
  handleSyncData
}: { 
  timeBoxes: TimeBox[]; 
  setBoxes: React.Dispatch<React.SetStateAction<TimeBox[]>>;
  isAuthenticated: boolean;
  handleGoogleSignIn: () => Promise<void>;
  handleSyncData: () => Promise<void>;
}) {

    const handleRename = async (id: string, newName: string) => {
      try {
        await renameTimeBox(id, newName);
        setBoxes(prevBoxes =>
          prevBoxes.map(box =>
            box.id === id ? { ...box, name: newName } : box
          )
        );
      } catch (error) {
        console.error('Error renaming TimeBox:', error);
        // Optionally, you could add some user feedback here
      }
    };
  
    const handleDelete = async (id: string, name: string) => {
      const confirmed = await ask(`Are you sure you want to delete "${name}"?`, {
        title: 'Confirm Deletion',
        type: 'warning',
      });

      if (confirmed) {
        try {
          await deleteTimeBox(id);
          setBoxes(prevBoxes => prevBoxes.map(box => box.id === id ? { ...box, isDeleted: true } : box));
        } catch (error) {
          console.error('Error deleting TimeBox:', error);
          // Optionally, add user feedback here
        }
      }
    };
  
    const handleAdd = async (name: string) => {
      let newId = await addTimeBox(name);
      setBoxes(prevBoxes => [...prevBoxes, { id: newId, name: name, seconds: 0, isActive: false, isHidden: false, isDeleted: false }]);
    };
  
    const handleToggleVisibility = async (id: string, currentVisibility: boolean) => {
      try {
        await toggleVisibilityTimeBox(id, !currentVisibility);
        setBoxes(prevBoxes =>
          prevBoxes.map(box =>
            box.id === id ? { ...box, isHidden: !currentVisibility } : box
          )
        );
      } catch (error) {
        console.error('Error toggling TimeBox visibility:', error);
        // Optionally, add user feedback here
      }
    };

    return (
      <div className="flex flex-col items-center p-4 overflow-auto">
  
        <h3 className="text-lg font-semibold mb-2">Time Buckets</h3>
        {timeBoxes.filter(box => !box.isDeleted).map(timeBox => (
          <div key={timeBox.id} className="flex items-center mb-2 w-full max-w-md">
            <input
              value={timeBox.name}
              onChange={(e) => handleRename(timeBox.id, e.target.value)}
              className="flex-grow p-2 border rounded mr-2"
            />
            <button 
              onClick={() => handleToggleVisibility(timeBox.id, timeBox.isHidden)} 
              className="p-2 bg-blue-500 text-white rounded mr-2"
              title={timeBox.isHidden ? "Show" : "Hide"}
            >
              {timeBox.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button onClick={() => handleDelete(timeBox.id, timeBox.name)} className="p-2 bg-red-500 text-white rounded">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button onClick={() => handleAdd("New Time Block")} className="mt-2 p-2 bg-green-500 text-white rounded flex items-center">
          <PlusCircle size={16} className="mr-1" /> Add New Bucket
        </button>


        <h2 className="text-xl font-bold mb-4 mt-8">Google Sheets Integration</h2>
        
        {!isAuthenticated ? (
          <GoogleSignInButton 
            onClick={handleGoogleSignIn} 
            text="Sign in with Google"
          />
        ) : (
          <div className="flex flex-col items-center">
            <p className="mb-4">Connected to Google Sheets</p>
            <button
              onClick={handleSyncData}
              className="p-2 bg-green-500 text-white rounded flex items-center"
            >
              <RefreshCw size={16} className="mr-2" /> Sync Data
            </button>
          </div>
        )}
      
        
      </div>
    );
}

export default SettingsPage;