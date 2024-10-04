import React from 'react';
import PrimaryButton from './PrimaryButton';
import Dropdown from './DropDownButton';
import { useState } from 'react';

const dummyData = [
    {
        title: "Read",
        start: "07:00",
        end: "09:33"
    },
    {
        title: "Coding",
        start: "09:33",
        end: "10:13"
    },
    {
        title: "Call",
        start: "10:13",
        end: "12:02"
    },
    {
        title: "Admin stuff",
        start: "12:02",
        end: "12:33"
    },
    {
        title: "Coding",
        start: "12:33",
        end: "16:37"
    },
    {
        title: "Read",
        start: "16:37",
        end: "18:04"
    }
]

interface TextItemProps {
  content: string;
  isInput: boolean;
  onChange?: (value: string) => void;
}

const TextItem: React.FC<TextItemProps> = ({ content, isInput, onChange }) => {
  return (
    <div className={`flex w-[50px] p-1 items-center justify-center rounded-md ${isInput ? 'bg-[#191919]' : ''}`}>
      {isInput ? (
        <input
          type="text"
          value={content}
          onChange={(e) => onChange && onChange(e.target.value)}
          className="w-full bg-transparent text-[#D9D9D9] font-inter text-sm font-normal leading-normal outline-none text-center"
        />
      ) : (
        <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal text-center">{content}</p>
      )}
    </div>
  );
};

interface SessionItemProps {
  title: string;
  start: string;
  end: string;
}

const SessionItem: React.FC<SessionItemProps> = ({ title, start, end }) => {
  return (
    <div className="flex justify-between items-center self-stretch">
      <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">{title}</p>
      <div className="flex items-center gap-2">
        <TextItem content={start} isInput={false} />
        <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">-</p>
        <TextItem content={end} isInput={false} />
      </div>
    </div>
  );
};

interface EditModalProps {
    onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = () => {
    const [fromTime, setFromTime] = useState("00:00");
    const [toTime, setToTime] = useState("23:59");

    const handleSave = () => {
        // Here you can use fromTime and toTime to update your DB
        console.log("Saving with time range:", fromTime, "-", toTime);
        // Add your DB update logic here
    };

    return (
        <div className="flex p-6 flex-col items-center rounded-2xl bg-black backdrop-blur-[40px] w-[420px] border border-[#5E5E5E] border-opacity-30">
            <div className="flex flex-col items-center gap-8 self-stretch p-4">
                <div className="flex flex-col items-start gap-8 self-stretch">
                    <div className="flex flex-col items-start gap-0 self-stretch">
                        <p className="self-stretch text-[#D9D9D9] leading-trim text-edge-cap font-inter text-3xl font-normal leading-normal"> 
                            Session #672
                        </p>
                        <p className="text-[rgba(255,255,255,0.50)] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal self-stretch">
                            Tuesday, 12 Jun 2024
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-4 self-stretch">
                        {dummyData.map((session, index) => (
                            <SessionItem key={index} title={session.title} start={session.start} end={session.end} />
                        ))}
                    </div>
                </div>

                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="2" viewBox="0 0 480 2" fill="none" className="w-full">
                    <path d="M1 1L479 1.00002" stroke="#5E5E5E" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <div className="flex flex-col items-start gap-8 self-stretch">
                    <div className="flex flex-col items-start gap-6 self-stretch">
                        <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-xl font-normal leading-normal self-stretch">Make an edit</p>
                        <div className="flex justify-between items-center self-stretch gap-4">
                            <Dropdown options={['All', 'Week', 'Month']} value="All" onChange={() => {}} textSize="text-sm" />
                            <div className="flex items-center gap-2">
                                <TextItem content={fromTime} isInput={true} onChange={setFromTime} />
                                <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">-</p>
                                <TextItem content={toTime} isInput={true} onChange={setToTime} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center items-center gap-8 self-stretch">
                        <PrimaryButton isActive={true} onClick={handleSave}>
                            Overwrite
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default EditModal;