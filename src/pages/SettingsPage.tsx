import React, { useState, useEffect } from 'react';
import { Trash2, PlusCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { TimeBox } from "../lib/types";
import { renameTimeBox, addTimeBox, deleteTimeBox, toggleVisibilityTimeBox, changeTimeBoxColor } from "../lib/dbInteraction";
import { ask } from '@tauri-apps/api/dialog';
import GoogleSignInButton from '../components/GoogleSignIn';
import { invoke } from '@tauri-apps/api/tauri'
import PrimaryButton from '../components/PrimaryButton';
import { ExternalLink, Palette } from 'lucide-react';
import IconButton from '../components/IconButton'; // Add this import

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
  handleGoogleSignIn: () => Promise<boolean>;
  handleSyncData: () => Promise<string | undefined>;
}) {

    const [sheetURL, setSheetURL] = useState<string | undefined>(undefined);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

    console.log(timeBoxes);

    const colours = ['#77C8FF', '#FAFF07', '#FF6E3D', '#F448ED', '#6EEB4E', '#F42E2D', '#9747FF', '#FFA500'];

    useEffect(() => {
      getSheetURL().then(setSheetURL);
    }, []);

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
      setBoxes(prevBoxes => [...prevBoxes, { id: newId, name: name, seconds: 0, isActive: false, isHidden: false, isDeleted: false, colour: '#77C8FF' }]);
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

    const handleChangeColor = async (id: string, color: string) => {
      try {
        await changeTimeBoxColor(id, color);
        setBoxes(prevBoxes =>
          prevBoxes.map(box =>
            box.id === id ? { ...box, colour: color } : box
          )
        );
        setActiveColorPicker(null);
      } catch (error) {
        console.error('Error changing TimeBox color:', error);
      }
    };

    async function getSheetURL(): Promise<string | undefined> {
      try {
        const sheetId = await invoke('get_sheet_id')
        if (sheetId) {
          return `https://docs.google.com/spreadsheets/d/${sheetId}`
        } else {
          return undefined
        }
      } catch (error) {
        console.error('Error getting sheet ID:', error)
        return undefined
      }
    }

    const handleSync = async () => {
      setIsSyncing(true);
      try {
        await handleSyncData();
        // Update sheetURL after successful sync
        const updatedSheetURL = await getSheetURL();
        setSheetURL(updatedSheetURL);
      } finally {
        setIsSyncing(false);
      }
    };

    return (
      <div className="flex flex-col lg:flex-row items-stretch p- overflow-auto gap-3 h-full">
        <div className="flex-1 flex flex-col items-center justify-start bg-black rounded-lg p-8 lg:max-w-[400px] min-w-[400px]">
          {/* <h3 className="text-lg font-semibold text-white pb-4">Blocks</h3> */}
          <div className="w-full overflow-y-auto pb-4">
            <div className="flex flex-col pb-8">
                  <p className="text-[rgba(217,217,217,0.30)] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">
                  Settings
                  </p>
                  <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-[28px] font-normal leading-normal">
                      Time Blocks
                  </p>
              </div>
              {/* ${timeBox.colour} 4D4D4D */}
            {timeBoxes.filter(box => !box.isDeleted).map(timeBox => (
              
              <div key={timeBox.id} className="flex items-center pb-2 w-full gap-2">
                <div 
                  className={`flex h-10 gap-2 flex-1 self-stretch p-2 rounded-lg border backdrop-blur-sm`}
                  style={{ borderColor: timeBox.colour }}
                >
                  <input
                    value={timeBox.name}
                    onChange={(e) => handleRename(timeBox.id, e.target.value)}
                    className="flex-grow p-2 text-white font-inter font-normal leading-normal bg-transparent focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <IconButton
                    onClick={() => setActiveColorPicker(activeColorPicker === timeBox.id ? null : timeBox.id)}
                    icon={<Palette size={16} className="text-white" />}
                  />
                  {activeColorPicker === timeBox.id && (
                    <div className="fixed z-50">
                      <div className="absolute top-full mt-1 p-2 bg-[#232323] rounded-lg shadow-lg transform -translate-x-[42px]" style={{ width: '120px' }}>
                        <div className="grid grid-cols-4 gap-2">
                          {colours.map((colour) => (
                            <button
                              key={colour}
                              className="w-6 h-6 rounded-md"
                              style={{ backgroundColor: colour }}
                              onClick={() => handleChangeColor(timeBox.id, colour)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <IconButton
                  onClick={() => handleToggleVisibility(timeBox.id, timeBox.isHidden)}
                  icon={timeBox.isHidden ? <EyeOff size={16} className="text-white" /> : <Eye size={16} className="text-white" />}
                />
                <IconButton
                  onClick={() => handleDelete(timeBox.id, timeBox.name)}
                  icon={<Trash2 size={16} className="text-white" />}
                />
              </div>
            ))}
          </div>
          <PrimaryButton isActive={true} onClick={() => handleAdd("New Time Block")} icon={<PlusCircle size={16} />} isClickable={true}>
            Add Bucket
          </PrimaryButton>
        </div>

        <div className="flex-[2] flex flex-col items-center justify-center bg-black rounded-lg p-4 py-8 gap-2 min-w-[300px]">
          <svg width="25px" height="25px" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
            <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/>
            <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/>
            <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/>
            <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/>
          </svg>
          <div className="flex flex-col items-center gap-6 w-full">
            <h4 className="text-m font-semibold text-white text-center">Google Sheets Integration</h4>
            {!isAuthenticated ? (
              <div className="flex justify-center w-full">
                <GoogleSignInButton 
                  onClick={async () => {
                    const success = await handleGoogleSignIn();
                    if (success) {
                      await handleSyncData();
                    }
                  }}
                  text="Sign in with Google"
                />
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center gap-8 w-full">
                {sheetURL ? (
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <PrimaryButton
                        isActive={true}
                        onClick={() => window.open(sheetURL, '_blank')}
                        icon={<ExternalLink size={16} />}
                        isClickable={true}
                      >
                        Open Sheet
                      </PrimaryButton>
                      <PrimaryButton
                        isActive={true}
                        onClick={handleSync}
                        icon={<RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />}
                        isClickable={true}
                      >
                        Sync Data
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-white text-center">No sync yet, press button to initiate.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
}

export default SettingsPage;