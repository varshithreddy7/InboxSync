import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000/api",
    timeout: 10000,
})

export interface Email {
    id: string;
    messageId: string;
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
    date: string;
    folder: string;
    account: string;
    category?: string;
    indexed: boolean;
    notified: boolean;
    createdAt: string;
}

export interface Stats {
    category: string;
    count: number;
}

interface SuggestReplyPayload {
    emailId: string;
    subject: string;
    body: string;
    account: string;
}

interface SuggestReplyResponse {
    success: boolean;
    emailId: string;
    suggestedReply: string;
    confidence: number;
}

export const emailApi = {
    getEmails: (account = 'account1', folder = 'INBOX', limit = 100) => api.get<{ success: boolean; total: number; items: Email[] }>('/messages', {
        params: { account, folder, limit },
    }),
    getEmailById: (id: string) =>
        api.get<{ success: boolean; item: Email }>(`/messages/${id}`),

    searchEmails: (query: string, account = 'account1') =>
        api.post<{ success: boolean; total: number; results: Email[] }>('/search', {
            query,
            account,
        }),
    getCategories: () =>
        api.get<{ success: boolean; categories: string[]; descriptions: Record<string, string> }>(
            '/ai/categories'
        ),

    getStats: (account = 'account1') =>
        api.get<{ success: boolean; account: string; stats: Stats[] }>(`/ai/stats/${account}`),

    suggestReply: (data: SuggestReplyPayload) =>
        api.post<SuggestReplyResponse>('/rag/suggest-reply', data),
};

export default api;
