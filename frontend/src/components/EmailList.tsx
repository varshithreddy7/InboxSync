import { Mail, Loader2 } from 'lucide-react';
import { Email } from '../services/api';

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
  loading: boolean;
}

const getCategoryColor = (category?: string) => {
  switch (category) {
    case 'Interested': return 'bg-green-100 text-green-800';
    case 'Meeting Booked': return 'bg-blue-100 text-blue-800';
    case 'Not Interested': return 'bg-red-100 text-red-800';
    case 'Spam': return 'bg-gray-100 text-gray-800';
    case 'Out of Office': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export default function EmailList({ emails, selectedId, onSelect, loading }: EmailListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Mail className="h-12 w-12 mb-4" />
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onSelect(email)}
          className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
            selectedId === email.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate flex-1">
              {email.from.split('<')[0].trim()}
            </p>
            <span className="text-xs text-gray-500 ml-2">
              {new Date(email.date).toLocaleDateString()}
            </span>
          </div>
          
          <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">
            {email.subject || '(No Subject)'}
          </h3>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {email.text.substring(0, 100)}...
          </p>
          
          {email.category && (
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(email.category)}`}>
              {email.category}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
