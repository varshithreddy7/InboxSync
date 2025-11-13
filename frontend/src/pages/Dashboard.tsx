import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import EmailList from '../components/EmailList';
import EmailDetail from '../components/EmailDetail';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';
import StatsPanel from '../components/StatsPanel';
import { emailApi, Email, Stats } from '../services/api';

export default function Dashboard() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [stats, setStats] = useState<Stats[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [account, setAccount] = useState('account1');
  const [folder, setFolder] = useState('INBOX');
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await emailApi.getCategories();
        setCategories(response.data.categories);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch emails when account/folder changes
  useEffect(() => {
    const fetchEmails = async () => {
      setLoadingEmails(true);
      try {
        const response = await emailApi.getEmails(account, folder, 100);
        setEmails(response.data.items);
      } catch (err) {
        console.error('Failed to fetch emails:', err);
        setEmails([]);
      } finally {
        setLoadingEmails(false);
      }
    };
    fetchEmails();
  }, [account, folder]);

  // Fetch stats when account changes
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const response = await emailApi.getStats(account);
        setStats(response.data.stats);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setStats([]);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [account]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoadingEmails(true);
    try {
      const response = await emailApi.searchEmails(searchQuery, account);
      setEmails(response.data.results);
      setSelectedEmail(null);
    } catch (err) {
      console.error('Search failed:', err);
      setEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Filter emails by category
  const filteredEmails = category
    ? emails.filter((e) => e.category === category)
    : emails;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center px-6">
        <div className="flex items-center">
          <Mail className="h-8 w-8 text-blue-500 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">ReachInbox</h1>
        </div>
        <div className="ml-auto w-96">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stats Sidebar */}
        <StatsPanel stats={stats} loading={loadingStats} />

        {/* Email List */}
        <div className="w-96 flex flex-col bg-white border-r">
          <FilterBar
            account={account}
            folder={folder}
            category={category}
            categories={categories}
            onAccountChange={setAccount}
            onFolderChange={setFolder}
            onCategoryChange={setCategory}
          />
          <div className="flex-1 overflow-hidden">
            <EmailList
              emails={filteredEmails}
              selectedId={selectedEmail?.id || null}
              onSelect={setSelectedEmail}
              loading={loadingEmails}
            />
          </div>
        </div>

        {/* Email Detail */}
        <div className="flex-1 bg-white overflow-hidden">
          <EmailDetail email={selectedEmail} />
        </div>
      </div>
    </div>
  );
}
