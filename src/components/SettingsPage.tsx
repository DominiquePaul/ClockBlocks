import { useState } from "react";
import { Trash2, PlusCircle } from "lucide-react";
import { TimeBox } from "../types";
import { renameTimeBox, addTimeBox, deleteTimeBox } from "../dbInteraction";

function SettingsPage({ timeBoxes, setBoxes }: { timeBoxes: TimeBox[]; setBoxes: React.Dispatch<React.SetStateAction<TimeBox[]>> }) {
    const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  
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
  
    const handleDelete = async (id: string) => {
      try {
        await deleteTimeBox(id);
        setBoxes(prevBoxes => prevBoxes.filter(box => box.id !== id));
      } catch (error) {
        console.error('Error deleting TimeBox:', error);
        // Optionally, add user feedback here
      }
    };
  
    const handleAdd = async (name: string) => {
      let newId = await addTimeBox(name);
      setBoxes(prevBoxes => [...prevBoxes, { id: newId, name: name, seconds: 0, isActive: false, isDeleted: false }]);
    };
  
    return (
      <div className="flex flex-col items-center p-4 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        
        <div className="w-full max-w-md mb-6">
          <label htmlFor="googleSheetsUrl" className="block mb-2">Google Sheets URL:</label>
          <input
            id="googleSheetsUrl"
            type="url"
            value={googleSheetsUrl}
            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter Google Sheets URL"
          />
        </div>
  
        <h3 className="text-lg font-semibold mb-2">Time Buckets</h3>
        {timeBoxes.map(timeBox => (
          <div key={timeBox.id} className="flex items-center mb-2 w-full max-w-md">
            <input
              value={timeBox.name}
              onChange={(e) => handleRename(timeBox.id, e.target.value)}
              className="flex-grow p-2 border rounded mr-2"
            />
            <button onClick={() => handleDelete(timeBox.id)} className="p-2 bg-red-500 text-white rounded">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button onClick={() => handleAdd("New Time Block")} className="mt-2 p-2 bg-green-500 text-white rounded flex items-center">
          <PlusCircle size={16} className="mr-1" /> Add New Bucket
        </button>
      </div>
    );
  }
  
export default SettingsPage;