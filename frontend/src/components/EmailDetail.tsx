import { Mail, User, Calendar, Folder, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Email, emailApi } from '../services/api';

interface EmailDetailProps {
  email: Email | null;
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

export default function EmailDetail({ email }: EmailDetailProps) {
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  const [loadingReply, setLoadingReply] = useState(false);

  const handleGenerateReply = async () => {
    if (!email || loadingReply) {
      return;
    }

    setLoadingReply(true);

    try {
      const response = await emailApi.suggestReply({
        emailId: email.id,
        subject: email.subject,
        body: email.text,
        account: email.account,
      });

      setSuggestedReply(response.data.suggestedReply);
    } catch (error) {
      console.error('Failed to generate reply:', error);
      setSuggestedReply('Failed to generate reply. Please try again later.');
    } finally {
      setLoadingReply(false);
    }
  };

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Mail className="h-16 w-16 mb-4" />
        <p className="text-lg">Select an email to view</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex-1">
            {email.subject || '(No Subject)'}
          </h1>
          {email.category && (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(email.category)}`}>
              {email.category}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="font-medium mr-2">From:</span>
            <span>{email.from}</span>
          </div>
          
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            <span className="font-medium mr-2">To:</span>
            <span>{email.to}</span>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="font-medium mr-2">Date:</span>
            <span>{new Date(email.date).toLocaleString()}</span>
          </div>
          
          <div className="flex items-center">
            <Folder className="h-4 w-4 mr-2" />
            <span className="font-medium mr-2">Folder:</span>
            <span className="uppercase">{email.folder}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerateReply}
        disabled={loadingReply}
        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loadingReply ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate AI Reply
          </>
        )}
      </button>

      <div className="border-t pt-6">
        {email.html ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(email.html),
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-700">
            {email.text}
          </div>
        )}
      </div>

      {suggestedReply && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">AI Suggested Reply</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{suggestedReply}</p>
        </div>
      )}
    </div>
  );
}
