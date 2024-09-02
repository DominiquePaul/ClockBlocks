import { useState } from "react";
import { Trash2, PlusCircle } from "lucide-react";

interface Box {
  id: number; // This can be the display ID
  uniqueId: string; // Add this line for a unique identifier
  name: string;
  time: number;
  isActive: boolean;
}

function SettingsPage({ boxes, setBoxes }: { boxes: Box[]; setBoxes: React.Dispatch<React.SetStateAction<Box[]>> }) {
    const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  
    const handleRename = (id: number, newName: string) => {
      setBoxes(prevBoxes =>
        prevBoxes.map(box =>
          box.id === id ? { ...box, name: newName } : box
        )
      );
    };
  
    const handleDelete = (id: number) => {
      setBoxes(prevBoxes => prevBoxes.filter(box => box.id !== id));
    };
  
    const handleAdd = () => {
      const newId = Math.max(...boxes.map(box => box.id)) + 1;
      setBoxes(prevBoxes => [...prevBoxes, { id: newId, name: "New Bucket", time: 0, isActive: false }]);
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
        {boxes.map(box => (
          <div key={box.id} className="flex items-center mb-2 w-full max-w-md">
            <input
              value={box.name}
              onChange={(e) => handleRename(box.id, e.target.value)}
              className="flex-grow p-2 border rounded mr-2"
            />
            <button onClick={() => handleDelete(box.id)} className="p-2 bg-red-500 text-white rounded">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button onClick={handleAdd} className="mt-2 p-2 bg-green-500 text-white rounded flex items-center">
          <PlusCircle size={16} className="mr-1" /> Add New Bucket
        </button>
      </div>
    );
  }
  
export default SettingsPage;